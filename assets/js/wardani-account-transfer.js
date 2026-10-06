import {getNode,bulkPatchRoot} from './repository.js';
const OLD='wardani2@madani.app',NEXT='wardanisd@madani.app',STAFF='AMD-SDM-0080';
const rolesOf=p=>[...new Set([p.role,...(Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k])),...Object.keys(p.roleFlags||{}).filter(k=>p.roleFlags[k])].filter(Boolean))];
export async function prepareWardaniTransfer(read){
 const users=await read('users')||{};const find=email=>Object.entries(users).filter(([,p])=>p.email?.toLowerCase()===email);
 const olds=find(OLD),news=find(NEXT);if(olds.length!==1||news.length!==1)throw Error('Akun lama dan baru harus masing-masing tersedia tepat satu di Manajemen Akun.');
 const [oldUid,old]=olds[0],[newUid,next]=news[0];if(old.staffId!==STAFF)throw Error('Akun lama belum tertaut ke SDM Wardani.');
 if(next.staffId&&next.staffId!==STAFF)throw Error('Akun baru tertaut ke SDM lain. Periksa identitas sebelum pengalihan.');
 if(next.active===false||next.accessRevoked)throw Error('Aktifkan akun baru dahulu.');
 const patch={},roles=[...new Set([...rolesOf(old),...rolesOf(next),'guru_mapel','guru_wali'])];
 for(const key of ['unitIds','classIds','subjectIds','groupIds','menteeStudentIds'])if(old[key])patch[`users/${newUid}/${key}`]=old[key];
 Object.assign(patch,{[`users/${newUid}/staffId`]:STAFF,[`users/${newUid}/name`]:'WARDANI',[`users/${newUid}/roles`]:roles,[`users/${newUid}/roleFlags`]:Object.fromEntries(roles.map(r=>[r,true])),[`users/${newUid}/roleScopes`]:{...next.roleScopes,...old.roleScopes},[`users/${newUid}/role`]:old.role||'guru_mapel',[`users/${newUid}/accessVersion`]:(next.accessVersion||0)+1,[`users/${oldUid}/active`]:false,[`users/${oldUid}/accessRevoked`]:true,[`users/${oldUid}/replacedByUid`]:newUid,[`users/${oldUid}/accessVersion`]:(old.accessVersion||0)+1});
 let records=0;function transfer(path,node){if(!node||typeof node!=='object')return;let changed=false;for(const key of ['teacherUid','mentorUid'])if(node[key]===oldUid){patch[`${path}/${key}`]=newUid;patch[`${path}/accountTransferOriginal/${key}`]=node.accountTransferOriginal?.[key]||oldUid;changed=true;}if(changed){records++;if(typeof node.version==='number')patch[`${path}/version`]=node.version+1;}for(const [key,v]of Object.entries(node))if(key!=='accountTransferOriginal'&&v&&typeof v==='object')transfer(`${path}/${key}`,v);}
 const years=await read('academic_years')||{};
 for(const year of Object.keys(years)){
  for(const branch of ['learning_sessions','exam_sessions','teaching_attendance','material_targets','material_completions','teacher_reflections','teacher_writings','exam_followups']){const path=`academic/${branch}/${year}/${STAFF}`;transfer(path,await read(path));}
  const [assignments,classes,mentors]=await Promise.all([read(`assignments/classes/${year}`),read('classes'),read(`assignments/mentors/${year}`)]);
  const ids=new Set([...Object.entries(assignments||{}).filter(([,a])=>classes?.[a.classId]?.homeroomStaffId===STAFF).map(([id])=>id),...Object.entries(mentors||{}).filter(([,a])=>a.mentorStaffId===STAFF).map(([id])=>id)]);
  for(const id of ids){const path=`boarding/mentoring/${year}/${id}`;transfer(path,await read(path));}
 }
 return {patch,oldUid,newUid,records};
}
export async function renderWardaniTransfer(host,session){
 host.innerHTML='<h3>Pengalihan Akun Wardani SD</h3><p>wardani2@madani.app → wardanisd@madani.app. Identitas SDM, role, jadwal dan kelas dipertahankan; kepemilikan sesi akademik/mentoring dialihkan. Akses akun lama dicabut. Penghapusan login Firebase Auth dilakukan terpisah setelah verifikasi.</p><button class="btn btn-secondary">Periksa Pengalihan Wardani</button><button class="btn btn-primary" data-apply hidden>Terapkan Pengalihan Wardani</button><p role="status"></p>';
 const check=host.querySelector('button'),apply=host.querySelector('[data-apply]'),status=host.querySelector('[role=status]');let preview;
 check.onclick=async()=>{check.disabled=true;apply.hidden=true;try{preview=await prepareWardaniTransfer(getNode);if(preview.oldUid===session.user.uid)throw Error('Gunakan akun Administrator selain akun lama.');status.textContent=`Siap: akun baru mendapat Guru Mapel dan Guru Wali SD; ${preview.records} rekaman terkait dialihkan tanpa menghapus isinya.`;apply.hidden=false;}catch(e){status.textContent=e.message;}finally{check.disabled=false;}};
 apply.onclick=async()=>{apply.disabled=true;try{const plan=await prepareWardaniTransfer(getNode);if(plan.oldUid!==preview.oldUid||plan.newUid!==preview.newUid)throw Error('Identitas akun berubah; periksa ulang.');await bulkPatchRoot({...plan.patch,[`settings/accountTransfers/${plan.oldUid}`]:{toUid:plan.newUid,staffId:STAFF,at:Date.now(),by:session.user.uid,records:plan.records}},session.user.uid,'wardani-account-transfer');const [old,next]=await Promise.all([getNode(`users/${plan.oldUid}`),getNode(`users/${plan.newUid}`)]);if(!old.accessRevoked||next.staffId!==STAFF)throw Error('Verifikasi belum lengkap.');status.textContent='Pengalihan berhasil. Akun baru terhubung ke Wardani SD dan akun lama tidak dapat mengakses aplikasi. Login lama di Firebase Auth belum dihapus.';apply.hidden=true;}catch(e){status.textContent=e.message;}finally{apply.disabled=false;}};
}
