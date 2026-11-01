import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {applyMinimartOperation as apply, businessDate} from '../server/minimart/engine.mjs';
const pin = '483729'; // Synthetic test PIN, not an account credential.
const now = Date.parse('2026-11-01T04:00:00Z');
const ctx = (overrides = {}) => ({uid:'cashier1', yearId:'2026-2027', now, profile:{active:true, role:'minimart', roleScopes:{minimart:{financeUnit:'PUTRA'}}}, students:{s1:{name:'Fixture', gender:'L', status:'active'}}, dailySpendingLimit:50000, ...overrides});
const manager = () => ctx({uid:'boss', profile:{roleFlags:{director:true}}});
const fixture = () => ({wallets:{s1:{spending:100000, savings:200000, pinHash:createHash('sha256').update(pin).digest('hex')}}, cashierUnits:{PUTRA:{gender:'L'}, PUTRI:{gender:'P'}}, products:{PUTRA:{a:{name:'A', sku:'A', stock:10, price:10000, cost:6000}, b:{name:'B', sku:'B', stock:10, price:10000, cost:5000}, c:{name:'C', sku:'C', stock:10, price:5000, cost:3000}}}, bills:{keep:{amount:123}}, payments:{keep:{amount:456}}});
const sale = (overrides = {}) => ({id:'sale1', type:'checkout', unitId:'PUTRA', studentId:'s1', items:[{productId:'a',qty:1},{productId:'b',qty:1},{productId:'c',qty:1}], method:'WALLET', pin, ...overrides});

