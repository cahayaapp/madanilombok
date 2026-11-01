import {createHash} from 'node:crypto';
import {applyMinimartOperation, authorize, businessDate} from './engine.mjs';

export function assertEmulatorEnvironment(env) {
  const local = value => /^(127\.0\.0\.1|localhost):\d{2,5}$/.test(value || '');
  if (!local(env.FIREBASE_DATABASE_EMULATOR_HOST) || !local(env.FIREBASE_AUTH_EMULATOR_HOST) || !/^demo-[a-z0-9-]+$/.test(env.GCLOUD_PROJECT || '')) {
    throw Error('Minimart belum diaktifkan: hanya emulator lokal dengan project demo yang diizinkan.');
  }
}
const validKey = key => typeof key === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(key) && !['__proto__','constructor','prototype'].includes(key);
const contextFor = (root, uid, now) => ({uid, profile:root?.users?.[uid], yearId:root?.settings?.currentAcademicYearId,
 dailySpendingLimit:root?.settings?.finance?.dailySpendingLimit ?? 50000, students:root?.students || {}, now, requireShift:true});

/** LOCAL ONLY. Root transaction includes profile/scope/settings/student changes
 * in the same concurrency boundary as money. Never connect this to production.
 */
export function createEmulatorMinimartService({auth, db, env = process.env, clock = Date.now}) {
  assertEmulatorEnvironment(env);
  async function identity(idToken) {
    assertEmulatorEnvironment(env);
    if (typeof idToken !== 'string' || !idToken) throw Error('Login diperlukan.');
    const user = await auth.verifyIdToken(idToken, true);
    if (!validKey(user.uid)) throw Error('Identitas tidak valid.');
    return user.uid;
  }
  const execute = async ({idToken, operation}) => {
    const uid = await identity(idToken);
    if (!operation || !validKey(operation.id) || !validKey(operation.unitId)) throw Error('Permintaan tidak valid.');
    if (operation.studentId && !validKey(operation.studentId)) throw Error('ID santri tidak valid.');
    const target = db.ref('madani_app'), listener = () => {};
    target.on('value', listener);
    try {
      await target.once('value');
      let rejection, denied = false;
      const committed = await target.transaction(root => {
        rejection = null; denied = false;
        try {
          const ctx = contextFor(root, uid, clock());
          authorize(ctx, operation.unitId);
          const limitKey = createHash('sha256').update(JSON.stringify([uid,operation.studentId || 'cash'])).digest('hex');
          const attempt = root.minimartSecurity?.[limitKey];
          const replay = root.finance?.minimart?.operations?.[operation.id];
          if (!replay && operation.type === 'checkout' && operation.method !== 'CASH' && attempt?.blockedUntil > ctx.now) throw Error('PIN diblokir sementara. Tunggu 5 menit.');
          try {
            const out = applyMinimartOperation(root.finance, operation, ctx);
            return {...root, finance:out.finance};
          } catch (error) {
            if (error.message === 'PIN tidak sesuai.') {
              denied = true; rejection = error.message;
              const count = attempt?.windowUntil > ctx.now ? attempt.count + 1 : 1;
              return {...root, minimartSecurity:{...root.minimartSecurity, [limitKey]:{
                count, windowUntil:attempt?.windowUntil > ctx.now ? attempt.windowUntil : ctx.now + 300000,
                blockedUntil:count >= 5 ? ctx.now + 300000 : 0, lastAttemptAt:ctx.now, actorUid:uid
              }}};
            }
            throw error;
          }
        } catch (error) { rejection = error.message; return undefined; }
      }, undefined, false);
      if (!committed.committed || denied) throw Error(rejection || 'Transaksi belum tersimpan. Ulangi dengan ID operasi yang sama.');
      return committed.snapshot.val().finance.minimart.operations[operation.id].result;
    } finally { target.off('value', listener); }
  };
  execute.state = async ({idToken, unitId, studentId = ''}) => {
    const uid = await identity(idToken);
    if (!validKey(unitId) || (studentId && !validKey(studentId))) throw Error('ID tidak valid.');
    const root = (await db.ref('madani_app').once('value')).val();
    const ctx = contextFor(root, uid, clock()), supervisor = authorize(ctx, unitId);
    const finance = root.finance || {}, mart = finance.minimart || {}, unit = finance.cashierUnits?.[unitId];
    if (!unit || unit.active === false) throw Error('Unit tidak tersedia.');
    const rows = (node = {}) => Object.entries(node).map(([id, value]) => ({...value, id}));
    const students = rows(root.students).filter(s => s.active !== false && (!s.status || s.status === 'active') && (!unit.gender || s.gender === unit.gender)).map(s => ({id:s.id, name:s.name, nis:s.nis || '', gender:s.gender || ''}));
    if (studentId && !students.some(s => s.id === studentId)) throw Error('Santri di luar unit.');
    const scope = ctx.profile.roleScopes?.minimart || ctx.profile;
    const allowed = scope.cashierUnits?.length ? scope.cashierUnits : [scope.financeUnit];
    return {yearId:ctx.yearId, businessDate:businessDate(ctx.now), supervisor, uid,
      units:rows(finance.cashierUnits).filter(u => u.active !== false && (supervisor || allowed.includes(u.id))),
      products:rows(finance.products?.[unitId]), students,
      wallet:studentId ? {studentId, spending:finance.wallets?.[studentId]?.spending || 0, pinConfigured:!!finance.wallets?.[studentId]?.pinHash} : null,
      sales:rows(mart.sales?.[ctx.yearId]).filter(s => s.unitId === unitId),
      refunds:rows(mart.refunds?.[ctx.yearId]).filter(s => s.unitId === unitId),
      cashMovements:rows(mart.cashMovements).filter(s => s.unitId === unitId && (supervisor || s.actorUid === uid)),
      movements:rows(mart.stock_movements).filter(s => s.unitId === unitId),
      shifts:rows(mart.shifts).filter(s => s.unitId === unitId && (supervisor || s.cashierUid === uid)),
      shift:mart.shifts?.[mart.activeShifts?.[uid]?.[unitId]] || null};
  };
  execute.parent = async ({idToken, studentId}) => {
    const uid = await identity(idToken);
    if (!validKey(studentId)) throw Error('Pilih santri.');
    const root = (await db.ref('madani_app').once('value')).val(), p = root.users?.[uid];
    const roles = new Set([p?.role,...(Array.isArray(p?.roles)?p.roles:Object.keys(p?.roles||{}).filter(r=>p.roles[r]===true)),...Object.keys(p?.roleFlags||{}).filter(r=>p.roleFlags[r]===true)]);
    const ids = p?.roleScopes?.wali_santri?.studentIds || p?.studentIds || (p?.studentId?[p.studentId]:[]);
    if (!p || p.active === false || p.accessRevoked || !roles.has('wali_santri') || !ids.includes(studentId)) throw Error('Akses keuangan anak ditolak.');
    const year = root.settings.currentAcademicYearId, f = root.finance || {}, student = root.students?.[studentId];
    if (!student) throw Error('Santri tidak ditemukan.');
    const values = node => Object.entries(node || {}).map(([id,v])=>({...v,id}));
    return {student:{id:studentId,name:student.name},wallet:{spending:f.wallets?.[studentId]?.spending||0,savings:f.wallets?.[studentId]?.savings||0},
      bills:values(f.bills?.[year]?.[studentId]),payments:values(f.payments?.[year]).filter(r=>r.studentId===studentId),
      sales:[...values(f.cashier_transactions?.[year]),...values(f.minimart?.sales?.[year])].filter(r=>r.studentId===studentId).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))};
  };
  return execute;
}
