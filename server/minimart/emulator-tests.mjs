import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {createEmulatorMinimartService,assertEmulatorEnvironment} from './firebase-service.mjs';
import {fixtureRoot,fixturePin,provisionLocalFixtures} from './fixtures.mjs';
assertEmulatorEnvironment(process.env);
const app=initializeApp({projectId:process.env.GCLOUD_PROJECT,databaseURL:`https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`});
const auth=getAuth(app),db=getDatabase(app),service=createEmulatorMinimartService({auth,db});
let uids,tokens={};
const call=(key,operation)=>service({idToken:tokens[key],operation:{unitId:'PUTRA',...operation}});
const sale=(id='sale1',patch={})=>({id,type:'checkout',studentId:'MM-S1',items:[{productId:'a',qty:1},{productId:'b',qty:1},{productId:'c',qty:1}],method:'WALLET',pin:fixturePin,...patch});
const read=async path=>(await db.ref(`madani_app/${path}`).once('value')).val();
async function open(key='cashier',openingCash=100000){return call(key,{id:`shift-${key}`,type:'shift-open',openingCash});}
before(async()=>{
 uids=await provisionLocalFixtures(auth,db);
 for(const [key,uid]of Object.entries(uids)){
  const custom=await auth.createCustomToken(uid);
  const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});
  tokens[key]=(await response.json()).idToken;assert.ok(tokens[key]);
 }
});
beforeEach(async()=>{await db.ref('madani_app').set(fixtureRoot(uids));});
after(async()=>{await db.ref('madani_app').set(fixtureRoot(uids));await deleteApp(app);});
test('A emulator: debit 25000, stock and ledger commit together',async()=>{
 await open();const receipt=await call('cashier',sale());assert.equal(receipt.total,25000);assert.equal(await read('finance/wallets/MM-S1/spending'),75000);assert.equal(await read('finance/wallets/MM-S1/savings'),200000);
 assert.equal(await read('finance/products/PUTRA/a/stock'),9);assert.equal(await read('finance/wallet_transactions/2026-2027/MM-S1/MM_sale1/amount'),-25000);
 assert.equal(await read('finance/minimart/audit/sale1/actorUid'),uids.cashier);
});
test('B emulator: cash and shift reconcile without changing wallet',async()=>{
 await open('cashier',50000);await db.ref('madani_app/finance/products/PUTRA/a/price').set(17000);
 const r=await call('cashier',sale('cash',{items:[{productId:'a',qty:1}],method:'CASH',studentId:'',cashReceived:20000}));assert.equal(r.change,3000);assert.equal(await read('finance/wallets/MM-S1/spending'),100000);
 const close=await call('cashier',{id:'close',type:'shift-close',physicalCash:67000});assert.equal(close.difference,0);assert.equal(close.expectedCash,67000);
 await assert.rejects(call('cashier',sale('after-close')),/Buka shift/);
});
test('C/D emulator: insufficient stock and wallet leave no partial transaction',async()=>{
 await open();await db.ref('madani_app/finance/products/PUTRA/a/stock').set(2);
 await assert.rejects(call('cashier',sale('stock',{items:[{productId:'a',qty:3}]})),/Stok/);
 await db.ref('madani_app/finance/wallets/MM-S1/spending').set(10000);
 await assert.rejects(call('cashier',sale('balance')),/Saldo/);assert.equal(await read('finance/products/PUTRA/a/stock'),2);assert.equal(await read('finance/minimart/sales'),null);
 const r=await call('cashier',sale('mixed',{method:'MIXED',walletAmount:10000,cashReceived:20000}));assert.equal(r.change,5000);assert.equal(await read('finance/wallets/MM-S1/spending'),0);
});
test('E emulator: concurrent cashiers cannot overspend one wallet',async()=>{
 await open();await open('second');await db.ref('madani_app/finance/wallets/MM-S1/spending').set(30000);
 const r=await Promise.allSettled([call('cashier',sale('one')),call('second',sale('two'))]);assert.equal(r.filter(r=>r.status==='fulfilled').length,1);assert.equal(await read('finance/wallets/MM-S1/spending'),5000);
 assert.equal(Object.keys(await read('finance/minimart/sales/2026-2027')).length,1);
});
test('E emulator: last stock and duplicate-click are serialized',async()=>{
 await open();await open('second');await db.ref('madani_app/finance/products/PUTRA/a/stock').set(1);
 const req=sale('last',{method:'CASH',cashReceived:10000,items:[{productId:'a',qty:1}]});
 const r=await Promise.allSettled([call('cashier',req),call('second',{...req,id:'last2'})]);assert.equal(r.filter(r=>r.status==='fulfilled').length,1);assert.equal(await read('finance/products/PUTRA/a/stock'),0);
 const winner=r[0].status==='fulfilled'?'cashier':'second',payload=winner==='cashier'?req:{...req,id:'last2'};
 const receipts=await Promise.all([call(winner,payload),call(winner,payload)]);assert.deepEqual(receipts[0],receipts[1]);assert.equal(Object.keys(await read('finance/minimart/sales/2026-2027')).length,1);
});
test('F emulator: concurrent supervisor refunds return money once and only declared stock',async()=>{
 await open();await call('cashier',sale());const refund={id:'refund',type:'refund',saleId:'sale1',reason:'Retur uji',returns:[{productId:'a',qty:1}]};
 await assert.rejects(call('cashier',refund),/supervisor/);
 const r=await Promise.allSettled([call('supervisor',refund),call('supervisor',{...refund,id:'refund2'})]);assert.equal(r.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(await read('finance/wallets/MM-S1/spending'),100000);assert.equal(await read('finance/products/PUTRA/a/stock'),10);assert.equal(await read('finance/products/PUTRA/b/stock'),9);
 assert.equal(await read('finance/minimart/sales/2026-2027/sale1/status'),'void');
});
test('emulator: forged prices, actor, profile and timestamp ignored; saved receipt survives lost response',async()=>{
 await open();const req=sale('replay',{total:1,uid:'boss',profile:{role:'director'},now:1,items:[{productId:'a',qty:1,price:1}]});await call('cashier',req);
 const retry=await call('cashier',{...req,pin:''});assert.equal(retry.total,10000);assert.equal(retry.cashierUid,uids.cashier);assert.ok(retry.createdAt>1);assert.equal(await read('finance/wallets/MM-S1/spending'),90000);
});
test('emulator rules: all browser writes to money/stocks/audit denied, including ancestor writes; PIN unreadable',async()=>{
 for(const who of ['cashier','supervisor','parent'])for(const path of ['finance/wallets/MM-S1/spending','finance/products/PUTRA/a/stock','finance/minimart/audit/fake','finance','']){
  const url=`http://127.0.0.1:9000/madani_app/${path}.json?ns=demo-madani-minimart-default-rtdb&auth=${encodeURIComponent(tokens[who])}`;
  const response=await fetch(url,{method:'PUT',body:'1'});assert.equal(response.status,401,`${who}/${path}`);
 }
 const r=await fetch(`http://127.0.0.1:9000/madani_app/finance/wallets/MM-S1/pinHash.json?ns=demo-madani-minimart-default-rtdb&auth=${encodeURIComponent(tokens.cashier)}`);assert.equal(r.status,401);
});
test('emulator: scoped read omits PIN and savings; wrong unit, revoked and parent denied',async()=>{
 let state=await service.state({idToken:tokens.cashier,unitId:'PUTRA',studentId:'MM-S1'});assert.equal(state.wallet.spending,100000);assert.equal(state.wallet.pinHash,undefined);assert.equal(state.wallet.savings,undefined);assert.equal(state.students.length,1);
 await assert.rejects(service.state({idToken:tokens.cashier,unitId:'PUTRI'}),/penugasan/);await assert.rejects(call('parent',{id:'p',type:'shift-open',openingCash:0}),/ditolak/);
 await db.ref(`madani_app/users/${uids.cashier}/accessRevoked`).set(true);await assert.rejects(open(),/tidak aktif/);
});
test('emulator: five incorrect PINs block retries without moving money',async()=>{
 await open();for(let i=0;i<5;i++)await assert.rejects(call('cashier',sale(`bad${i}`,{pin:'111111'})),/PIN tidak sesuai/);
 await assert.rejects(call('cashier',sale('correct')),/diblokir/);assert.equal(await read('finance/wallets/MM-S1/spending'),100000);assert.equal(await read('finance/products/PUTRA/a/stock'),10);
});
test('emulator: product CRUD, intake and stale opname; shift non-sale cash and cash refund',async()=>{
 await open();await open('supervisor');const product={name:'Sabun',sku:'SAB-1',barcode:'12345',price:17000,cost:10000,unit:'pcs',category:'Mandi',minStock:2,active:true};
 await call('cashier',{id:'product',type:'product',productId:'soap',expectedVersion:0,product});
 await call('cashier',{id:'stock',type:'stock-in',productId:'soap',qty:3,cost:10000,reason:'Pembelian',supplier:'Supplier Uji',invoice:'UJI-1'});
 const r=await call('cashier',sale('cash',{method:'CASH',cashReceived:20000,items:[{productId:'soap',qty:1}]}));assert.equal(r.total,17000);
 await assert.rejects(call('supervisor',{id:'stale',type:'stock-adjust',productId:'soap',expectedStock:3,countedStock:1,kind:'damaged',reason:'Rusak'}),/berubah/);
 await call('supervisor',{id:'cash-refund',type:'refund',saleId:'cash',reason:'Retur',returns:[{productId:'soap',qty:1}]});
 await call('cashier',{id:'out',type:'cash-move',direction:'out',amount:5000,reason:'Belanja kantong'});
 const close=await call('cashier',{id:'close',type:'shift-close',physicalCash:112000});assert.equal(close.difference,0);assert.equal(await read('finance/minimart/shifts/shift-supervisor/refundCash'),17000);
});
test('emulator: parent sees own wallet and minimart receipt, cannot see another child or PIN',async()=>{
 await open();await call('cashier',sale());const data=await service.parent({idToken:tokens.parent,studentId:'MM-S1'});assert.equal(data.wallet.spending,75000);assert.equal(data.sales.length,1);assert.equal(data.sales[0].total,25000);assert.equal(data.wallet.pinHash,undefined);
 await assert.rejects(service.parent({idToken:tokens.parent,studentId:'MM-S2'}),/ditolak/);
 await assert.rejects(service.parent({idToken:tokens.cashier,studentId:'MM-S1'}),/ditolak/);
});
