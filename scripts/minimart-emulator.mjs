/** Local demo only; never reads credentials/config from the live Firebase project. */
import {spawn} from 'node:child_process';
import {readdir,access,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {resolve,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {prepareSparkRules} from './finance-spark-rules.mjs';
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),work=resolve(root,'server/minimart');
const mode=process.argv[2];if(!['test','serve'].includes(mode))throw Error('Gunakan: node scripts/minimart-emulator.mjs test|serve');
let javaHome=process.env.JAVA_HOME;
if(!javaHome){try{const names=await readdir('/tmp/madani-minimart-java');javaHome=resolve('/tmp/madani-minimart-java',names.find(n=>n.startsWith('jdk-')),'Contents/Home');}catch{throw Error('Java 21 diperlukan. Atur JAVA_HOME ke JDK/JRE 21 lokal.');}}
await access(resolve(javaHome,'bin/java'));
const authPort=mode==='test'?9199:9099,databasePort=mode==='test'?9100:9000,hubPort=mode==='test'?4410:4400;
const env={...process.env,JAVA_HOME:javaHome,PATH:resolve(javaHome,'bin')+delimiter+process.env.PATH,
 GCLOUD_PROJECT:'demo-madani-minimart',FIREBASE_AUTH_EMULATOR_HOST:`127.0.0.1:${authPort}`,FIREBASE_DATABASE_EMULATOR_HOST:`127.0.0.1:${databasePort}`,FIREBASE_EMULATORS_PATH:'/tmp/madani-minimart-emulator-cache',CI:'true',MINIMART_CREDENTIALS_FILE:mode==='test'?'/tmp/madani-finance-test-accounts.json':(process.env.MINIMART_CREDENTIALS_FILE||'/tmp/madani-minimart-accounts.json')};
// Do not attach to an unknown process or reset a running operator's demo.
try{await fetch(`http://127.0.0.1:${hubPort}/emulators`,{signal:AbortSignal.timeout(1000)});throw Error('Port emulator sedang dipakai. Hentikan sesi lokal sebelumnya terlebih dahulu.');}catch(error){if(error.message.startsWith('Port'))throw error;}
const temporary=await mkdtemp(resolve(tmpdir(),'madani-spark-'));
const rulesPath=resolve(temporary,'rules.json'),configPath=resolve(temporary,'emulator.json');
await writeFile(rulesPath,JSON.stringify(prepareSparkRules(JSON.parse(await readFile(resolve(root,'database.rules.json'),'utf8')))));
const config=JSON.parse(await readFile(resolve(work,'emulator.json'),'utf8'));config.database.rules=rulesPath;config.emulators.auth.port=authPort;config.emulators.database.port=databasePort;config.emulators.hub.port=hubPort;config.emulators.logging.port=hubPort+100;
await writeFile(configPath,JSON.stringify(config));
const children=[];
const start=(args)=>{const child=spawn(process.execPath,args,{cwd:work,env,stdio:'inherit'});children.push(child);return child;};
const wait=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Proses lokal berhenti (${code}).`)));});
let stopping=false;
async function stop(code=0){if(stopping)return;stopping=true;process.exitCode=code;for(const child of children.slice().reverse())child.kill('SIGINT');setTimeout(()=>process.exit(code),1500).unref();}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
const timer=setTimeout(()=>{console.error('Batas waktu sesi lokal tercapai.');stop(1);},mode==='test'?180000:7200000);
try{
 const cli=start(['node_modules/firebase-tools/lib/bin/firebase.js','emulators:start','--only','auth,database','--project','demo-madani-minimart','--config',configPath]);
 let ready=false;
 for(let i=0;i<90;i++){
  if(cli.exitCode!==null)throw Error('Emulator gagal dimulai.');
  try{const r=await fetch(`http://127.0.0.1:${hubPort}/emulators`,{signal:AbortSignal.timeout(1000)});const state=await r.json();if(state.auth&&state.database){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ready)throw Error('Emulator belum siap dalam 45 detik.');
 await wait(start(['seed-local.mjs']));
 if(mode==='test'){await wait(start(['--test','--test-concurrency=1','--test-timeout=30000','spark-tests.mjs']));clearTimeout(timer);await stop();}
 else {await wait(start(['local-server.mjs']));clearTimeout(timer);await stop();}
}catch(error){console.error(error.message);clearTimeout(timer);await stop(1);}
