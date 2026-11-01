/** Local demo only; never reads credentials/config from the live Firebase project. */
import {spawn} from 'node:child_process';
import {readdir,access} from 'node:fs/promises';
import {resolve,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),work=resolve(root,'server/minimart');
const mode=process.argv[2];if(!['test','serve'].includes(mode))throw Error('Gunakan: node scripts/minimart-emulator.mjs test|serve');
let javaHome=process.env.JAVA_HOME;
if(!javaHome){try{const names=await readdir('/tmp/madani-minimart-java');javaHome=resolve('/tmp/madani-minimart-java',names.find(n=>n.startsWith('jdk-')),'Contents/Home');}catch{throw Error('Java 21 diperlukan. Atur JAVA_HOME ke JDK/JRE 21 lokal.');}}
await access(resolve(javaHome,'bin/java'));
const env={...process.env,JAVA_HOME:javaHome,PATH:resolve(javaHome,'bin')+delimiter+process.env.PATH,
 GCLOUD_PROJECT:'demo-madani-minimart',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',FIREBASE_EMULATORS_PATH:'/tmp/madani-minimart-emulator-cache',CI:'true'};
// Do not attach to an unknown process or reset a running operator's demo.
try{await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(1000)});throw Error('Port emulator sedang dipakai. Hentikan sesi lokal sebelumnya terlebih dahulu.');}catch(error){if(error.message.startsWith('Port'))throw error;}
const children=[];
const start=(args)=>{const child=spawn(process.execPath,args,{cwd:work,env,stdio:'inherit'});children.push(child);return child;};
const wait=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Proses lokal berhenti (${code}).`)));});
let stopping=false;
async function stop(code=0){if(stopping)return;stopping=true;for(const child of children.slice().reverse())child.kill('SIGINT');setTimeout(()=>process.exit(code),1500).unref();}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
const timer=setTimeout(()=>{console.error('Batas waktu sesi lokal tercapai.');stop(1);},mode==='test'?180000:7200000);
try{
 const cli=start(['node_modules/firebase-tools/lib/bin/firebase.js','emulators:start','--only','auth,database','--project','demo-madani-minimart','--config','emulator.json']);
 let ready=false;
 for(let i=0;i<90;i++){
  if(cli.exitCode!==null)throw Error('Emulator gagal dimulai.');
  try{const r=await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(1000)});const state=await r.json();if(state.auth&&state.database){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ready)throw Error('Emulator belum siap dalam 45 detik.');
 await wait(start(['seed-local.mjs']));
 if(mode==='test'){await wait(start(['--test','--test-concurrency=1','--test-timeout=30000','emulator-tests.mjs']));clearTimeout(timer);await stop();}
 else {await wait(start(['local-server.mjs']));clearTimeout(timer);await stop();}
}catch(error){console.error(error.message);clearTimeout(timer);await stop(1);}
