/** Trusted-backend domain kernel. Never import into the browser.
 * The caller must obtain context from verified Auth/server reads and commit the
 * returned finance subtree using a database transaction, never read-then-set.
 */
import {createHash, timingSafeEqual} from 'node:crypto';

const supervisors = ['admin', 'super_admin', 'director', 'deputy_director'];
const fail = message => { throw new Error(message); };
const key = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value) || ['__proto__','constructor','prototype'].includes(value)) fail('ID tidak valid.');
  return value;
};
const integer = (value, min = 0) => {
  if (!Number.isSafeInteger(value) || value < min) fail('Nilai harus integer aman dan tidak negatif.');
  return value;
};
const note = value => {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000) fail('Alasan wajib diisi (maksimal 1000 karakter).');
  return value.trim();
};
const rolesOf = p => new Set([p.role, ...(Array.isArray(p.roles) ? p.roles : Object.keys(p.roles || {}).filter(k => p.roles[k] === true)), ...Object.keys(p.roleFlags || {}).filter(k => p.roleFlags[k] === true)]);
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
const bucket = (obj, ...path) => path.reduce((node, part) => node[key(part)] ||= {}, obj);
export const businessDate = now => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Makassar', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(now));

export function authorize(ctx, unitId, sensitive = false) {
  key(ctx.uid); key(ctx.yearId); key(unitId); integer(ctx.now, 1);
  const p = ctx.profile;
  if (!p || p.active === false || p.accessRevoked === true) fail('Akun tidak aktif.');
  const roles = rolesOf(p), supervisor = supervisors.some(r => roles.has(r));
  if (sensitive && !supervisor) fail('Tindakan memerlukan supervisor.');
  if (!supervisor) {
    if (!roles.has('minimart') && !roles.has('kasir')) fail('Akses minimart ditolak.');
    const scope = (roles.has('minimart') ? p.roleScopes?.minimart : p.roleScopes?.kasir) || p;
    const units = scope.cashierUnits || (scope.financeUnit ? [scope.financeUnit] : []);
    if (!units.includes(unitId)) fail('Unit di luar penugasan kasir.');
  }
  return supervisor;
}

function mutation(finance, ctx, studentId, amount, saleId, operationId) {
  const wallet = finance.wallets?.[studentId];
  if (!wallet) fail('Dompet santri tidak ditemukan.');
  const nextBalance = integer(wallet.spending || 0) + amount;
  if (nextBalance < 0) fail('Saldo belanja tidak mencukupi.');
  wallet.spending = integer(nextBalance);
  bucket(finance, 'wallet_transactions', ctx.yearId, studentId)[`MM_${operationId}`] = {
    amount, direction:amount < 0 ? 'out' : 'in', walletType:'spending', source:'minimart',
    minimartTransactionId:saleId, actorUid:ctx.uid, createdAt:ctx.now, date:businessDate(ctx.now),
    note:amount < 0 ? `Belanja minimart ${saleId}` : `Refund minimart ${saleId}`
  };
}

