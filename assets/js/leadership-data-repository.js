import {writeAudit} from './repository.js';
import {ref,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {db} from './firebase.js';
import {appConfig} from '../../config/firebase-config.js';
// Per-record transaction rejects stale editors; audit is committed with the record.
export async function commitLeadershipData(path,expected,next,actorUid){
 const target=ref(db,`${appConfig.databaseRoot}/${path}`);let stop=()=>{},timer;
 try{
 // Keep the listener alive through the transaction: get() alone need not retain its cache.
 await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Data belum dapat dimuat. Periksa koneksi lalu coba kembali.')),20000);stop=onValue(target,resolve,reject);});
 clearTimeout(timer);
 const clean=x=>{const v={...(x||{})};delete v.id;const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;return JSON.stringify(sorted(v));};
 let failure;const result=await runTransaction(target,current=>{
  if(clean(current)!==clean(expected)){failure=Error('Data telah berubah. Muat ulang lalu periksa kembali perubahan Anda.');return;}
  if(next===null)return null;
  const now=Date.now(),id=crypto.randomUUID(),payload={...next};delete payload.id;return {...payload,createdAt:current?.createdAt||now,createdBy:current?.createdBy||actorUid,updatedAt:now,updatedBy:actorUid,managementHistory:{...current?.managementHistory,[id]:{by:actorUid,at:now,action:current?'update':'create'}}};
 },{applyLocally:false});
 if(!result.committed)throw failure||Error('Perubahan belum tersimpan.');
 if(next===null)await writeAudit('unassign',path,'membership',actorUid,{previous:expected});
 return result.snapshot.val();
 }finally{clearTimeout(timer);stop();}
}
