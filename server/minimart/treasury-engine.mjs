import {createHash} from 'node:crypto';
import {businessDate} from './engine.mjs';
const fail=m=>{throw Error(m);};
const key=v=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail('ID tidak valid.');return v;};
const money=v=>{if(!Number.isSafeInteger(v)||v<0)fail('Nominal harus integer rupiah tidak negatif.');return v;};
export function authorizeTreasury(ctx){
 const p=ctx.profile;if(!p||p.active===false||p.accessRevoked)fail('Akun tidak aktif.');
 const roles=new Set([p.role,...(Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k]===true)),...Object.keys(p.roleFlags||{}).filter(k=>p.roleFlags[k]===true)]);
 if(!['bendahara','admin','super_admin','director','deputy_director'].some(r=>roles.has(r)))fail('Akses bendahara ditolak.');
 key(ctx.uid);key(ctx.yearId);
}
const bucket=(o,...keys)=>keys.reduce((n,k)=>n[key(k)]||={},o);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export function applyTreasuryOperation(current,op,ctx){
 authorizeTreasury(ctx);key(op.id);key(op.studentId);
 const student=ctx.students?.[op.studentId];if(!student||student.mergedInto||student.active===false||student.status==='inactive')fail('Santri tidak aktif.');
 const clean={...op};delete clean.pin;
 const fingerprint=createHash('sha256').update(JSON.stringify(canonical({op:clean,uid:ctx.uid}))).digest('hex');
 const prev=current?.treasury?.operations?.[op.id];if(prev){if(prev.fingerprint!==fingerprint)fail('ID operasi telah digunakan untuk permintaan lain.');return {finance:current,result:prev.result,replay:true};}
 const finance=structuredClone(current||{}),base={id:op.id,studentId:op.studentId,studentName:student.name||op.studentId,actorUid:ctx.uid,createdAt:ctx.now,date:businessDate(ctx.now),academicYearId:ctx.yearId};let result;
 if(op.type==='topup'){
  const amount=money(op.amount);if(!amount)fail('Nominal harus lebih dari nol.');if(!['CASH','TRANSFER'].includes(op.method))fail('Metode setoran tidak valid.');
  if(typeof op.note!=='string'||!op.note.trim()||op.note.length>1000)fail('Keterangan setoran wajib diisi.');
  const w=bucket(finance,'wallets',op.studentId);w.spending=money(money(w.spending||0)+amount);
  result={...base,reference:`TU-${op.id}`,amount,method:op.method,note:op.note.trim(),balanceAfter:w.spending};
  bucket(finance,'wallet_transactions',ctx.yearId,op.studentId)[`TU_${op.id}`]={...result,walletType:'spending',direction:'in',source:'treasury_topup'};
  bucket(finance,'treasury','topups',ctx.yearId)[op.id]=result;
 }else if(op.type==='bill-create'){
  const amount=money(op.amount);if(!amount||!/^\d{4}-\d{2}$/.test(op.period||''))fail('Nominal dan periode SPP wajib valid.');
  const id=`SPP_${op.period}`,bills=bucket(finance,'bills',ctx.yearId,op.studentId);if(bills[id]||Object.values(bills).some(b=>b.period===op.period&&(b.typeId==='SPP'||/spp/i.test(finance.billingTypes?.[b.typeId]?.name||''))))fail('Tagihan SPP periode ini sudah ada.');
  result={...base,id,typeId:'SPP',period:op.period,amount,paidAmount:0,status:'unpaid',dueDate:op.dueDate||'',reference:`BILL-${op.id}`};bills[id]=result;
 }else if(op.type==='bill-pay'){
  const bill=bucket(finance,'bills',ctx.yearId,op.studentId)[key(op.billId)],amount=money(op.amount);
  if(!bill||!amount||amount>money(bill.amount)-money(bill.paidAmount||0))fail('Pembayaran melebihi sisa tagihan atau tagihan tidak tersedia.');
  if(!['CASH','TRANSFER'].includes(op.method))fail('Metode pembayaran tidak valid.');
  bill.paidAmount=money((bill.paidAmount||0)+amount);bill.status=bill.paidAmount===bill.amount?'paid':'partial';bill.updatedAt=ctx.now;
  result={...base,billId:op.billId,amount,method:op.method,reference:`PAY-${op.id}`};bucket(finance,'payments',ctx.yearId)[op.id]=result;
 }else if(op.type==='wallet-pin'){
  if(!/^\d{6}$/.test(op.pin||''))fail('PIN harus 6 digit.');
  const w=bucket(finance,'wallets',op.studentId);w.pinHash=createHash('sha256').update(op.pin).digest('hex');w.pinUpdatedAt=ctx.now;result={...base,pinConfigured:true};
 }else fail('Operasi bendahara tidak dikenal.');
 bucket(finance,'treasury','operations')[op.id]={fingerprint,result};bucket(finance,'treasury','audit')[op.id]={...base,type:op.type,result};return {finance,result,replay:false};
}