/** One operation -> one immutable finance snapshot, including audit/idempotency. */
export function applyMinimartOperation(current, request, ctx) {
  if (!request || typeof request !== 'object') fail('Permintaan tidak valid.');
  const {id, unitId, type} = request;
  key(id); const supervisor = authorize(ctx, unitId, ['refund','stock-adjust'].includes(type));
  const clean = structuredClone(request); delete clean.pin;
  const fingerprint = hash(JSON.stringify(canonical({request:clean, uid:ctx.uid})));
  const previous = current?.minimart?.operations?.[id];
  if (previous) {
    if (previous.fingerprint !== fingerprint) fail('ID operasi telah digunakan untuk permintaan lain.');
    return {finance:current, result:previous.result, replay:true};
  }
  const finance = structuredClone(current || {}), mart = finance.minimart ||= {};
  const unit = finance.cashierUnits?.[unitId];
  if (!unit || unit.active === false) fail('Unit kasir tidak aktif.');
  const products = bucket(finance, 'products', unitId);
  const sales = bucket(mart, 'sales', ctx.yearId);
  let result;
  const shifts = bucket(mart, 'shifts');
  const active = bucket(mart, 'activeShifts', ctx.uid);
  const openShift = () => {
    const shift = shifts[active[unitId]];
    if (!shift || shift.status !== 'open') fail('Buka shift kasir terlebih dahulu.');
    return shift;
  };
  if (type === 'shift-open') {
    if (shifts[active[unitId]]?.status === 'open') fail('Shift masih terbuka.');
    result = {id, unitId, cashierUid:ctx.uid, status:'open', openingCash:integer(request.openingCash), salesCash:0, refundCash:0, cashIn:0, cashOut:0, openedAt:ctx.now};
    shifts[id] = result; active[unitId] = id;
  } else if (type === 'cash-move') {
    const shift = openShift(), amount = integer(request.amount, 1), reason = note(request.reason);
    if (!['in','out'].includes(request.direction)) fail('Arah kas tidak valid.');
    const field = request.direction === 'in' ? 'cashIn' : 'cashOut';
    shift[field] = integer(shift[field] + amount);
    if (shift.openingCash + shift.salesCash - shift.refundCash + shift.cashIn - shift.cashOut < 0) fail('Kas shift tidak mencukupi.');
    result = {shiftId:shift.id, amount, direction:request.direction, reason};
    bucket(mart, 'cashMovements')[id] = {...result, unitId, actorUid:ctx.uid, createdAt:ctx.now};
  } else if (type === 'shift-close') {
    const shift = openShift(), physicalCash = integer(request.physicalCash);
    const expectedCash = integer(shift.openingCash + shift.salesCash - shift.refundCash + shift.cashIn - shift.cashOut);
    const difference = physicalCash - expectedCash;
    if (difference) note(request.reason);
    Object.assign(shift, {status:'closed', closedAt:ctx.now, physicalCash, expectedCash, difference, closeNote:request.reason || ''});
    delete active[unitId]; result = {...shift};
  } else if (type === 'product') {
    const d = request.product || {}, productId = key(request.productId);
    const old = products[productId];
    if ((old?.version || 0) !== integer(request.expectedVersion)) fail('Produk telah berubah. Muat ulang.');
    const name = note(d.name), sku = note(d.sku), barcode = String(d.barcode || '').trim();
    if (barcode.length > 128) fail('Barcode terlalu panjang.');
    if (d.expiryDate && (!/^\d{4}-\d{2}-\d{2}$/.test(d.expiryDate) || !Number.isFinite(Date.parse(d.expiryDate)) || new Date(d.expiryDate).toISOString().slice(0,10) !== d.expiryDate)) fail('Tanggal kedaluwarsa tidak valid.');
    if (Object.entries(products).some(([pid,p]) => pid !== productId && (p.sku === sku || (barcode && p.barcode === barcode)))) fail('SKU/barcode sudah digunakan.');
    if (typeof d.active !== 'boolean') fail('Status produk wajib boolean.');
    products[productId] = {...old, name, sku, barcode, category:note(d.category), unit:note(d.unit),
      price:integer(d.price), cost:integer(d.cost), minStock:integer(d.minStock), active:d.active,
      expiryDate:d.expiryDate || '', stock:integer(old?.stock || 0), version:(old?.version || 0) + 1,
      updatedAt:ctx.now, updatedBy:ctx.uid};
    result = {productId, version:products[productId].version};
  } else if (type === 'stock-in' || type === 'stock-adjust') {
    const productId = key(request.productId), p = products[productId];
    if (!p) fail('Produk tidak ditemukan.');
    const before = integer(p.stock || 0), reason = note(request.reason);
    if (type === 'stock-in') {
      const qty = integer(request.qty, 1), cost = integer(request.cost);
      p.stock = integer(before + qty); p.cost = cost;
      result = {productId, before, after:p.stock, qty, cost, totalCost:integer(qty * cost), supplier:note(request.supplier), invoice:note(request.invoice)};
    } else {
      if (request.expectedStock !== before) fail('Stok telah berubah. Ulangi opname.');
      p.stock = integer(request.countedStock);
      result = {productId, before, after:p.stock, kind:request.kind};
      if (!['opname','damaged','lost','expired'].includes(request.kind)) fail('Jenis koreksi tidak valid.');
      if (request.kind !== 'opname' && p.stock >= before) fail('Pengeluaran stok harus mengurangi stok.');
    }
    p.version = (p.version || 0) + 1;
    bucket(mart, 'stock_movements')[id] = {...result, unitId, type, reason, actorUid:ctx.uid, createdAt:ctx.now};
  } else if (type === 'checkout') {
    if (!Array.isArray(request.items) || !request.items.length || request.items.length > 100) fail('Keranjang tidak valid.');
    const quantities = new Map();
    for (const item of request.items) {
      key(item.productId); integer(item.qty, 1);
      quantities.set(item.productId, integer((quantities.get(item.productId) || 0) + item.qty));
    }
    const items = [...quantities].map(([productId, qty]) => {
      const p = products[productId];
      if (!p || p.active === false) fail('Produk tidak tersedia.');
      if (integer(p.stock || 0) < qty) fail(`Stok ${p.name} tidak cukup; tersedia ${p.stock || 0}.`);
      if (p.expiryDate && p.expiryDate < businessDate(ctx.now)) fail('Produk kedaluwarsa.');
      return {productId, name:p.name, qty, price:integer(p.price), cost:integer(p.cost || 0), subtotal:integer(p.price * qty)};
    });
    const subtotal = integer(items.reduce((n,i) => n + i.subtotal, 0));
    const discount = integer(request.discount || 0);
    if (discount && !supervisor) fail('Diskon memerlukan supervisor.');
    const total = integer(subtotal - discount, 1);
    if (!['CASH','WALLET','MIXED'].includes(request.method)) fail('Metode pembayaran tidak valid.');
    const walletAmount = request.method === 'WALLET' ? total : request.method === 'CASH' ? 0 : integer(request.walletAmount, 1);
    const cashAmount = integer(total - walletAmount);
    if (request.method === 'MIXED' && !cashAmount) fail('Pembayaran kombinasi harus memiliki porsi tunai.');
    const cashReceived = integer(request.cashReceived || 0);
    if (cashReceived < cashAmount || (!cashAmount && cashReceived)) fail('Nominal tunai tidak sesuai.');
    const studentId = request.studentId || '';
    if (studentId) {
      key(studentId);
      const student = ctx.students?.[studentId];
      if (!student || student.mergedInto || student.active === false || (student.status && student.status !== 'active') || (unit.gender && student.gender !== unit.gender)) fail('Santri tidak tersedia dalam unit ini.');
    }
    if (walletAmount) {
      if (!studentId) fail('Pilih santri terlebih dahulu.');
      const wallet = finance.wallets?.[studentId];
      if (!wallet || !/^[a-f0-9]{64}$/.test(wallet.pinHash || '') || !/^\d{6}$/.test(request.pin || '') || !timingSafeEqual(Buffer.from(hash(request.pin)), Buffer.from(wallet.pinHash))) fail('PIN tidak sesuai.');
      const date = businessDate(ctx.now);
      // Include legacy cashier sales, across years, in the existing daily limit.
      const allSales = [...Object.values(finance.cashier_transactions || {}), ...Object.values(mart.sales || {})].flatMap(year => Object.values(year || {}));
      const spent = allSales.filter(t => t.studentId === studentId && t.date === date && t.status !== 'void').reduce((n,t) => n + Number(t.walletAmount ?? t.total ?? 0), 0);
      if (integer(spent + walletAmount) > integer(ctx.dailySpendingLimit ?? 50000)) fail('Melebihi batas belanja harian.');
      mutation(finance, ctx, studentId, -walletAmount, id, id);
    }
    for (const item of items) { products[item.productId].stock -= item.qty; products[item.productId].version = (products[item.productId].version || 0) + 1; }
    result = {id, reference:`MM-${id}`, unitId, studentId, studentName:ctx.students?.[studentId]?.name || '', studentNis:ctx.students?.[studentId]?.nis || '', items, subtotal, discount, total, method:request.method,
      walletAmount, cashAmount, cashReceived, change:cashReceived - cashAmount, status:'paid',
      cashierUid:ctx.uid, createdAt:ctx.now, date:businessDate(ctx.now), academicYearId:ctx.yearId};
    if (ctx.requireShift) {
      const shift = openShift(); shift.salesCash = integer(shift.salesCash + cashAmount); result.shiftId = shift.id;
    }
    sales[id] = result;
  } else if (type === 'refund') {
    const saleId = key(request.saleId), legacy=request.legacy===true;
    const source=legacy?finance.cashier_transactions?.[ctx.yearId]:sales;
    const originalSale=source?.[saleId];
    const sale=originalSale && (legacy?{...originalSale,walletAmount:originalSale.total,cashAmount:0,items:originalSale.items.map(i=>({...i,cost:i.cost||0}))}:originalSale);
    if (!sale || sale.status !== 'paid' || sale.unitId !== unitId) fail('Transaksi tidak dapat direfund.');
    const reason = note(request.reason), returns = request.returns;
    if (!Array.isArray(returns)) fail('Rincian barang kembali wajib diisi, gunakan daftar kosong bila tidak ada.');
    const seen = new Set();
    for (const item of returns) {
      key(item.productId); integer(item.qty, 1);
      const original = sale.items.find(i => i.productId === item.productId);
      if (seen.has(item.productId) || !original || item.qty > original.qty || !products[item.productId]) fail('Jumlah retur tidak valid.');
      seen.add(item.productId);
      const p = products[item.productId]; p.stock = integer(integer(p.stock) + item.qty); p.version = (p.version || 0) + 1;
    }
    if (sale.walletAmount) mutation(finance, ctx, sale.studentId, sale.walletAmount, saleId, id);
    source[saleId] = {...sale, status:'void', voidReason:reason, voidedBy:ctx.uid, voidedAt:ctx.now, refundId:id};
    result = {saleId, costUnknown:legacy && originalSale.items.some(i=>i.cost===undefined), returnedCost:returns.reduce((sum, item) => sum + sale.items.find(i => i.productId === item.productId).cost * item.qty, 0), walletRefund:sale.walletAmount, cashRefund:sale.cashAmount, returns:structuredClone(returns), reason};
    if (ctx.requireShift && sale.cashAmount) {
      const shift = openShift();
      if (shift.openingCash + shift.salesCash - shift.refundCash + shift.cashIn - shift.cashOut < sale.cashAmount) fail('Kas shift tidak cukup untuk refund tunai.');
      shift.refundCash = integer(shift.refundCash + sale.cashAmount); result.shiftId = shift.id;
    }
    bucket(mart, 'refunds', ctx.yearId)[id] = {...result, unitId, actorUid:ctx.uid, createdAt:ctx.now};
  } else fail('Operasi belum didukung.');
  bucket(mart, 'audit')[id] = {type, unitId, actorUid:ctx.uid, createdAt:ctx.now, result};
  bucket(mart, 'operations')[id] = {fingerprint, result:structuredClone(result)};
  mart.audit[id].result = structuredClone(result);
  return {finance, result, replay:false};
}
