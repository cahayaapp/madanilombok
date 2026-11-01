import {buildProposal,businessDate,dayNumber,key} from './protocol.js';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const rows=n=>Object.entries(n||{}).map(([id,v])=>({...v,id,date:v.date||businessDate(v.createdAt||Date.now())}));
const roles=p=>new Set([p.role,...(Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k]===true)),...Object.keys(p.roleFlags||{}).filter(k=>p.roleFlags[k]===true)]);
const supervisor=p=>['admin','super_admin','director','deputy_director'].some(r=>roles(p).has(r));
const normalize=o=>({...o,date:businessDate(o.createdAt),items:Object.values(o.items||{}),pinConfigured:o.type==='wallet-pin'?true:undefined});
export function createSparkClient({uid,read,write,sha256,storage,now=Date.now}){
 const get=p=>read(`madani_app/${p}`),f=p=>get(`finance/${p}`);
 async function context(){const [profile,settings]=await Promise.all([get(`users/${uid}`),get('settings')]);if(!profile||profile.active===false||profile.accessRevoked)throw Error('Akun tidak aktif.');if(settings?.finance?.sparkEnabled!==true)throw Error('Transaksi Firebase langsung belum diaktifkan.');return {profile,settings,yearId:settings.currentAcademicYearId};}
 async function readWallet(studentId){if(!studentId)return null;const [spending,pinConfigured]=await Promise.all([f(`wallets/${key(studentId)}/spending`),f(`wallets/${studentId}/pinConfigured`)]);return {studentId,spending:spending||0,pinConfigured:pinConfigured===true};}
 async function operations(field,value){return rows(await read('madani_app/finance/sparkOps',{orderBy:field,equalTo:value})).map(normalize);}
 async function archives(year,field,value){const [legacy,mart]=await Promise.all(['cashier_transactions','minimart/sales'].map(p=>read(`madani_app/finance/${p}/${year}`,{orderBy:field,equalTo:value})));return [...rows(legacy).map(s=>({...s,legacy:true,method:'WALLET',walletAmount:s.total,cashAmount:0,discount:0,costUnknown:Object.values(s.items||{}).some(i=>i.cost===undefined),items:Object.values(s.items||{}).map(i=>({...i,cost:i.cost||0}))})),...rows(mart).map(s=>({...s,legacy:true,items:Object.values(s.items||{})}))];}
 async function state({unitId,studentId=''}){
  key(unitId);const {profile,yearId}=await context();const [units,products,students,ops,old,shifts,activeId,wallet]=await Promise.all([f('cashierUnits'),f(`products/${unitId}`),get('students'),operations('unitId',unitId),archives(yearId,'unitId',unitId),read('madani_app/finance/sparkShifts',{orderBy:'unitId',equalTo:unitId}),f(`sparkActiveShifts/${uid}/${unitId}`),readWallet(studentId)]);
  const legacyRefunds=rows(await read(`madani_app/finance/minimart/refunds/${yearId}`,{orderBy:'unitId',equalTo:unitId}));
  legacyRefunds.push(...old.filter(s=>s.status==='void'&&!s.refundId&&s.voidedAt).map(s=>({id:`legacy-${s.id}`,saleId:s.id,unitId:s.unitId,createdAt:s.voidedAt,cashRefund:0,walletRefund:s.total,returnedCost:0,costUnknown:true})));
  const refunds=[...legacyRefunds,...ops.filter(o=>o.type==='refund').map(o=>({...o,walletRefund:o.walletAmount,cashRefund:o.cashAmount,returnedCost:o.items.reduce((n,i)=>n+i.cost*i.qty,0)}))];const refunded=new Set(refunds.map(r=>r.saleId));
  const scope=profile.roleScopes?.minimart||profile.roleScopes?.kasir||profile,allowed=scope.cashierUnits||[scope.financeUnit];
  return {uid,yearId,businessDate:businessDate(now()),supervisor:supervisor(profile),units:rows(units).filter(u=>u.active!==false&&(supervisor(profile)||allowed.includes(u.id))),products:rows(products),students:rows(students).filter(s=>!s.mergedInto&&s.active!==false&&(!s.status||s.status==='active')&&(!units?.[unitId]?.gender||s.gender===units[unitId].gender)),wallet,sales:[...old,...ops.filter(o=>o.type==='checkout').map(o=>refunded.has(o.id)?{...o,status:'void'}:o)],refunds,movements:ops.filter(o=>['stock-in','stock-adjust'].includes(o.type)),cashMovements:ops.filter(o=>o.type==='cash-move'),shifts:rows(shifts),shift:shifts?.[activeId]||null};
 }
 async function treasury({studentId}={}){
  const {yearId}=await context();const [students,bills,payments,ops]=await Promise.all([get('students'),f(`bills/${yearId}`),f(`payments/${yearId}`),operations('unitId','TREASURY')]);const active=rows(students).filter(s=>!s.mergedInto&&s.active!==false&&(!s.status||s.status==='active'));const wallets={};
  if(studentId)wallets[studentId]=await readWallet(studentId);
  return {yearId,students:active,wallets,bills:bills||{},payments:rows(payments),topups:ops.filter(o=>o.type==='topup')};
 }
 async function parent({studentId}){
  key(studentId);const {profile,yearId}=await context(),ids=profile.roleScopes?.wali_santri?.studentIds||profile.studentIds||[profile.studentId];if(!ids.includes(studentId))throw Error('Akses anak ditolak.');
  const [student,wallet,savings,bills,payments,ops,old,mutations]=await Promise.all([get(`students/${studentId}`),readWallet(studentId),f(`wallets/${studentId}/savings`),f(`bills/${yearId}/${studentId}`),read(`madani_app/finance/payments/${yearId}`,{orderBy:'studentId',equalTo:studentId}),operations('studentId',studentId),archives(yearId,'studentId',studentId),f(`wallet_transactions/${yearId}/${studentId}`)]);
  const refunds=new Set(ops.filter(o=>o.type==='refund').map(o=>o.saleId));return {student:{...student,id:studentId},wallet:{...wallet,savings:savings||0},bills:rows(bills),payments:rows(payments),mutations:rows(mutations),sales:[...old,...ops.filter(o=>o.type==='checkout').map(o=>refunds.has(o.id)?{...o,status:'void'}:o)]};
 }
 async function execute(request){
  key(request.id);const clean={...request};delete clean.pin;const fingerprint=await sha256(JSON.stringify(canonical(clean))),uncertainKey=`madani-spark-uncertain:${uid}:${request.id}`;
  const priorUnknown=!!storage.getItem(uncertainKey);
  const existing=await f(`sparkOps/${request.id}`);if(existing){if(existing.actorUid!==uid||existing.fingerprint!==fingerprint)throw Error('ID operasi sudah digunakan untuk permintaan lain.');storage.removeItem(uncertainKey);return normalize(existing);}
  try{
   const {yearId}=await context(),type=request.type.replace('treasury:','');
   if(type==='checkout'&&request.method!=='CASH'){
    if(!/^\d{6}$/.test(request.pin||''))throw Error('Masukkan PIN santri 6 digit.');const hash=await sha256(request.pin),old=await f(`sparkPinProofs/${uid}`);
    if(old?.operationId!==request.id||old.hash!==hash||old.attemptAt<now()-120000){const prior=old?.operationId?await f(`sparkOps/${key(old.operationId)}`):null;const reset=!old||old.windowStartedAt<=now()-300000||(prior?.type==='checkout'&&prior.actorUid===uid);if(!reset&&(old.count>=5||old.attemptAt>now()-2000))throw Error('Batas percobaan PIN. Tunggu sebelum mencoba lagi.');await write('madani_app/finance',{[`sparkPinProofs/${uid}`]:{operationId:request.id,hash,attemptAt:{'.sv':'timestamp'},windowStartedAt:reset?{'.sv':'timestamp'}:old.windowStartedAt,count:reset?1:old.count+1}});}
   }
   for(let attempt=0;attempt<3;attempt++){
    const original=type==='refund'?await f(`sparkOps/${key(request.saleId)}`):null,studentId=request.studentId||original?.studentId||'';
    const [products,wallet,student,activeId,daily,bill]=await Promise.all([request.unitId?f(`products/${key(request.unitId)}`):{},studentId?readWallet(studentId):null,studentId?get(`students/${key(studentId)}`):null,request.unitId?f(`sparkActiveShifts/${uid}/${request.unitId}`):null,studentId?f(`sparkDaily/${studentId}/${dayNumber(now())}`):null,type==='bill-pay'?f(`bills/${yearId}/${studentId}/${key(request.billId)}`):null]);
    const shift=activeId?await f(`sparkShifts/${activeId}`):null;
    const proposal=buildProposal(request,{uid,yearId,now:now(),fingerprint,products:products||{},wallet:wallet?.spending||0,student,daily:daily?.spent||0,shift,bill,original,pinHash:type==='wallet-pin'?await sha256(request.pin||''):null});
    if(type==='checkout'&&request.expectedTotal!==undefined&&proposal.op.total!==request.expectedTotal)throw Error('Harga berubah. Periksa ulang keranjang.');
    storage.setItem(uncertainKey,fingerprint);
    try{await write('madani_app/finance',proposal.patch);const committed=await f(`sparkOps/${request.id}`);if(!committed)throw Error('Status belum dapat dipastikan. Periksa transaksi yang sama.');storage.removeItem(uncertainKey);return normalize(committed);}
    catch(error){if(error.code!=='PERMISSION_DENIED')throw error;const committed=await f(`sparkOps/${request.id}`);if(committed){if(committed.fingerprint!==fingerprint||committed.actorUid!==uid)throw Error('ID operasi bentrok.');storage.removeItem(uncertainKey);return normalize(committed);}if(!priorUnknown)storage.removeItem(uncertainKey);if(attempt===2)throw Object.assign(Error('Transaksi ditolak Firebase. Periksa PIN, saldo, stok, shift, dan izin petugas.'),{definitive:!priorUnknown});}
   }
  }catch(error){if(!priorUnknown&&!storage.getItem(uncertainKey)&&!error.code)error.definitive=true;throw error;}
 }
 return {state,treasury,parent,execute};
}
