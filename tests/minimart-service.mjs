import test from 'node:test';
import assert from 'node:assert/strict';
import {assertEmulatorEnvironment, createEmulatorMinimartService} from '../server/minimart/firebase-service.mjs';
const env={GCLOUD_PROJECT:'demo-madani-minimart',FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'};
const seed=()=>({users:{u1:{role:'minimart',financeUnit:'PUTRA'}},settings:{currentAcademicYearId:'y1'},finance:{minimart:{activeShifts:{u1:{PUTRA:'shift1'}},shifts:{shift1:{id:'shift1',unitId:'PUTRA',cashierUid:'u1',status:'open',openingCash:0,salesCash:0,refundCash:0,cashIn:0,cashOut:0}}},cashierUnits:{PUTRA:{}},products:{PUTRA:{p1:{name:'Item',stock:2,price:17000,cost:10000}}}}});
const operation={id:'sale1',type:'checkout',unitId:'PUTRA',method:'CASH',cashReceived:20000,items:[{productId:'p1',qty:1}],profile:{role:'admin'},total:1,now:1};
function harness({aborted=false}={}) {
 let data=seed(), calls=[], listeners=0;
 const get=path=>path.split('/').slice(1).reduce((n,k)=>n?.[k],data)??null;
 const snapshot=value=>({val:()=>value});
 const db={ref(path){calls.push(path);return {
   async once(){return snapshot(get(path));}, on(){listeners++;},off(){listeners--;},
   async transaction(callback){const next=callback(get(path)); if(aborted||next===undefined)return {committed:false,snapshot:snapshot(get(path))};data=next;return {committed:true,snapshot:snapshot(next)};}
 };}};
 return {db,data:()=>data,calls,listeners:()=>listeners};
}
test('service rejects production or remote emulator hosts before any SDK access',()=>{
 for(const bad of [{},{...env,GCLOUD_PROJECT:'madanilombok-f692d'},{...env,FIREBASE_DATABASE_EMULATOR_HOST:'example.com:9000'},{...env,FIREBASE_AUTH_EMULATOR_HOST:undefined}]) assert.throws(()=>assertEmulatorEnvironment(bad),/emulator/);
});
test('service verifies token revocation and uses server identity, clock, prices and current year',async()=>{
 const h=harness(), tokens=[];
 const service=createEmulatorMinimartService({db:h.db,auth:{async verifyIdToken(token,revoked){tokens.push([token,revoked]);return {uid:'u1'};}},env,clock:()=>1793505600000});
 const receipt=await service({idToken:'fixture-token',operation,uid:'boss'});
 assert.deepEqual(tokens,[['fixture-token',true]]);assert.equal(receipt.cashierUid,'u1');assert.equal(receipt.total,17000);assert.equal(receipt.academicYearId,'y1');assert.equal(receipt.createdAt,1793505600000);
 assert.equal(h.listeners(),0);assert.equal(h.data().finance.products.PUTRA.p1.stock,1);assert.ok(h.calls.every(path=>path==='madani_app'));
});
test('unauthenticated/invalid token requests do not read or write the database',async()=>{
 const h=harness();const service=createEmulatorMinimartService({db:h.db,auth:{async verifyIdToken(){throw Error('invalid token');}},env});
 await assert.rejects(service({idToken:'',operation}),/Login/);await assert.rejects(service({idToken:'bad',operation}),/invalid token/);assert.equal(h.calls.length,0);
});
test('aborted database commit never returns success and removes listener',async()=>{
 const h=harness({aborted:true});const service=createEmulatorMinimartService({db:h.db,auth:{async verifyIdToken(){return {uid:'u1'};}},env});
 await assert.rejects(service({idToken:'test',operation}),/belum tersimpan/);assert.equal(h.listeners(),0);assert.equal(h.data().finance.products.PUTRA.p1.stock,2);
});
test('persisted profile overrides forged request permissions',async()=>{
 const h=harness();h.data().users.u1.role='wali_santri';const service=createEmulatorMinimartService({db:h.db,auth:{async verifyIdToken(){return {uid:'u1'};}},env});
 await assert.rejects(service({idToken:'test',operation}),/ditolak/);assert.equal(h.listeners(),0);assert.equal(h.data().finance.minimart.sales,undefined);
});
