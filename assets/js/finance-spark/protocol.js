// Untrusted client proposal builder. Firebase Rules independently check every
// amount/link and commit all paths atomically. Never treat this as authorization.
export const MAX_ITEMS=10;
export const money=n=>{if(!Number.isSafeInteger(n)||n<0||n>1e12)throw Error('Nominal/jumlah tidak valid.');return n;};
export const key=s=>{if(typeof s!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(s)||['__proto__','constructor','prototype'].includes(s))throw Error('ID tidak valid.');return s;};
export const businessDate=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
export const dayNumber=ms=>Math.floor((ms+28800000)/86400000);
export function buildProposal(request,context){
 const {uid,yearId,now,products={},wallet=0,daily=0,shift=null,student=null,bill=null,original=null}=context;
 key(request.id);key(uid);key(yearId);
 const type=request.type.replace('treasury:','');
 const op={id:request.id,type,actorUid:uid,academicYearId:yearId,unitId:request.unitId||'TREASURY',studentId:request.studentId||'',studentName:student?.name||'',studentNis:student?.nis||'',createdAt:{'.sv':'timestamp'},fingerprint:context.fingerprint};
 const patch={};let delta=0;
 if(type==='checkout'){
  const grouped=new Map();for(const item of request.items||[])grouped.set(key(item.productId),money((grouped.get(item.productId)||0)+money(item.qty)));
  if(!grouped.size||grouped.size>MAX_ITEMS)throw Error(`Keranjang maksimal ${MAX_ITEMS} jenis produk per transaksi.`);
  let subtotal=0;op.items=[...grouped].map(([productId,qty],slot)=>{const p=products[productId];if(!p||!qty||p.active===false||p.stock<qty||(p.expiryDate&&p.expiryDate<businessDate(now)))throw Error('Stok tidak cukup atau produk tidak tersedia.');subtotal=money(subtotal+money(p.price)*qty);return {productId,name:p.name,qty,price:p.price,cost:p.cost||0,subtotal:p.price*qty,runningSubtotal:subtotal};});
  const discount=money(request.discount||0),total=money(subtotal-discount);if(!total)throw Error('Total harus lebih dari nol.');
  const walletAmount=request.method==='WALLET'?total:request.method==='CASH'?0:money(request.walletAmount),cashAmount=money(total-walletAmount),cashReceived=money(request.cashReceived||0);if(cashReceived<cashAmount)throw Error('Uang tunai kurang.');
  Object.assign(op,{itemCount:op.items.length,subtotal,discount,total,method:request.method,walletAmount,cashAmount,cashReceived,change:cashReceived-cashAmount,status:'paid',cashierUid:uid,reference:`MM-${op.id}`,shiftId:shift?.id||'',day:dayNumber(now)});
  delta=-walletAmount;
  op.items.forEach((item,slot)=>{const base=`products/${op.unitId}/${item.productId}`;patch[`${base}/stock`]=money(products[item.productId].stock-item.qty);patch[`${base}/lastOperationId`]=op.id;patch[`${base}/lastOperationSlot`]=String(slot);});
  if(walletAmount){patch[`sparkDaily/${key(op.studentId)}/${op.day}`]={spent:money(daily+walletAmount),lastOperationId:op.id};}
 }else if(type==='topup'){
  op.unitId='TREASURY';Object.assign(op,{amount:money(request.amount),method:request.method,note:request.note,reference:`TU-${op.id}`});if(!op.amount)throw Error('Nominal harus lebih dari nol.');delta=op.amount;
 }else if(type==='wallet-pin'){
  op.unitId='TREASURY';patch[`sparkPinChanges/${op.id}`]={hash:context.pinHash,actorUid:uid};patch[`wallets/${key(op.studentId)}/pinHash`]=context.pinHash;patch[`wallets/${op.studentId}/pinOperationId`]=op.id;patch[`wallets/${op.studentId}/pinConfigured`]=true;
 }else if(type==='product'){
  const productId=key(request.productId),p=request.product,old=products[productId]||{};
  Object.assign(op,{productId,product:{name:p.name,sku:p.sku||'',barcode:p.barcode||'',category:p.category||'',price:money(p.price),cost:money(p.cost||0),unit:p.unit||'pcs',minStock:money(p.minStock||0),active:p.active!==false,expiryDate:p.expiryDate||'',expiryDay:p.expiryDate?dayNumber(Date.parse(p.expiryDate)):0,stock:old.stock||0,version:(old.version||0)+1,lastOperationId:op.id}});
  if(request.expectedVersion!==undefined&&request.expectedVersion!==(old.version||0))throw Error('Produk berubah. Muat ulang.');patch[`products/${op.unitId}/${productId}`]=op.product;
 }else if(type==='stock-in'||type==='stock-adjust'){
  const p=products[key(request.productId)];if(!p)throw Error('Produk tidak ditemukan.');if(request.expectedStock!==undefined&&request.expectedStock!==p.stock)throw Error('Stok berubah. Muat ulang.');
  Object.assign(op,{productId:request.productId,reason:request.reason||request.note||'Barang masuk',before:p.stock,after:type==='stock-in'?money(p.stock+money(request.qty)):money(request.countedStock??request.newStock),qty:type==='stock-in'?money(request.qty):0,cost:type==='stock-in'?money(request.cost):p.cost||0,kind:request.kind||'',supplier:request.supplier||'',invoice:request.invoice||'',receivedDate:request.receivedDate||''});
  const base=`products/${op.unitId}/${op.productId}`;patch[`${base}/stock`]=op.after;patch[`${base}/lastOperationId`]=op.id;if(type==='stock-in')patch[`${base}/cost`]=op.cost;
 }else if(type==='shift-open'){
  Object.assign(op,{openingCash:money(request.openingCash),shiftId:op.id});patch[`sparkShifts/${op.id}`]={id:op.id,unitId:op.unitId,cashierUid:uid,status:'open',openingCash:op.openingCash,salesCash:0,refundCash:0,cashIn:0,cashOut:0,openedAt:{'.sv':'timestamp'},lastOperationId:op.id};patch[`sparkActiveShifts/${uid}/${op.unitId}`]=op.id;
 }else if(type==='cash-move'){
  Object.assign(op,{shiftId:shift?.id||'',amount:money(request.amount),direction:request.direction,reason:request.reason});
 }else if(type==='shift-close'){
  if(!shift)throw Error('Shift tidak terbuka.');const expected=money(shift.openingCash+shift.salesCash-shift.refundCash+shift.cashIn-shift.cashOut);Object.assign(op,{shiftId:shift.id,physicalCash:money(request.physicalCash),expectedCash:expected,difference:request.physicalCash-expected,reason:request.reason||''});patch[`sparkActiveShifts/${uid}/${op.unitId}`]=null;
 }else if(type==='bill-create'){
  op.unitId='TREASURY';Object.assign(op,{period:request.period,amount:money(request.amount),billId:`SPP_${request.period}`,reference:`BILL-${op.id}`});patch[`sparkBillPeriods/${yearId}/${key(op.studentId)}/${key(op.period)}`]=op.id;patch[`bills/${yearId}/${key(op.studentId)}/${key(op.billId)}`]={studentId:op.studentId,typeId:'SPP',period:op.period,amount:op.amount,paidAmount:0,status:'unpaid',lastOperationId:op.id,createdAt:{'.sv':'timestamp'}};
 }else if(type==='bill-pay'){
  if(!bill)throw Error('Tagihan tidak ditemukan.');op.unitId='TREASURY';Object.assign(op,{billId:key(request.billId),amount:money(request.amount),method:request.method,reference:`PAY-${op.id}`});const paid=money((bill.paidAmount||0)+op.amount);if(!op.amount||paid>bill.amount)throw Error('Pembayaran melebihi sisa tagihan.');const base=`bills/${yearId}/${key(op.studentId)}/${op.billId}`;patch[`${base}/paidAmount`]=paid;patch[`${base}/status`]=paid===bill.amount?'paid':'partial';patch[`${base}/lastOperationId`]=op.id;patch[`payments/${yearId}/${op.id}`]={studentId:op.studentId,billId:op.billId,amount:op.amount,method:op.method,reference:op.reference,actorUid:uid,operationId:op.id,createdAt:{'.sv':'timestamp'}};
 }else if(type==='refund'){
  if(!original||original.type!=='checkout'||original.status!=='paid')throw Error('Retur Firebase langsung hanya tersedia untuk transaksi protokol baru.');
  if(original.items.length>MAX_ITEMS)throw Error('Jumlah jenis barang melampaui batas.');
  Object.assign(op,{saleId:original.id,studentId:original.studentId,studentName:original.studentName,studentNis:original.studentNis,reason:request.reason,method:original.method,walletAmount:original.walletAmount,cashAmount:original.cashAmount,total:original.total,shiftId:shift?.id||'',itemCount:original.items.length});
  op.items=original.items.map((item,slot)=>{const qty=money((request.returns||[]).find(r=>r.productId===item.productId)?.qty||0);if(qty>item.qty)throw Error('Retur melebihi pembelian.');if(qty){const base=`products/${op.unitId}/${item.productId}`;patch[`${base}/stock`]=money(products[item.productId].stock+qty);patch[`${base}/lastOperationId`]=op.id;patch[`${base}/lastOperationSlot`]=String(slot);}return {productId:item.productId,qty,cost:item.cost};});
  patch[`sparkRefunds/${original.id}`]=op.id;delta=op.walletAmount;
 }else throw Error('Operasi belum didukung pada Firebase langsung.');
 if(delta){const id=key(op.studentId);patch[`wallets/${id}/spending`]=money(wallet+delta);patch[`wallets/${id}/lastOperationId`]=op.id;patch[`wallet_transactions/${yearId}/${id}/${op.id}`]={operationId:op.id,actorUid:uid,amount:delta,direction:delta>0?'in':'out',walletType:'spending',source:type,createdAt:{'.sv':'timestamp'},note:op.note||op.reason||`Belanja ${op.id}`};}
 if(['checkout','cash-move','shift-close'].includes(type)||type==='refund'&&op.cashAmount){
  if(!shift||shift.status!=='open')throw Error('Buka shift terlebih dahulu.');const s={...shift,lastOperationId:op.id};
  if(type==='checkout')s.salesCash=money(s.salesCash+op.cashAmount);
  if(type==='refund')s.refundCash=money(s.refundCash+op.cashAmount);
  if(type==='cash-move'){const field=op.direction==='in'?'cashIn':'cashOut';s[field]=money(s[field]+op.amount);}
  if(s.openingCash+s.salesCash-s.refundCash+s.cashIn-s.cashOut<0)throw Error('Kas shift tidak cukup.');
  if(type==='shift-close')Object.assign(s,{status:'closed',physicalCash:op.physicalCash,expectedCash:op.expectedCash,difference:op.difference,closeNote:op.reason,closedAt:{'.sv':'timestamp'}});
  patch[`sparkShifts/${shift.id}`]=s;
 }
 patch[`sparkOps/${op.id}`]=op;return {op,patch};
}
