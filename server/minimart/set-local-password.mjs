// Explicit operator maintenance, local emulator only. Secret arrives on stdin.
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {assertEmulatorEnvironment} from './firebase-service.mjs';
assertEmulatorEnvironment(process.env);
let password='';for await(const chunk of process.stdin)password+=chunk;password=password.trimEnd();
if(password.length<8)throw Error('Password minimal 8 karakter.');
const app=initializeApp({projectId:process.env.GCLOUD_PROJECT});
const auth=getAuth(app),user=await auth.getUserByEmail('mart@madani.app');
await auth.updateUser(user.uid,{password});
const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'mart@madani.app',password,returnSecureToken:true})});
if(!response.ok)throw Error('Verifikasi login emulator gagal.');
const path='/tmp/madani-minimart-accounts.json',data=JSON.parse(await readFile(path,'utf8'));data.accounts['mart@madani.app']=password;
const temporary=`${path}.${randomUUID()}`;await writeFile(temporary,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});await rename(temporary,path);
password='';console.log('Password akun emulator diperbarui pada UID existing; verifikasi login berhasil.');await deleteApp(app);
