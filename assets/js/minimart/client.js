// Firebase Spark only. No application server, Cloud Functions or third-party API.
import {createSparkClient} from '../finance-spark/client.js';
import {minimartLocal} from '../minimart-environment.js';
import {firebaseConfig} from '../../../config/firebase-config.js';
let client,clientUid;
async function instance(){
 const {auth}=await import('../firebase.js'),user=auth.currentUser;if(!user)throw Error('Silakan masuk kembali.');
 if(client&&clientUid===user.uid)return client;
 const base=minimartLocal?'http://127.0.0.1:9000':firebaseConfig.databaseURL;
 const namespace=minimartLocal?'demo-madani-minimart-default-rtdb':'';
 async function request(path,method='GET',body,query){
  const url=new URL(`${base}/${path}.json`);url.searchParams.set('auth',await user.getIdToken());if(namespace)url.searchParams.set('ns',namespace);if(query){url.searchParams.set('orderBy',JSON.stringify(query.orderBy));url.searchParams.set('equalTo',JSON.stringify(query.equalTo));}
  const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(!response.ok){const err=Error(response.status===401||response.status===403?'Akses Firebase ditolak.':'Koneksi Firebase belum tersedia.');err.code=response.status===401||response.status===403?'PERMISSION_DENIED':'NETWORK';throw err;}
  return response.json();
 }
 const sha256=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
 clientUid=user.uid;client=createSparkClient({uid:user.uid,read:(path,query)=>request(path,'GET',undefined,query),write:(path,patch)=>request(path,'PATCH',patch),sha256,storage:sessionStorage});return client;
}
export const minimartAPI=Object.fromEntries(['state','treasury','parent','execute'].map(method=>[method,async args=>(await instance())[method](args)]));
