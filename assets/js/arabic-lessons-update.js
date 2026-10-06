import {getNode,bulkPatchRoot} from './repository.js';
export async function renderArabicLessonsUpdate(host,session){
 host.innerHTML='<h3>Bahasa Arab Pagi sebagai Pelajaran</h3><p>Aktifkan enam kelompok Bahasa Arab pada Guru Mapel: presensi guru, absensi santri dua tahap, materi, dan nilai. Peserta tetap memakai anggota kelompok. Jam dan hari mengikuti jadwal 24 jam umum/GEMA.</p><button class="btn btn-primary">Aktifkan Pelajaran Bahasa Arab Pagi</button><p role="status"></p>';
 const b=host.querySelector('button'),status=host.querySelector('[role=status]');b.onclick=async()=>{b.disabled=true;try{
  const r=await fetch('../seed/imports/arabic-group-lessons.json');if(!r.ok)throw Error('Paket Bahasa Arab belum tersedia.');const p=await r.json();
  if(await getNode(`settings/imports/${p.id}`)){status.textContent='Pelajaran Bahasa Arab sudah diaktifkan.';return;}
  for(const [path,value]of Object.entries(p.changes)){
   if(!/^(subjects\/MPL-PONDOK-ARAB-PAGI|groups\/GRP-2026-arabic-[^/]+\/(teachingEnabled|subjectId|dailyScheduleId))$/.test(path))throw Error('Paket tidak valid.');
   if(path.endsWith('/dailyScheduleId')){const [g,s]=await Promise.all([getNode(path.split('/').slice(0,2).join('/')),getNode('schedules/daily/'+value)]);if(!g||g.programType!=='arabic'||!s||s.status==='inactive')throw Error('Terapkan kelompok dan jadwal 24 jam terlebih dahulu.');if(!g.mentorStaffId&&!g.mentorStaffIds?.length)throw Error('Terapkan Konfirmasi Guru & Bahasa Arab terlebih dahulu agar seluruh pengajar tertaut.');}
  }
  await bulkPatchRoot({...p.changes,[`settings/imports/${p.id}`]:{appliedAt:Date.now(),appliedBy:session.user.uid}},session.user.uid,p.id);
  status.textContent='Bahasa Arab pagi aktif sebagai pelajaran kelompok. Muat ulang halaman Guru Mapel.';
 }catch(e){status.textContent=e.message;b.disabled=false;}};
}