test('A: 25000 debits existing spending only; all stock, mutation and audit move together', () => {
 const input = fixture(), before = structuredClone(input), {finance:f,result:r} = apply(input,sale(),ctx());
 assert.deepEqual(input,before); assert.equal(f.wallets.s1.spending,75000); assert.equal(f.wallets.s1.savings,200000);
 assert.deepEqual(['a','b','c'].map(id=>f.products.PUTRA[id].stock),[9,9,9]);
 assert.equal(r.total,25000); assert.equal(f.wallet_transactions['2026-2027'].s1.MM_sale1.amount,-25000);
 assert.equal(f.minimart.audit.sale1.actorUid,'cashier1'); assert.deepEqual(f.bills,input.bills); assert.deepEqual(f.payments,input.payments);
 assert.ok(!JSON.stringify(f.minimart).includes(pin));
});
test('B: cash 17000 paid with 20000 gives 3000 change without a wallet write', () => {
 const f=fixture(); f.products.PUTRA.a.price=17000;
 const {finance,result}=apply(f,sale({method:'CASH',studentId:'',items:[{productId:'a',qty:1}],cashReceived:20000}),ctx());
 assert.equal(result.change,3000); assert.equal(result.cashAmount,17000); assert.deepEqual(finance.wallets,f.wallets); assert.equal(finance.wallet_transactions,undefined);
});
test('C: insufficient stock leaves the entire input untouched', () => {
 const f=fixture(); f.products.PUTRA.a.stock=2; const before=structuredClone(f);
 assert.throws(()=>apply(f,sale({items:[{productId:'a',qty:3}]}),ctx()),/Stok/); assert.deepEqual(f,before);
});
test('D: insufficient wallet rejected; mixed 10000 wallet plus 15000 cash succeeds', () => {
 const f=fixture(); f.wallets.s1.spending=10000;
 assert.throws(()=>apply(f,sale(),ctx()),/Saldo belanja/);
 const {finance,result}=apply(f,sale({method:'MIXED',walletAmount:10000,cashReceived:20000}),ctx());
 assert.equal(finance.wallets.s1.spending,0); assert.equal(result.cashAmount,15000); assert.equal(result.change,5000);
});
test('F: only supervisor refunds; only explicitly returned stock restored; refund is idempotent', () => {
 const paid=apply(fixture(),sale(),ctx()).finance;
 const req={id:'refund1',type:'refund',unitId:'PUTRA',saleId:'sale1',reason:'Salah barang',returns:[{productId:'a',qty:1}]};
 assert.throws(()=>apply(paid,req,ctx()),/supervisor/);
 const out=apply(paid,req,manager());
 assert.equal(out.finance.wallets.s1.spending,100000); assert.equal(out.finance.products.PUTRA.a.stock,10); assert.equal(out.finance.products.PUTRA.b.stock,9);
 assert.equal(out.finance.minimart.sales['2026-2027'].sale1.status,'void');
 assert.equal(out.finance.wallet_transactions['2026-2027'].s1.MM_refund1.amount,25000);
 assert.deepEqual(apply(out.finance,req,manager()).finance,out.finance);
 assert.throws(()=>apply(out.finance,{...req,id:'refund2'},manager()),/direfund/);
});
test('cash refund does not touch wallets; duplicate return lines rejected', () => {
 const paid=apply(fixture(),sale({method:'CASH',cashReceived:25000}),ctx()).finance;
 const req={id:'refund1',type:'refund',unitId:'PUTRA',saleId:'sale1',reason:'Retur',returns:[]};
 const out=apply(paid,req,manager()); assert.deepEqual(out.finance.wallets,paid.wallets); assert.equal(out.result.cashRefund,25000);
 assert.throws(()=>apply(paid,{...req,returns:[{productId:'a',qty:1},{productId:'a',qty:1}]},manager()),/retur/);
});
test('double-click and lost response replay one original receipt; changed payload/actor denied', () => {
 const first=apply(fixture(),sale(),ctx());
 const retry=apply(first.finance,sale({pin:undefined}),ctx());
 assert.equal(retry.replay,true); assert.deepEqual(retry.result,first.result); assert.deepEqual(retry.finance,first.finance);
 assert.throws(()=>apply(first.finance,sale({items:[{productId:'a',qty:1}]}),ctx()),/ID operasi/);
 assert.throws(()=>apply(first.finance,sale(),ctx({uid:'cashier2'})),/ID operasi/);
});
test('price/cost/total from browser ignored; duplicate cart lines aggregated', () => {
 const out=apply(fixture(),sale({items:[{productId:'a',qty:1,price:1},{productId:'a',qty:1}],total:2}),ctx());
 assert.equal(out.result.total,20000); assert.equal(out.result.items.length,1); assert.equal(out.finance.products.PUTRA.a.stock,8);
});
for (const [label, context] of [
 ['revoked',ctx({profile:{role:'minimart',accessRevoked:true}})],
 ['inactive',ctx({profile:{role:'minimart',active:false}})],
 ['parent',ctx({profile:{role:'wali_santri'}})],
 ['legacy cashier',ctx({profile:{role:'kasir',financeUnit:'PUTRA'}})],
 ['missing unit scope',ctx({profile:{roles:['minimart']}})],
 ['wrong unit',ctx({profile:{role:'minimart',financeUnit:'PUTRI'}})]
]) test(`authorization rejects ${label}`,()=>assert.throws(()=>apply(fixture(),sale(),context)));
for (const [label,patch] of [
 ['fractional quantity',{items:[{productId:'a',qty:1.1}]}],['negative quantity',{items:[{productId:'a',qty:-1}]}],
 ['overflow',{items:[{productId:'a',qty:Number.MAX_SAFE_INTEGER+1}]}],['missing PIN',{pin:''}],['wrong PIN',{pin:'111111'}],
 ['unknown student',{studentId:'unknown'}],['cross-unit student',{studentId:'s2'}],['path injection',{id:'../../wallets'}],
 ['prototype injection',{id:'__proto__'}],['insufficient cash',{method:'CASH',cashReceived:1}],['unapproved discount',{discount:1}],
 ['mixed without cash',{method:'MIXED',walletAmount:25000}],['mixed exceeds total',{method:'MIXED',walletAmount:30000}],
 ['unknown payment method',{method:'TRANSFER'}]
]) test(`validation rejects ${label}`,()=>assert.throws(()=>apply(fixture(),sale(patch),ctx({students:{s1:{gender:'L'},s2:{gender:'P'}}}))));
test('daily limit includes legacy transactions across years and current minimart debits', () => {
 const f=fixture(); f.cashier_transactions={old:{x:{studentId:'s1',date:businessDate(now),total:30000,status:'paid'}}};
 assert.throws(()=>apply(f,sale(),ctx()),/batas belanja/);
 const paid=apply(fixture(),sale(),ctx()).finance;
 assert.throws(()=>apply(paid,sale({id:'s2'}),ctx({dailySpendingLimit:40000})),/batas belanja/);
});
test('expired/inactive products blocked; backend clock controls business date', () => {
 const f=fixture(); f.products.PUTRA.a.expiryDate='2026-10-31'; assert.throws(()=>apply(f,sale(),ctx()),/kedaluwarsa/);
 f.products.PUTRA.a.expiryDate=''; f.products.PUTRA.a.active=false; assert.throws(()=>apply(f,sale(),ctx()),/tersedia/);
 assert.equal(businessDate(Date.parse('2026-11-01T16:01:00Z')),'2026-11-02');
});
test('product edit preserves stock; stock intake and stale opname are audited and guarded', () => {
 const req={id:'p1',type:'product',unitId:'PUTRA',productId:'a',expectedVersion:0,product:{name:'Updated',sku:'A',price:11000,cost:6000,category:'Makanan ringan',unit:'pcs',minStock:3,active:true,stock:999}};
 let f=apply(fixture(),req,ctx()).finance; assert.equal(f.products.PUTRA.a.stock,10);
 assert.throws(()=>apply(f,{...req,id:'p2'},ctx()),/berubah/);
 f=apply(f,{id:'in1',type:'stock-in',unitId:'PUTRA',productId:'a',qty:5,cost:6500,reason:'Pembelian',supplier:'Supplier',invoice:'NOTA-1'},ctx()).finance;
 assert.equal(f.products.PUTRA.a.stock,15); assert.equal(f.minimart.stock_movements.in1.totalCost,32500);
 const adjust={id:'adj1',type:'stock-adjust',unitId:'PUTRA',productId:'a',expectedStock:15,countedStock:13,kind:'damaged',reason:'Kemasan rusak'};
 assert.throws(()=>apply(f,adjust,ctx()),/supervisor/); assert.throws(()=>apply(f,{...adjust,expectedStock:10},manager()),/berubah/);
 f=apply(f,adjust,manager()).finance; assert.equal(f.products.PUTRA.a.stock,13); assert.equal(f.minimart.audit.adj1.actorUid,'boss');
});

