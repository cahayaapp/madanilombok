import {createHash, randomBytes} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {assertEmulatorEnvironment} from './firebase-service.mjs';
export const fixturePin = '483729';
export function fixtureRoot(uids = {cashier:'mm-cashier', second:'mm-second', supervisor:'mm-supervisor', parent:'mm-parent'}) {
 const profile=(name,role,unit='PUTRA')=>({name,displayName:name,active:true,role,roles:[role],roleFlags:{[role]:true},defaultRole:role,financeUnit:unit,roleScopes:{[role]:{financeUnit:unit,cashierUnits:[unit]}},studentIds:role==='wali_santri'?['MM-S1']:[]});
 return {settings:{currentAcademicYearId:'2026-2027',finance:{dailySpendingLimit:50000,sparkEnabled:true}},academic_years:{'2026-2027':{name:'2026/2027',active:true}},
 users:{[uids.cashier]:profile('Kasir Minimart Uji','minimart'),[uids.second]:profile('Kasir Kedua Uji','minimart'),[uids.supervisor]:profile('Supervisor Uji','director'),[uids.parent]:profile('Wali Uji','wali_santri')},
 students:{'MM-S1':{name:'Santri Uji Putra',nis:'UJI-001',gender:'L',status:'active',boardingStatus:'boarding'},'MM-S2':{name:'Santri Uji Putri',nis:'UJI-002',gender:'P',status:'active',boardingStatus:'boarding'}},
 finance:{cashierUnits:{PUTRA:{name:'Minimart Putra',gender:'L',active:true},PUTRI:{name:'Minimart Putri',gender:'P',active:true}},
 products:{PUTRA:{a:{name:'Biskuit',sku:'BIS-01',barcode:'899000000001',category:'Makanan ringan',unit:'pcs',price:10000,cost:6000,stock:10,minStock:3,active:true},b:{name:'Susu',sku:'SUS-01',barcode:'899000000002',category:'Minuman',unit:'kotak',price:10000,cost:5000,stock:10,minStock:3,active:true},c:{name:'Buku Tulis',sku:'BUK-01',barcode:'899000000003',category:'Alat tulis',unit:'pcs',price:5000,cost:3000,stock:10,minStock:3,active:true}}},
 wallets:{'MM-S1':{spending:100000,savings:200000,pinConfigured:true,pinHash:createHash('sha256').update(fixturePin).digest('hex')}}}};
}
export async function provisionLocalFixtures(auth,db) {
 assertEmulatorEnvironment(process.env);
 let saved={};try{const previous=JSON.parse(await readFile(process.env.MINIMART_CREDENTIALS_FILE||'/tmp/madani-minimart-accounts.json','utf8'));if(previous.environment==='LOCAL EMULATOR ONLY')saved=previous.accounts||{};}catch(error){if(error.code!=='ENOENT')throw error;}
 const credentials={},uids={};
 for(const [key,email,uid] of [['cashier','mart@madani.app','mm-cashier'],['second','mart2@example.test','mm-second'],['supervisor','supervisor@example.test','mm-supervisor'],['parent','parent@example.test','mm-parent']]) {
  try { const existing=await auth.getUserByEmail(email);uids[key]=existing.uid; }
  catch(error){
   if(error.code!=='auth/user-not-found')throw error;
   const password=key==='cashier' && process.env.MINIMART_PASSWORD ? process.env.MINIMART_PASSWORD : saved[email] || randomBytes(18).toString('base64url');
   try{const user=await auth.createUser({uid,email,password});uids[key]=user.uid;credentials[email]=password;}
   catch(race){if(race.code!=='auth/email-already-exists')throw race;uids[key]=(await auth.getUserByEmail(email)).uid;}
  }
 }
 const existing=(await db.ref('madani_app/settings/currentAcademicYearId').once('value')).val();
 if(!existing)await db.ref('madani_app').set(fixtureRoot(uids));
 else for(const key of ['cashier','second'])await db.ref(`madani_app/users/${uids[key]}`).transaction(current=>{
  const p=current||{}, roles=[...new Set([p.role,...(Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(r=>p.roles[r]===true)),...Object.keys(p.roleFlags||{}).filter(r=>p.roleFlags[r]===true),'minimart'].filter(Boolean))];
  return {...p,active:p.active??true,role:p.role||'minimart',defaultRole:p.defaultRole||p.role||'minimart',roles,roleFlags:{...p.roleFlags,minimart:true},roleScopes:{...p.roleScopes,minimart:p.roleScopes?.minimart||{financeUnit:'PUTRA',cashierUnits:['PUTRA']}}};
 });
 // Do not reset passwords or overwrite an existing operator's fixture database.
 if(Object.keys(credentials).length){
  const path=process.env.MINIMART_CREDENTIALS_FILE||'/tmp/madani-minimart-accounts.json',temporary=`${path}.${randomBytes(12).toString('hex')}`;
  await writeFile(temporary,JSON.stringify({environment:'LOCAL EMULATOR ONLY',accounts:credentials,studentPin:fixturePin},null,2),{mode:0o600,flag:'wx'});
  await rename(temporary,path);
 }
 return uids;
}
