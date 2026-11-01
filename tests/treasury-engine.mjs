import test from 'node:test';import assert from 'node:assert/strict';
import {applyTreasuryOperation as apply} from '../server/minimart/treasury-engine.mjs';
import {applyMinimartOperation} from '../server/minimart/engine.mjs';
const ctx={uid:'b',yearId:'y',now:1793505600000,profile:{role:'bendahara'},students:{s:{name:'Santri',gender:'L'}}};
const topup={id:'t1',type:'topup',studentId:'s',amount:100000,method:'CASH',note:'Setoran wali'};
test('topup is atomic with mutation/audit, replay never doubles, savings preserved',()=>{
 const f={wallets:{s:{savings:20000}}},out=apply(f,topup,ctx);assert.equal(out.finance.wallets.s.spending,100000);assert.equal(out.finance.wallets.s.savings,20000);assert.equal(out.finance.wallet_transactions.y.s.TU_t1.amount,100000);assert.equal(out.finance.treasury.audit.t1.actorUid,'b');assert.equal(f.wallets.s.spending,undefined);assert.equal(apply(out.finance,topup,ctx).finance.wallets.s.spending,100000);assert.throws(()=>apply(out.finance,{...topup,amount:200000},ctx),/ID operasi/);
});
test('cashier cannot top up or change PIN, integer/identity guards apply',()=>{
 for(const role of ['kasir','minimart','wali_santri'])assert.throws(()=>apply({},topup,{...ctx,profile:{role}}),/ditolak/);
 for(const amount of [-1,0,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>apply({},{...topup,amount},ctx));
 assert.throws(()=>apply({},topup,{...ctx,students:{s:{mergedInto:'other'}}}),/aktif/);
});
test('SPP duplicate period and overpayment rejected; paid amount/payment commit together',()=>{
 let f=apply({},{id:'b1',type:'bill-create',studentId:'s',period:'2026-11',amount:500000},ctx).finance;
 assert.throws(()=>apply(f,{id:'b2',type:'bill-create',studentId:'s',period:'2026-11',amount:500000},ctx),/sudah ada/);
 const pay={id:'p1',type:'bill-pay',studentId:'s',billId:'SPP_2026-11',amount:300000,method:'CASH'};f=apply(f,pay,ctx).finance;assert.equal(f.bills.y.s['SPP_2026-11'].paidAmount,300000);assert.equal(f.payments.y.p1.amount,300000);assert.equal(f.wallets,undefined);assert.throws(()=>apply(f,{...pay,id:'p2'},ctx),/melebihi/);
});
test('bendahara topup is spendable at the single cashier; receipt keeps master identity',()=>{
 let f=apply({cashierUnits:{PUTRA:{gender:'L'}},products:{PUTRA:{p:{name:'Buku',price:25000,stock:2}}}},topup,ctx).finance;
 f=apply(f,{id:'pin1',type:'wallet-pin',studentId:'s',pin:'483729'},ctx).finance;assert.ok(!JSON.stringify(f.treasury).includes('483729'));
 const out=applyMinimartOperation(f,{id:'sale',type:'checkout',unitId:'PUTRA',studentId:'s',method:'WALLET',pin:'483729',items:[{productId:'p',qty:1}]},{...ctx,uid:'k',profile:{role:'kasir',financeUnit:'PUTRA'}});
 assert.equal(out.finance.wallets.s.spending,75000);assert.equal(out.result.studentName,'Santri');assert.equal(out.result.items[0].name,'Buku');
});
