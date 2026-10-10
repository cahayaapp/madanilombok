import {naqibProgramKind} from './naqib-program-policy.js';
import {getNode,bulkPatchRoot} from './repository.js';
import {minutes} from './teacher/model.js';
export function dutyUpdatePatch(pkg,staff,users,schedules,programMaster={}){
 pkg=JSON.parse(JSON.stringify(pkg));
 for(const [id,person] of Object.entries(pkg.newStaff||{})){
  const matches=Object.entries(staff).filter(([key,p])=>key!==id&&p.name?.trim().toLowerCase()===person.name.trim().toLowerCase());
  if(matches.length>1)throw Error(`Lebih dari satu SDM bernama ${person.name}. Satukan identitas sebelum menerapkan piket.`);
  if(matches.length===1){const [existingId]=matches[0];pkg.staff[existingId]=pkg.staff[id];delete pkg.staff[id];delete pkg.newStaff[id];}
 }
 const patch={};
 for(const [id,person]of Object.entries(pkg.newStaff)){
  if(staff[id]&&staff[id].name!==person.name)throw Error('ID SDM baru sudah digunakan.');
  if(!staff[id])patch[`staff/${id}`]=person;
 }
 for(const [id,a]of Object.entries(pkg.staff)){
  const person=staff[id]||pkg.newStaff[id];if(!person)throw Error(`SDM ${a.name} belum tersedia.`);
  const scope={genderScope:a.gender,dutyShiftId:a.shiftId};
  if(staff[id]){patch[`staff/${id}/appRoles`]=[...new Set([...(person.appRoles||[]),'naqib'])];patch[`staff/${id}/roleScopes/naqib`]=scope;}
  else patch[`staff/${id}`]={...person,roleScopes:{...person.roleScopes,naqib:scope}};
 }
 // All existing Naqib profiles outside the confirmed roster lose only that role.
 for(const [uid,u]of Object.entries(users)){
  const roles=[...new Set([u.role,...(Array.isArray(u.roles)?u.roles:[]),...Object.keys(u.roleFlags||{}).filter(r=>u.roleFlags[r])].filter(Boolean))];
  const a=pkg.staff[u.staffId];if(!a&&!roles.includes('naqib'))continue;
  const next=a?[...new Set([...roles,'naqib'])]:roles.filter(r=>r!=='naqib');
  patch[`users/${uid}/roles`]=next;patch[`users/${uid}/roleFlags/naqib`]=!!a;
  patch[`users/${uid}/role`]=next.includes(u.role)?u.role:(next[0]||'');
  patch[`users/${uid}/roleScopes/naqib`]=a?{genderScope:a.gender,dutyShiftId:a.shiftId}:null;
  if(!next.length){patch[`users/${uid}/active`]=false;patch[`users/${uid}/accessRevoked`]=true;}
  if(!a&&staff[u.staffId]){patch[`staff/${u.staffId}/appRoles`]=(staff[u.staffId].appRoles||[]).filter(r=>r!=='naqib');patch[`staff/${u.staffId}/disabledAppRoles`]=[...new Set([...(staff[u.staffId].disabledAppRoles||[]),'naqib'])];}
 }
 for(const [id,p]of Object.entries(staff)){if(pkg.staff[id])patch[`staff/${id}/disabledAppRoles`]=(p.disabledAppRoles||[]).filter(r=>r!=='naqib');else if(p.appRoles?.includes('naqib')){patch[`staff/${id}/appRoles`]=p.appRoles.filter(r=>r!=='naqib');patch[`staff/${id}/roleScopes/naqib`]=null;patch[`staff/${id}/disabledAppRoles`]=[...new Set([...(p.disabledAppRoles||[]),'naqib'])];}}
 const programs={};for(const [id,s]of Object.entries(schedules)){
  if(s.status==='inactive'||!naqibProgramKind(s,programMaster[s.programId]))continue;const m=minutes(s.startTime);if(!Number.isFinite(m)||!s.academicYearId||!s.programId||!s.day)continue;
  programs[id]={programId:s.programId,startMinute:m,startTime:s.startTime,shiftId:m<480?'shift1':m<960?'shift2':'shift3',academicYearId:s.academicYearId,day:s.day};
 }
 patch['settings/naqibDuty']={staff:pkg.staff,programs,timezone:'Asia/Makassar',version:pkg.id};
 return patch;
}
export async function renderNaqibDutyUpdate(host,session){
 host.innerHTML='<h3>Piket Naqib & Naqibah</h3><p>Putri: 00.00–08.00 Alfi & Wanda; 08.00–16.00 Anggi & Nurul; 16.00–24.00 Roqyal & Fitrah. Putra: 00.00–08.00 Dai; 08.00–16.00 Nopan; 16.00–24.00 Yusuf. Semua waktu WITA. Presensi/laporan mengikuti program yang telah diterapkan melalui paket Program Presensi Naqib. Program mengikuti jam mulai. Role Naqib putra lainnya dinonaktifkan; role lainnya dipertahankan.</p><button class="btn btn-primary">Terapkan Piket Naqib / Naqibah</button><p role="status"></p><a href="accounts.html">Periksa akun Wanda & Fitrah di Manajemen Akun</a>';
 const b=host.querySelector('button'),status=host.querySelector('[role=status]');b.onclick=async()=>{b.disabled=true;try{
 const response=await fetch('../seed/imports/naqib-duty.json');if(!response.ok)throw Error('Paket piket tidak tersedia.');const pkg=await response.json();
 const [staff,users,schedules,programs]=await Promise.all(['staff','users','schedules/daily','programs'].map(getNode));
 const patch=dutyUpdatePatch(pkg,staff||{},users||{},schedules||{},programs||{});
 await bulkPatchRoot({...patch,[`settings/imports/${pkg.id}`]:{appliedAt:Date.now(),appliedBy:session.user.uid}},session.user.uid,pkg.id);
 status.textContent='Piket dan role berhasil diterapkan. Periksa akun yang belum tersedia di Manajemen Akun. Pengguna perlu memuat ulang aplikasi.';
 }catch(e){status.textContent=e.message;}finally{b.disabled=false;}};
}
