import {getNode,bulkPatchRoot} from './repository.js';
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function studentClassPatch(pkg,students,classes){
 const patch={};
 for(const row of pkg.students){
  if(!classes[row.classId]||classes[row.classId].unitId!==row.unitId)throw Error('Kelas tidak cocok: '+row.classId);
  const candidates=Object.entries(students).filter(([,s])=>!s.mergedInto&&(row.nisn&&String(s.nisn||'')===row.nisn||norm(s.name)===norm(row.name)));
  if(candidates.length>1)throw Error('Identitas ganda perlu diperiksa: '+row.name);
  let id=candidates[0]?.[0]||row.id,existing=students[id];
  if(existing&&norm(existing.name)!==norm(row.name)&&!(row.nisn&&String(existing.nisn||'')===row.nisn))throw Error('ID sudah dipakai siswa berbeda: '+row.name);
  if(existing&&existing.unitId!==row.unitId)throw Error('Unit siswa berbeda: '+row.name);
  if(existing&&row.nisn&&existing.nisn&&String(existing.nisn)!==row.nisn)throw Error('NISN berbeda: '+row.name);
  if(!existing)patch['students/'+id]={name:row.name,nisn:row.nisn,unitId:row.unitId,status:'active',source:pkg.id};
  else {patch['students/'+id+'/status']='active';if(row.nisn)patch['students/'+id+'/nisn']=row.nisn;}
  patch[`assignments/classes/${pkg.academicYearId}/${id}`]={studentId:id,classId:row.classId,academicYearId:pkg.academicYearId,status:'active',source:pkg.id};
 }
 return patch;
}
export async function renderConfirmedUpdates(host,session){
 host.innerHTML='<h3>Kajian GEMA & Koreksi Peserta Kelas</h3><p>Hudhori: Sabtu 08.30–09.30 seluruh GEMA. Anwar: Jumat 14.00–15.30 Mutqin. Bahtiar: Senin/Selasa 14.00–15.30 Mutqin. Apel transisi: 07.50–08.00 SMP/SMK. Koreksi kelas delapan santri SMK, Dinda dan Akbar SMP tanpa menggandakan identitas yang cocok.</p><button class="btn btn-primary" data-kind="gema-lessons">Terapkan Kajian GEMA & Apel Transisi</button> <button class="btn btn-secondary" data-kind="student-class-corrections">Terapkan Koreksi Peserta SMP/SMK</button><p role="status"></p>';
 for(const b of host.querySelectorAll('button'))b.onclick=async()=>{b.disabled=true;const status=host.querySelector('[role=status]');try{
  const response=await fetch('../seed/imports/'+b.dataset.kind+'.json');if(!response.ok)throw Error('Paket belum tersedia.');const pkg=await response.json();let patch;
  if(pkg.students){const [students,classes]=await Promise.all(['students','classes'].map(getNode));patch=studentClassPatch(pkg,students||{},classes||{});}
  else{
   patch={...pkg.changes};const [staff,users]=await Promise.all(['staff','users'].map(getNode));
   if(staff?.['AMD-SDM-0089']&&norm(staff['AMD-SDM-0089'].name)!==norm('TGH. Hudhori'))throw Error('ID Hudhori sudah dipakai SDM lain.');
   if(!staff?.['AMD-SDM-0009']||!staff?.['AMD-SDM-0012'])throw Error('SDM Anwar/Bahtiar belum tersedia.');
   if(staff?.['AMD-SDM-0089'])delete patch['staff/AMD-SDM-0089'];
   const groups=Object.entries(pkg.changes).filter(([p])=>p.startsWith('groups/')&&p.split('/').length===2).map(([p,g])=>({id:p.split('/')[1],...g}));
   for(const [uid,u]of Object.entries(users||{})){
    const sid=u.email?.toLowerCase()==='hudhori@madani.app'?'AMD-SDM-0089':u.staffId;
    const owned=groups.filter(g=>g.mentorStaffId===sid);if(!owned.length)continue;
    if(u.email?.toLowerCase()==='hudhori@madani.app'&&u.staffId&&u.staffId!==sid)throw Error('Akun Hudhori tertaut SDM berbeda.');
    patch[`users/${uid}/staffId`]=sid;
    patch[`users/${uid}/roleScopes/guru_mapel/groupIds`]=[...new Set([...(u.roleScopes?.guru_mapel?.groupIds||[]),...owned.map(g=>g.id)])];
   }
   const s=pkg.changes['schedules/daily/DS-APEL-TRANSISI'];patch['settings/naqibDuty/programs/DS-APEL-TRANSISI']={programId:s.programId,academicYearId:s.academicYearId,day:s.day,startTime:s.startTime,startMinute:470,shiftId:'shift1'};
  }
  await bulkPatchRoot({...patch,['settings/imports/'+pkg.id]:{appliedAt:Date.now(),appliedBy:session.user.uid}},session.user.uid,pkg.id);status.textContent='Pembaruan berhasil diterapkan. Muat ulang halaman presensi.';
 }catch(e){status.textContent=e.message;}finally{b.disabled=false;}};
}
