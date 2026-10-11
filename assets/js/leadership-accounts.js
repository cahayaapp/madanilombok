import {staffRoles} from './leadership-data-model.js';
import {ROLE_LABELS} from './permissions.js';
import {escapeHtml as e} from './utils.js';
export async function editLeadershipAccount({root,scope,staff,users,commit,refresh}){
 const accounts=users.filter(u=>u.staffId===staff.id);
 if(accounts.length>1)throw Error('Personil memiliki beberapa akun. Administrator perlu memastikan akun yang dipakai.');
 const current=accounts[0];
 if(current&&current.managementOwnerUid!==scope.uid)throw Error('Akun personil ini dikelola Administrator. Administrator perlu menyerahkan pengelolaan akun ini kepada Anda sebelum role-nya dapat diubah.');
 const allowed=staffRoles(scope);const priorRoles=current?[...new Set([current.role,...(Array.isArray(current.roles)?current.roles:[]),...Object.keys(current.roleFlags||{}).filter(k=>current.roleFlags[k])].filter(Boolean))]:[];if(priorRoles.some(r=>!allowed.includes(r)))throw Error('Akun ini memiliki role di luar kewenangan unit. Pengelolaannya tetap melalui Administrator.');
 const dialog=root.querySelector('dialog'),form=dialog.querySelector('form');
 dialog.querySelector('[data-title]').textContent=`Akun & Role · ${staff.name}`;
 dialog.querySelector('[data-fields]').innerHTML=`<label>Email login<input name="email" type="email" value="${e(current?.email||staff.email||'')}" required ${current?'readonly':''}></label>${current?'':'<label>Password awal<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>'}<fieldset><legend>Role personil</legend>${allowed.map(role=>`<label><input type="checkbox" name="roles" value="${role}" ${current?.roleFlags?.[role]?'checked':''}>${e(ROLE_LABELS[role])}</label>`).join('')}</fieldset><label>Status akun<select name="active"><option value="true">Aktif</option><option value="false" ${current?.active===false?'selected':''}>Nonaktif</option></select></label>${!scope.school?'<label>Level Konselor<select name="counselorLevel"><option value="PEMULA">Pemula</option><option value="MADYA" '+(current?.roleScopes?.konselor?.counselorLevel==='MADYA'?'selected':'')+'>Madya</option></select></label>':''}<p>Penugasan kelas, halaqoh dan siswa binaan mengikuti identitas SDM ini. Akun nonaktif tidak dapat masuk; riwayat dipertahankan.</p>`;
 dialog.querySelector('[data-form-error]').textContent='';let saving=false;
 dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!saving)dialog.close();});dialog.oncancel=ev=>{if(saving)ev.preventDefault();};
 form.onsubmit=async ev=>{ev.preventDefault();if(saving)return;const data=new FormData(form),roles=data.getAll('roles');if(!roles.length){dialog.querySelector('[data-form-error]').textContent='Pilih minimal satu role.';return;}
 saving=true;form.querySelector('[type=submit]').disabled=true;
 let credential,authApi,secondary,appApi,app,saved=false;
 try{
 const unitId=scope.school?staff.unitIds?.[0]:'';
 const profile={...(current||{}),name:staff.name,email:data.get('email').trim(),staffId:staff.id,role:roles[0],defaultRole:roles[0],roles,roleFlags:Object.fromEntries(roles.map(r=>[r,true])),roleScopes:Object.fromEntries(roles.map(r=>[r,{unitIds:scope.school?[unitId]:[],classIds:[],groupIds:[],subjectIds:[],menteeStudentIds:[],scopeGender:scope.gender,genderScope:scope.gender,counselorLevel:r==='konselor'?data.get('counselorLevel')||'PEMULA':''}])),unitIds:scope.school?[unitId]:[],scopeGender:scope.gender,genderScope:scope.gender,managementOwnerUid:scope.uid,managementUnitId:unitId,managementGender:scope.gender,active:data.get('active')==='true',accessRevoked:false,accessVersion:(current?.accessVersion||0)+1};delete profile.id;for(const key of ['classIds','groupIds','subjectIds','menteeStudentIds','studentIds','studentId','studentAccess','financeUnit','cashierUnits'])delete profile[key];
 let uid=current?.id;
 if(!uid){
 appApi=await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');authApi=await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');const {firebaseConfig}=await import('../../config/firebase-config.js');
 app=appApi.initializeApp(firebaseConfig,`leadership-${crypto.randomUUID()}`);secondary=authApi.getAuth(app);await authApi.setPersistence(secondary,authApi.inMemoryPersistence);credential=await authApi.createUserWithEmailAndPassword(secondary,profile.email,data.get('password'));uid=credential.user.uid;
 }
 await commit(`users/${uid}`,current,profile);saved=true;dialog.close();await refresh();
 }catch(err){if(credential&&!saved){try{await authApi.deleteUser(credential.user);}catch{err=Error('Login terbentuk, tetapi profil gagal tersimpan. Hubungi Administrator sebelum mencoba lagi.');}}dialog.querySelector('[data-form-error]').textContent=err.message;}
 finally{if(secondary)await authApi.signOut(secondary);if(app)await appApi.deleteApp(app);saving=false;form.querySelector('[type=submit]').disabled=false;}
 };dialog.showModal();
}
