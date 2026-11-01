import {createSparkClient} from '../../assets/js/finance-spark/client.js';
import test,{before,after,beforeEach} from 'node:test';import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';import {getAuth} from 'firebase-admin/auth';import {getDatabase} from 'firebase-admin/database';
import {createHash} from 'node:crypto';import {fixtureRoot,provisionLocalFixtures} from './fixtures.mjs';
import {buildProposal,dayNumber} from '../../assets/js/finance-spark/protocol.js';
const app=initializeApp({projectId:process.env.GCLOUD_PROJECT,databaseURL:`https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`}),db=getDatabase(app),auth=getAuth(app);let uids,tokens={};
const read=async p=>(await db.ref(`madani_app/${p}`).once('value')).val();
const base=`http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/madani_app/finance`;
async function send(who,patch){return fetch(`${base}.json?ns=${process.env.GCLOUD_PROJECT}-default-rtdb&auth=${tokens[who]}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});}
async function make(who,request){const f=await read('finance'),student=await read(`students/${request.studentId||'none'}`);const shiftId=f.sparkActiveShifts?.[uids[who]]?.[request.unitId];const original=f.sparkOps?.[request.saleId];return buildProposal(request,{uid:uids[who],yearId:'2026-2027',now:Date.now(),fingerprint:createHash('sha256').update(JSON.stringify(request)).digest('hex'),products:f.products?.[request.unitId],student:student||original&&{name:original.studentName,nis:original.studentNis},wallet:f.wallets?.[request.studentId||original?.studentId]?.spending||0,daily:f.sparkDaily?.[request.studentId]?.[dayNumber(Date.now())]?.spent||0,shift:f.sparkShifts?.[shiftId],bill:f.bills?.['2026-2027']?.[request.studentId]?.[request.billId],pinHash:createHash('sha256').update(request.pin||'').digest('hex'),original});}
async function apply(who,request){const p=await make(who,request),r=await send(who,p.patch);assert.equal(r.status,200,`${request.type}: ${await r.text()}`);return read(`finance/sparkOps/${request.id}`);}
async function proof(who,id,pin='483729'){const r=await send(who,{[`sparkPinProofs/${uids[who]}`]:{operationId:id,hash:createHash('sha256').update(pin).digest('hex'),attemptAt:{'.sv':'timestamp'},windowStartedAt:{'.sv':'timestamp'},count:1}});assert.equal(r.status,200,await r.text());}
const open=who=>apply(who,{id:`shift-${who}`,unitId:'PUTRA',type:'shift-open',openingCash:100000});
const sale=(id='sale',patch={})=>({id,unitId:'PUTRA',type:'checkout',method:'WALLET',studentId:'MM-S1',items:[{productId:'a',qty:1},{productId:'b',qty:1},{productId:'c',qty:1}],...patch});
before(async()=>{uids=await provisionLocalFixtures(auth,db);for(const [k,uid]of Object.entries(uids)){const token=await auth.createCustomToken(uid),r=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,returnSecureToken:true})});tokens[k]=(await r.json()).idToken;assert.ok(tokens[k]);}});
beforeEach(async()=>{const root=fixtureRoot(uids);root.settings.finance.sparkEnabled=true;root.finance.wallets['MM-S1'].pinConfigured=true;await db.ref('madani_app').set(root);});after(()=>deleteApp(app));
test('Spark topup: balance and immutable mutation commit atomically',async()=>{await apply('supervisor',{id:'topup',type:'treasury:topup',studentId:'MM-S1',amount:25000,method:'CASH',note:'Setoran'});assert.equal(await read('finance/wallets/MM-S1/spending'),125000);assert.equal(await read('finance/wallet_transactions/2026-2027/MM-S1/topup/amount'),25000);});
test('Spark checkout: validated prices, wallet, stock, shift and receipt',async()=>{await open('cashier');await proof('cashier','sale');await apply('cashier',sale());assert.equal(await read('finance/wallets/MM-S1/spending'),75000);assert.equal(await read('finance/products/PUTRA/a/stock'),9);});
test('Spark cash leaves wallet untouched and computes change',async()=>{await open('cashier');const r=await apply('cashier',sale('cash',{method:'CASH',studentId:'',cashReceived:30000}));assert.equal(r.change,5000);assert.equal(await read('finance/wallets/MM-S1/spending'),100000);});
async function denied(who,patch){const r=await send(who,patch);assert.equal(r.status,401,await r.text());}
test('Spark rules reject missing ledger, direct credit, deletion, forgery and cashier topup',async()=>{
 const top={id:'t',type:'treasury:topup',studentId:'MM-S1',amount:50000,method:'CASH',note:'Setoran'};
 const {patch}=await make('supervisor',top);delete patch['wallet_transactions/2026-2027/MM-S1/t'];await denied('supervisor',patch);
 await denied('cashier',{'wallets/MM-S1/spending':999999});await denied('supervisor',{'wallets/MM-S1/spending':null});
 await denied('cashier',(await make('cashier',top)).patch);
 const forged=(await make('supervisor',top)).patch;forged['sparkOps/t'].actorUid=uids.cashier;await denied('supervisor',forged);
 assert.equal(await read('finance/wallets/MM-S1/spending'),100000);
});
test('Spark rules validate each price, stock delta, total, nonempty cart, and PIN',async()=>{
 await open('cashier');await proof('cashier','bad','123456');await denied('cashier',(await make('cashier',sale('bad'))).patch);
 const req=sale('cash',{method:'CASH',cashReceived:30000,studentId:''});
 for(const mutate of [p=>{p['sparkOps/cash'].items[0].price=1;},p=>{p['products/PUTRA/a/stock']=10;},p=>{delete p['sparkOps/cash'].items;},p=>{p['sparkOps/cash'].total=1;},p=>{p['sparkOps/cash'].discount=1;}]){const p=(await make('cashier',req)).patch;mutate(p);await denied('cashier',p);}
 assert.equal(await read('finance/products/PUTRA/a/stock'),10);
});
test('Spark concurrent writes reject stale balance, then same operation rebuild succeeds once',async()=>{
 const req=id=>({id,type:'treasury:topup',studentId:'MM-S1',amount:25000,method:'CASH',note:'Setoran'}),a=await make('supervisor',req('a')),b=await make('supervisor',req('b'));
 const r=await Promise.all([send('supervisor',a.patch),send('supervisor',b.patch)]);assert.deepEqual(r.map(x=>x.status).sort(),[200,401]);const missing=r[0].status===401?'a':'b';await apply('supervisor',req(missing));assert.equal(await read('finance/wallets/MM-S1/spending'),150000);await denied('supervisor',(await make('supervisor',req(missing))).patch);assert.equal(await read('finance/wallets/MM-S1/spending'),150000);
});
test('Spark last stock cannot be sold twice by simultaneous cashiers',async()=>{
 await db.ref('madani_app/finance/products/PUTRA/a/stock').set(1);await open('cashier');await open('second');const req=id=>sale(id,{method:'CASH',cashReceived:10000,studentId:'',items:[{productId:'a',qty:1}]});const a=await make('cashier',req('a')),b=await make('second',req('b'));const r=await Promise.all([send('cashier',a.patch),send('second',b.patch)]);assert.deepEqual(r.map(x=>x.status).sort(),[200,401]);assert.equal(await read('finance/products/PUTRA/a/stock'),0);
});
test('Spark products, stock intake, authorized opname and PIN change',async()=>{
 await apply('cashier',{id:'newproduct',type:'product',unitId:'PUTRA',productId:'p',expectedVersion:0,product:{name:'Pensil',price:3000,cost:2000,active:true}});
 await apply('cashier',{id:'intake',type:'stock-in',unitId:'PUTRA',productId:'p',qty:10,cost:1500,reason:'Nota masuk'});assert.equal(await read('finance/products/PUTRA/p/stock'),10);
 await apply('supervisor',{id:'opname',type:'stock-adjust',unitId:'PUTRA',productId:'p',newStock:8,expectedStock:10,kind:'opname',reason:'Hitung fisik'});
 await apply('supervisor',{id:'pin',type:'treasury:wallet-pin',studentId:'MM-S1',pin:'654321'});assert.equal(await read('finance/wallets/MM-S1/pinHash'),createHash('sha256').update('654321').digest('hex'));
});
test('Spark SPP creation and payment update bill and immutable receipt together',async()=>{
 await apply('supervisor',{id:'bill',type:'treasury:bill-create',studentId:'MM-S1',period:'2026-11',amount:100000});await apply('supervisor',{id:'pay',type:'treasury:bill-pay',studentId:'MM-S1',billId:'SPP_2026-11',amount:50000,method:'CASH'});assert.equal(await read('finance/bills/2026-2027/MM-S1/SPP_2026-11/paidAmount'),50000);assert.equal(await read('finance/payments/2026-2027/pay/amount'),50000);assert.equal(await read('finance/wallets/MM-S1/spending'),100000);
});
test('Spark refund restores wallet and selected stock once; shifts reconcile',async()=>{
 await open('cashier');await proof('cashier','sale');await apply('cashier',sale());await apply('supervisor',{id:'refund',type:'refund',unitId:'PUTRA',saleId:'sale',reason:'Retur',returns:[{productId:'a',qty:1}]});assert.equal(await read('finance/wallets/MM-S1/spending'),100000);assert.equal(await read('finance/products/PUTRA/a/stock'),10);assert.equal(await read('finance/products/PUTRA/b/stock'),9);
 await denied('supervisor',(await make('supervisor',{id:'refund2',type:'refund',unitId:'PUTRA',saleId:'sale',reason:'Retur ulang',returns:[]})).patch);
 await apply('cashier',{id:'move',type:'cash-move',unitId:'PUTRA',amount:5000,direction:'out',reason:'Biaya'});await apply('cashier',{id:'close',type:'shift-close',unitId:'PUTRA',physicalCash:95000,reason:''});assert.equal(await read('finance/sparkShifts/shift-cashier/status'),'closed');assert.equal(await read(`finance/sparkActiveShifts/${uids.cashier}/PUTRA`),null);
});
async function userRead(who,path,query={}){const url=new URL(`http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/madani_app/${path}.json`);url.searchParams.set('ns',`${process.env.GCLOUD_PROJECT}-default-rtdb`);url.searchParams.set('auth',tokens[who]);for(const[k,v]of Object.entries(query))url.searchParams.set(k,JSON.stringify(v));return fetch(url);}
test('Spark privacy: cashier cannot read hashes, another unit balance or whole finance; wali sees only own child',async()=>{
 await apply('supervisor',{id:'topup',type:'treasury:topup',studentId:'MM-S1',amount:10000,method:'CASH',note:'Wali'});
 for(const [who,path]of [['cashier','finance/wallets/MM-S1/pinHash'],['cashier','finance'],['cashier','finance/wallets/MM-S2/spending'],['parent','finance/wallets/MM-S2/spending'],['cashier',`finance/sparkPinProofs/${uids.second}`]])assert.equal((await userRead(who,path)).status,401,path);
 assert.equal((await userRead('parent','finance/wallets/MM-S1/spending')).status,200);
 assert.equal((await userRead('parent','finance/sparkOps',{orderBy:'studentId',equalTo:'MM-S1'})).status,200);
 assert.equal((await userRead('parent','finance/sparkOps',{orderBy:'studentId',equalTo:'MM-S2'})).status,401);
});
test('Spark PIN attempts cannot skip cooldown, reset the window or mutate previous proof',async()=>{
 await proof('cashier','one');const current=await read(`finance/sparkPinProofs/${uids.cashier}`);
 await denied('cashier',{[`sparkPinProofs/${uids.cashier}`]:{...current,hash:'a'.repeat(64)}});
 await denied('cashier',{[`sparkPinProofs/${uids.cashier}`]:{...current,count:1,windowStartedAt:{'.sv':'timestamp'},attemptAt:{'.sv':'timestamp'}}});
 await db.ref(`madani_app/finance/sparkPinProofs/${uids.cashier}`).update({count:5,attemptAt:Date.now()-5000});
 await denied('cashier',{[`sparkPinProofs/${uids.cashier}`]:{...current,operationId:'six',count:6,attemptAt:{'.sv':'timestamp'}}});
});
test('Spark insufficient funds, daily limit, inactive identity and revoked cashier fail server-side',async()=>{
 await open('cashier');await proof('cashier','sale');const p=(await make('cashier',sale())).patch;
 await db.ref('madani_app/finance/wallets/MM-S1/spending').set(10000);await denied('cashier',p);
 await db.ref('madani_app/finance/wallets/MM-S1/spending').set(100000);await db.ref(`madani_app/finance/sparkDaily/MM-S1/${dayNumber(Date.now())}`).set({spent:40000,lastOperationId:'seed'});await denied('cashier',p);
 await db.ref(`madani_app/finance/sparkDaily/MM-S1`).remove();await db.ref(`madani_app/students/MM-S1/active`).set(false);await denied('cashier',p);
 await db.ref(`madani_app/students/MM-S1/active`).set(true);await db.ref(`madani_app/users/${uids.cashier}/accessRevoked`).set(true);await denied('cashier',p);
});
test('Spark 10 distinct items accepted, duplicate product lines and eleventh slot rejected by Rules',async()=>{
 const products=Object.fromEntries(Array.from({length:10},(_,i)=>['p'+i,{name:'Barang '+i,price:1000,cost:500,stock:5,active:true}]));await db.ref('madani_app/finance/products/PUTRA').set(products);await open('cashier');const req=sale('ten',{method:'CASH',studentId:'',cashReceived:10000,items:Object.keys(products).map(productId=>({productId,qty:1}))});await apply('cashier',req);
 const dup=(await make('cashier',{...req,id:'dup'})).patch;dup['sparkOps/dup'].items[1].productId='p0';await denied('cashier',dup);
 const extra=(await make('cashier',{...req,id:'extra'})).patch;extra['sparkOps/extra'].items.push({...extra['sparkOps/extra'].items[0]});extra['sparkOps/extra'].itemCount=11;await denied('cashier',extra);
});

function clientFor(who,{loseFirst=false}={}){
 const memory=new Map();let count=0,lost=false;
 const client=createSparkClient({uid:uids[who],sha256:async s=>createHash('sha256').update(s).digest('hex'),storage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},read:async(path,q)=>{const r=await userRead(who,path.replace('madani_app/',''),q?{orderBy:q.orderBy,equalTo:q.equalTo}:{});if(!r.ok)throw Object.assign(Error('Read denied'),{code:'PERMISSION_DENIED'});return r.json();},write:async(path,patch)=>{const r=await send(who,patch);if(!r.ok)throw Object.assign(Error('Write denied'),{code:'PERMISSION_DENIED'});count++;if(loseFirst&&!lost&&Object.keys(patch).some(k=>k.startsWith('sparkOps/'))){lost=true;throw Object.assign(Error('Response lost'),{code:'NETWORK'});}return r.json();}});
 return {client,memory,count:()=>count};
}
test('Spark client recovers committed lost response without sending another deposit',async()=>{
 const {client,memory,count}=clientFor('supervisor',{loseFirst:true});const op={id:'lost',type:'treasury:topup',studentId:'MM-S1',amount:10000,method:'CASH',note:'Setoran'};await assert.rejects(client.execute(op),/lost/);assert.equal(memory.size,1);const receipt=await client.execute(op);assert.equal(receipt.amount,10000);assert.equal(count(),1);assert.equal(memory.size,0);assert.equal(await read('finance/wallets/MM-S1/spending'),110000);
});
test('Spark client integrates cashier state, selected wallet, treasury and own-child history',async()=>{
 const k=clientFor('cashier').client,t=clientFor('supervisor').client,p=clientFor('parent').client;
 await t.execute({id:'deposit',type:'treasury:topup',studentId:'MM-S1',amount:10000,method:'CASH',note:'Setoran'});
 await k.execute({id:'s',unitId:'PUTRA',type:'shift-open',openingCash:100000});await k.execute({...sale('buy'),pin:'483729'});
 const state=await k.state({unitId:'PUTRA',studentId:'MM-S1'});assert.equal(state.wallet.spending,85000);assert.equal(state.students.length,1);assert.equal(state.sales.length,1);
 const treasury=await t.treasury({studentId:'MM-S1'});assert.equal(treasury.wallets['MM-S1'].spending,85000);
 const parent=await p.parent({studentId:'MM-S1'});assert.equal(parent.sales[0].studentName,'Santri Uji Putra');assert.equal(parent.mutations.length,2);await assert.rejects(p.parent({studentId:'MM-S2'}),/ditolak/);
});
test('Spark bendahara tops up; simultaneous topup and wallet checkout preserve both amounts',async()=>{
 await db.ref(`madani_app/users/${uids.supervisor}`).set({role:'bendahara',active:true});
 await open('cashier');await proof('cashier','buy');
 const t={id:'deposit',type:'treasury:topup',studentId:'MM-S1',amount:10000,method:'CASH',note:'Setoran bendahara'},s=sale('buy');
 const [a,b]=await Promise.all([make('supervisor',t),make('cashier',s)]),r=await Promise.all([send('supervisor',a.patch),send('cashier',b.patch)]);
 assert.deepEqual(r.map(x=>x.status).sort(),[200,401]);await apply(r[0].status===401?'supervisor':'cashier',r[0].status===401?t:s);
 assert.equal(await read('finance/wallets/MM-S1/spending'),85000);
 await denied('supervisor',(await make('supervisor',{id:'forbidden-shift',type:'shift-open',unitId:'PUTRA',openingCash:0})).patch);
});
test('Spark mixed payment and cash refund reconcile shift while keeping original receipt',async()=>{
 await open('cashier');await open('supervisor');await proof('cashier','mixed');
 await apply('cashier',sale('mixed',{method:'MIXED',walletAmount:10000,cashReceived:20000}));
 assert.equal(await read('finance/wallets/MM-S1/spending'),90000);assert.equal(await read('finance/sparkShifts/shift-cashier/salesCash'),15000);
 await apply('supervisor',{id:'refund-mixed',type:'refund',unitId:'PUTRA',saleId:'mixed',reason:'Retur disetujui',returns:[{productId:'a',qty:1},{productId:'b',qty:1},{productId:'c',qty:1}]});
 assert.equal(await read('finance/wallets/MM-S1/spending'),100000);assert.equal(await read('finance/sparkShifts/shift-supervisor/refundCash'),15000);assert.equal(await read('finance/sparkOps/mixed/status'),'paid');
 await denied('cashier',{'sparkOps/mixed/total':1});await denied('supervisor',{'sparkOps/mixed':null});
});
test('Spark legacy SPP period marker prevents duplicate and concurrent payments cannot overpay',async()=>{
 await db.ref('madani_app/finance/sparkBillPeriods/2026-2027/MM-S1/2026-10').set('legacy-bill');
 await denied('supervisor',(await make('supervisor',{id:'duplicate',type:'treasury:bill-create',studentId:'MM-S1',period:'2026-10',amount:100000})).patch);
 await apply('supervisor',{id:'bill',type:'treasury:bill-create',studentId:'MM-S1',period:'2026-11',amount:100000});
 const req=id=>({id,type:'treasury:bill-pay',studentId:'MM-S1',billId:'SPP_2026-11',amount:60000,method:'CASH'}),a=await make('supervisor',req('p1')),b=await make('supervisor',req('p2'));
 const r=await Promise.all([send('supervisor',a.patch),send('supervisor',b.patch)]);assert.deepEqual(r.map(x=>x.status).sort(),[200,401]);assert.equal(await read('finance/bills/2026-2027/MM-S1/SPP_2026-11/paidAmount'),60000);
});
test('Spark completed valid PIN purchase permits next customer; expired products fail closed',async()=>{
 await open('cashier');await proof('cashier','first');await apply('cashier',sale('first'));
 await proof('cashier','next');await apply('cashier',sale('next'));
 await db.ref('madani_app/finance/products/PUTRA/a').update({expiryDate:'2020-01-01'});
 const request=sale('expired',{method:'CASH',studentId:'',cashReceived:30000});
 // Construct against earlier inventory to exercise authoritative Rules rather than client validation.
 await db.ref('madani_app/finance/products/PUTRA/a/expiryDate').remove();const p=await make('cashier',request);await db.ref('madani_app/finance/products/PUTRA/a/expiryDate').set('2020-01-01');await denied('cashier',p.patch);
});
test('Spark preserves legacy dates, refund history and unknown HPP without enabling old writes',async()=>{
 await db.ref('madani_app/finance/cashier_transactions/2026-2027/old').set({unitId:'PUTRA',studentId:'MM-S1',date:'2026-10-31',total:10000,status:'void',voidedAt:Date.now(),items:[{productId:'a',name:'Biskuit',qty:1,price:10000,subtotal:10000}]});
 const state=await clientFor('cashier').client.state({unitId:'PUTRA'});assert.equal(state.sales[0].date,'2026-10-31');assert.equal(state.sales[0].legacy,true);assert.equal(state.sales[0].costUnknown,true);assert.equal(state.refunds[0].walletRefund,10000);
 await denied('cashier',{'cashier_transactions/2026-2027/old/total':1});
});
test('Spark pays an existing legacy bill without deleting its descriptive or audit fields',async()=>{
 const bill={studentId:'MM-S1',typeId:'LAINNYA',period:'2026/2027',amount:100000,paidAmount:0,status:'unpaid',description:'Tagihan lama',dueDate:'2026-11-30',createdAt:1,createdBy:'legacy',updatedAt:2,updatedBy:'legacy'};
 await db.ref('madani_app/finance/bills/2026-2027/MM-S1/old').set(bill);
 await apply('supervisor',{id:'legacy-pay',type:'treasury:bill-pay',studentId:'MM-S1',billId:'old',amount:10000,method:'CASH'});
 const after=await read('finance/bills/2026-2027/MM-S1/old');for(const key of Object.keys(bill).filter(k=>!['paidAmount','status'].includes(k)))assert.equal(after[key],bill[key]);assert.equal(after.paidAmount,10000);
});
