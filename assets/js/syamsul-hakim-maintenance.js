// Scoped, manually opened maintenance surface. Loading this page never writes.
import {requireAdmin} from './auth.js';
import {getNode,getCurrentAcademicYearId,bulkPatchRoot} from './repository.js';
import {filterScopedStudents} from './role-experience.js';
import {TARGET_UID as uid,TARGET_STAFF as staffId,REQUESTED as requested,prepareSyamsulMaintenance,same} from './syamsul-hakim-maintenance-model.js';
const status=document.querySelector('#status'),audit=document.querySelector('#audit');
const norm=x=>String(x||'').trim().toUpperCase();
async function inspect(){
 const session=await requireAdmin();
 const year=await getCurrentAcademicYearId();
 const [profile,staff,students,users,classes,oldStaff]=await Promise.all([
  getNode(`users/${uid}`),getNode(`staff/${staffId}`),getNode('students'),getNode('users'),getNode('classes'),getNode('staff/AMD-SDM-0033')
 ]);
 if(profile?.email!=='hakim@madani.app'||profile?.staffId!==staffId||profile.active===false||profile.accessRevoked)throw Error('Identitas/status akun target berubah. Tidak dapat melanjutkan.');
 if(norm(staff?.name)!=='SYAMSUL HAKIM'||staff.status==='inactive')throw Error('Identitas SDM target tidak cocok.');
 if(year!=='TA-2026-2027-GANJIL')throw Error(`Tahun aktif berubah: ${year}. Periksa dahulu.`);
 const rows=[];
 for(const [expectedId,name,nisn] of requested){
  const matches=Object.entries(students||{}).filter(([,s])=>String(s.nisn||'')===nisn||norm(s.name)===norm(name));
  const id=students?.[expectedId]?expectedId:matches.length===1?matches[0][0]:expectedId;
  const student=students?.[id]||null;
  const [mentor,classAssignment,history]=await Promise.all([
   getNode(`assignments/mentors/${year}/${id}`),getNode(`assignments/classes/${year}/${id}`),getNode(`boarding/mentoring/${year}/${id}`)
  ]);
  rows.push({expectedId,id,name,nisn,student,mentor,classAssignment,history,matches:matches.map(([id,s])=>({id,name:s.name,nisn:s.nisn,mergedInto:s.mergedInto||null}))});
 }
 const report={year,account:{uid,email:profile.email,name:profile.name,staffId,roles:profile.roles,role:profile.role,defaultRole:profile.defaultRole,guruWali:profile.roleScopes?.guru_wali||null},students:rows.map(r=>({id:r.id,requested:r.name,foundName:r.student?.name||null,nisn:r.student?.nisn||null,status:r.student?.status||null,mergedInto:r.student?.mergedInto||null,matches:r.matches,mentor:r.mentor,classAssignment:r.classAssignment,historyCount:Object.keys(r.history||{}).length})),previousMentorAccounts:Object.entries(users||{}).filter(([,p])=>p.staffId==='AMD-SDM-0033').map(([id,p])=>({id,name:p.name,email:p.email,active:p.active,scope:p.roleScopes?.guru_wali||null})),classXI:Object.entries(classes||{}).filter(([,c])=>c.unitId==='UNIT-SMK'&&norm(c.name)==='XI TJKT').map(([id,c])=>({id,name:c.name,status:c.status}))};
 audit.replaceChildren();
 const line=value=>{const p=document.createElement('p');p.textContent=value;audit.append(p);};
 line('Tahun: '+year+' · Akun: '+profile.name+' · '+profile.email+' · Role: '+JSON.stringify(profile.roles));
 for(const r of report.students){
  const h=document.createElement('h2');h.textContent=r.requested;audit.append(h);
  line('ID: '+r.id+' · Nama server: '+r.foundName+' · NISN: '+r.nisn+' · Status: '+r.status+' · Digabung ke: '+r.mergedInto);
  line('Kecocokan: '+JSON.stringify(r.matches));
  line('Guru Wali saat ini: '+JSON.stringify(r.mentor));
  line('Penempatan kelas: '+JSON.stringify(r.classAssignment)+' · Riwayat mentoring: '+r.historyCount);
 }
 for(const p of report.previousMentorAccounts){line('Akun mentor sebelumnya: '+p.id+' · '+p.name+' · '+p.email);line('Scope sebelumnya: '+JSON.stringify(p.scope));}
 line('Kelas XI TJKT: '+JSON.stringify(report.classXI));
 status.textContent='Pemeriksaan server selesai. Belum ada perubahan data.';
 return {session,year,profile,staff,students,users,classes,oldStaff,rows};
}
async function init(){
 const initial=await inspect();
 const plan=prepareSyamsulMaintenance(initial,initial.session.user.uid,Date.now());
 const actions=document.querySelector('#actions');
 const summary=document.createElement('p');
 summary.textContent=`Siap disimpan: tambah Guru Wali pada hakim@madani.app; lima santri menjadi binaan Syamsul Hakim. ${plan.restored.length?'Pulihkan Abdul Rohim pada ID lama AMD-SMK-0001 dengan NISN 0085862261 dan penempatan XI TJKT yang sudah ada. ':''}Empat santri dialihkan dari Huril Iptihani; Habiburohman dan Joni Saputra tetap binaan Huril. Guru Mapel, jadwal, keuangan dan riwayat dipertahankan.`;
 actions.append(summary);
 const button=document.createElement('button');button.className='btn btn-primary';button.textContent='Simpan Guru Wali dan Lima Santri';actions.append(button);
 button.disabled=!Object.keys(plan.changes).length;
 if(button.disabled)status.textContent='Penugasan sudah selaras. Tidak ada perubahan yang diperlukan.';
 button.onclick=async()=>{
  button.disabled=true;
  try{
   status.textContent='Memeriksa ulang data server sebelum menyimpan…';
   const current=await inspect();
   const next=prepareSyamsulMaintenance(current,current.session.user.uid,Date.now());
   // Re-read every changed path immediately before a narrow atomic update.
   const checks=await Promise.all(Object.entries(next.before).map(async([path,value])=>{if(!same(await getNode(path),value))throw Error('Data berubah selama pemeriksaan: '+path);}));
   void checks;
   const backupId='syamsul-hakim-mentor-'+Date.now();
   next.changes[`settings/accountMaintenance/${backupId}`]={at:Date.now(),actorUid:current.session.user.uid,targetUid:uid,studentIds:next.ids,previous:Object.entries(next.before).map(([path,value])=>({path,value}))};
   status.textContent='Menyimpan role dan lima penugasan secara bersamaan…';
   await bulkPatchRoot(next.changes,current.session.user.uid,backupId);
   const saved=await inspect();
   const profile={...saved.profile,...saved.profile.roleScopes?.guru_wali};
   const visible=filterScopedStudents({students:Object.entries(saved.students).map(([id,s])=>({id,...s})),mentorAssignments:Object.fromEntries(saved.rows.map(r=>[r.id,r.mentor])),classes:Object.entries(saved.classes).map(([id,c])=>({id,...c})),classAssignments:Object.fromEntries(saved.rows.map(r=>[r.id,r.classAssignment]))},profile,'guru_wali');
   if(!next.ids.every(id=>visible.some(s=>s.id===id))||!saved.profile.roles?.includes('guru_wali'))throw Error('Penyimpanan selesai, tetapi daftar Guru Wali belum terverifikasi lengkap.');
   if(!same(current.profile.roleScopes?.guru_mapel,saved.profile.roleScopes?.guru_mapel)||current.profile.role!==saved.profile.role||current.profile.defaultRole!==saved.profile.defaultRole)throw Error('Periksa ulang scope Guru Mapel.');
   if(!current.rows.every(r=>same(r.history,saved.rows.find(s=>s.id===r.id)?.history)&&same(r.classAssignment,saved.rows.find(s=>s.id===r.id)?.classAssignment)))throw Error('Riwayat/penempatan berubah saat verifikasi; periksa ulang.');
   const heading=document.createElement('h2');heading.textContent='Binaan yang terbaca pada role Guru Wali Syamsul';actions.append(heading);
   for(const id of next.ids){const p=document.createElement('p');p.textContent=visible.find(s=>s.id===id).name+' · '+id;actions.append(p);}
   status.textContent='TERSIMPAN DAN TERVERIFIKASI: Guru Wali aktif, 5 dari 5 santri terbaca di akun Syamsul Hakim. Guru Mapel dan riwayat tetap utuh.';
   button.textContent='Tersimpan · 5 santri terverifikasi';
  }catch(error){status.textContent='Perlu pemeriksaan: '+error.message;button.disabled=false;}
 };
}
init().catch(error=>{status.textContent='Pemeriksaan gagal: '+error.message;});