// Optimistic CAS harness: both calls first read the same version, loser retries.
// This tests deterministic retry semantics, NOT Firebase SDK/rules enforcement.
function casStore(initial) {
 let state=initial, version=0, retries=0;
 return {get:()=>state,retries:()=>retries,async commit(req,context){
  for(let attempt=0;attempt<10;attempt++){
   const expected=version, out=apply(state,req,context); await Promise.resolve();
   if(expected!==version){retries++;continue;}
   state=out.finance;version++;return out.result;
  }
  throw Error('retry limit');
 }};
}
test('E simulation: competing sales cannot overspend one wallet', async () => {
 const f=fixture(); f.wallets.s1.spending=30000; const store=casStore(f);
 const results=await Promise.allSettled([store.commit(sale(),ctx()),store.commit(sale({id:'sale2'}),ctx({uid:'cashier2'}))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(store.get().wallets.s1.spending,5000); assert.ok(store.retries()>0);
 assert.equal(Object.keys(store.get().minimart.sales['2026-2027']).length,1);
});
test('E simulation: last stock sold only once; concurrent same-ID request commits once', async () => {
 const f=fixture(); f.products.PUTRA.a.stock=1; const req=sale({method:'CASH',cashReceived:10000,items:[{productId:'a',qty:1}]});
 const store=casStore(f); const results=await Promise.allSettled([store.commit(req,ctx()),store.commit({...req,id:'sale2'},ctx())]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(store.get().products.PUTRA.a.stock,0);
 const duplicate=casStore(f); const receipts=await Promise.all([duplicate.commit(req,ctx()),duplicate.commit(req,ctx())]);
 assert.deepEqual(receipts[0],receipts[1]); assert.equal(Object.keys(duplicate.get().minimart.audit).length,1);
});
test('committed receipt retries across academic-year rollover without a second debit',()=>{
 const paid=apply(fixture(),sale(),ctx());const retry=apply(paid.finance,sale({pin:''}),ctx({yearId:'2027-2028'}));assert.equal(retry.replay,true);assert.equal(retry.result.academicYearId,'2026-2027');assert.equal(retry.finance.wallets.s1.spending,75000);
});
test('shift operations serialize cash, reject double-open and require explanations for discrepancy',()=>{
 const context=ctx({requireShift:true});let f=fixture();
 assert.throws(()=>apply(f,sale(),context),/Buka shift/);
 f=apply(f,{id:'open',type:'shift-open',unitId:'PUTRA',openingCash:20000},context).finance;
 assert.throws(()=>apply(f,{id:'open2',type:'shift-open',unitId:'PUTRA',openingCash:0},context),/masih terbuka/);
 f=apply(f,sale({method:'CASH',cashReceived:30000}),context).finance;
 assert.equal(f.minimart.shifts.open.salesCash,25000);assert.equal(f.minimart.operations.open.result.salesCash,0);
 assert.throws(()=>apply(f,{id:'close',type:'shift-close',unitId:'PUTRA',physicalCash:44000},context),/Alasan/);
 const closed=apply(f,{id:'close',type:'shift-close',unitId:'PUTRA',physicalCash:44000,reason:'Selisih hitung'},context);assert.equal(closed.result.difference,-1000);assert.equal(closed.result.expectedCash,45000);
});
