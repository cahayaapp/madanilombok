import {getNode,bulkPatchRoot} from './repository.js';
import {escapeHtml as e} from './utils.js';
const rolesOf=p=>Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k]);
const union=(a,b)=>[...new Set([...(a||[]),...(b||[])])];
const norm=v=>String(v||'').trim().toUpperCase();

// Build only mentor/role patches. Master identities, classes and operational history stay intact.
export async function prepareMentorUpdate(pack,read){
 const changes={},seen=new Set(),staff={},previous={};
 for(const r of pack.records){
  if(seen.has(r.studentId))throw Error(`Siswa ganda dalam paket: ${r.studentName}`);
  seen.add(r.studentId);
  const s=await read(`students/${r.studentId}`);
  if(!s||s.status!=='active'||s.unitId!==pack.unitId||norm(s.name)!==norm(r.studentName))throw Error(`Master siswa berubah atau belum tersedia: ${r.studentName}. Periksa ulang sebelum menerapkan.`);
  if(!staff[r.mentorStaffId]){
   const p=await read(`staff/${r.mentorStaffId}`);
   if(!p||p.status==='inactive'||norm(p.name)!==norm(r.mentorName))throw Error(`SDM belum sesuai: ${r.mentorName}.`);
   staff[r.mentorStaffId]=p;
  }
  const path=`assignments/mentors/${pack.academicYearId}/${r.studentId}`,old=await read(path);
  if(old?.status==='active'&&old.mentorStaffId!==r.mentorStaffId)throw Error(`${r.studentName} sudah memiliki Guru Wali berbeda. Tinjau penugasan tersebut dahulu.`);
  previous[r.studentId]=old||null;
  changes[path]={...old,studentId:r.studentId,academicYearId:pack.academicYearId,unitId:pack.unitId,mentorStaffId:r.mentorStaffId,mentorName:r.mentorName,status:'active',source:pack.source,sourceRow:r.sourceRow,sourceName:r.sourceName,sourceClass:r.sourceClass};
 }
 const users=await read('users')||{},missingAccounts=[];
 for(const [sid,s] of Object.entries(staff)){
  const ids=pack.records.filter(r=>r.mentorStaffId===sid).map(r=>r.studentId);
  changes[`staff/${sid}/appRoles`]=union(s.appRoles,['guru_wali']);
  changes[`staff/${sid}/roleScopes/guru_wali`]={...s.roleScopes?.guru_wali,menteeStudentIds:union(s.roleScopes?.guru_wali?.menteeStudentIds,ids)};
  const accounts=Object.entries(users).filter(([,p])=>p.staffId===sid&&p.active!==false&&p.accessRevoked!==true);
  if(!accounts.length)missingAccounts.push(s.name);
  for(const [uid,p] of accounts){
   changes[`users/${uid}/roles`]=union(rolesOf(p),[p.role,'guru_wali'].filter(Boolean));
   changes[`users/${uid}/roleFlags/guru_wali`]=true;
   changes[`users/${uid}/roleScopes/guru_wali`]={...p.roleScopes?.guru_wali,menteeStudentIds:union(p.roleScopes?.guru_wali?.menteeStudentIds,ids)};
   changes[`users/${uid}/accessVersion`]=(p.accessVersion||0)+1;
  }
 }
 return {changes,previous,missingAccounts};
}

export async function renderMentorUpdate(host,session){
 try{
  const res=await fetch('../seed/imports/smk-mentor-2026-update.json');if(!res.ok)throw Error('Paket Guru Wali belum tersedia.');
  const pack=await res.json();
  host.innerHTML=`<h3>Guru Wali SMK 2026/2027</h3><p>64 siswa · 12 Guru Wali. Sesuai daftar 6 Oktober 2026. Role Guru Wali dan santri binaan disinkronkan pada akun SDM aktif.</p><details><summary>Lihat pembagian dan pencocokan nama</summary><table><thead><tr><th>No</th><th>Nama pada daftar</th><th>Nama master</th><th>Guru Wali</th></tr></thead><tbody>${pack.records.map(r=>`<tr><td>${r.sourceRow}</td><td>${e(r.sourceName)}</td><td>${e(r.studentName)}</td><td>${e(r.mentorName)}</td></tr>`).join('')}</tbody></table></details><p>Daftar SMP terbaru tetap 80 siswa. Habiburrahman, Helga Elvina Irawan, Sujiyana belum tercantum; Atika/Baiq Atika dikonfirmasi satu orang, binaan Ida Fitriana; biodata Baiq Atika dikonfirmasi benar. Gunakan pembaruan Identitas Atika untuk mengarsipkan duplikat.</p><button class="btn btn-primary" data-apply-mentors>Terapkan Guru Wali SMK</button><p role="status"></p>`;
  const button=host.querySelector('[data-apply-mentors]'),status=host.querySelector('[role=status]');
  button.onclick=async()=>{
   button.disabled=true;status.textContent='Memeriksa siswa, SDM dan penugasan terbaru…';
   try{
    if(await getNode(`settings/imports/${pack.id}`)){status.textContent='Pembaruan Guru Wali SMK sudah diterapkan.';return;}
    const {changes,previous,missingAccounts}=await prepareMentorUpdate(pack,getNode);
    changes[`settings/imports/${pack.id}`]={appliedAt:Date.now(),appliedBy:session.user.uid,studentCount:pack.records.length,mentorCount:new Set(pack.records.map(r=>r.mentorStaffId)).size,previousAssignments:previous,missingAccounts};
    await bulkPatchRoot(changes,session.user.uid,pack.id);
    const saved=await getNode(`assignments/mentors/${pack.academicYearId}`)||{};
    if(!pack.records.every(r=>saved[r.studentId]?.mentorStaffId===r.mentorStaffId&&saved[r.studentId]?.status==='active'))throw Error('Pembaruan tersimpan, tetapi verifikasi penugasan belum lengkap. Muat ulang untuk memeriksa.');
    status.textContent=`Berhasil: 64 siswa SMK terhubung ke 12 Guru Wali. Akun guru memuat penugasan saat masuk ulang.${missingAccounts.length?' Akun belum tersedia: '+missingAccounts.join(', ')+'.':''}`;
   }catch(error){status.textContent=error.message;button.disabled=false;}
  };
 }catch(error){host.innerHTML=`<p>${e(error.message)}</p>`;}
}
