import {naqibProgramKind} from './naqib-program-policy.js';
import {getNode,bulkPatchRoot} from './repository.js';
export async function renderMorningHalaqahUpdate(host,session){
 host.innerHTML='<h3>Halaqah Pagi 07.00–07.50</h3><p>Seluruh halaqah putra/putri termasuk GEMA: Senin Apel Pagi, Sabtu Senam, hari lainnya Tahsin/Tahfiz. Apel dan Senam santri umum dicatat Naqib shift 1. Peserta GEMA ikut presensi Naqib untuk salat, kebersihan, Apel Pagi dan Senam; pelajarannya ditangani guru/pembina. Presensi guru dan santri Tahfiz mengikuti halaqah binaan. Bagian jadwal GEMA setelah 07.50 tetap tersedia; riwayat dipertahankan.</p><button class="btn btn-primary">Terapkan Jadwal Halaqah Pagi</button><p role="status"></p>';
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');button.onclick=async()=>{button.disabled=true;try{
  const response=await fetch('../seed/imports/morning-halaqah.json');if(!response.ok)throw Error('Paket jadwal tidak tersedia.');const pkg=await response.json();
  const [duty,umum,gema]=await Promise.all(['settings/naqibDuty','schedules/daily/DS-2026-UMUM-06','schedules/daily/DS-2026-GEMA-06'].map(getNode));
  if(!duty?.staff)throw Error('Terapkan piket Naqib terlebih dahulu.');
  if(!umum||!gema||umum.startTime!=='07:00'||umum.endTime!=='07:50'||!['07:00','07:50'].includes(gema.startTime)||gema.endTime!=='09:00')throw Error('Jadwal sumber sudah berubah. Periksa ulang sebelum menerapkan.');
  const daily=await getNode('schedules/daily')||{},programs=await getNode('programs')||{};
  for(const [p,v]of Object.entries(pkg.changes))if(p.startsWith('programs/'))programs[p.split('/')[1]]=v;
  const patch={...pkg.changes,'settings/naqibDuty/programs/DS-2026-UMUM-06':null};
  for(const [id,s]of Object.entries(daily))if(s.participantScope==='boarding_gema')patch['settings/naqibDuty/programs/'+id]=null;
  for(const [path,value]of Object.entries(pkg.changes))if(path.startsWith('schedules/daily/')){const [, ,id,field]=path.split('/');if(field)daily[id]={...daily[id],[field]:value};else daily[id]=value;}
  for(const [id,s]of Object.entries(daily))if(s.status!=='inactive'&&naqibProgramKind(s,programs[s.programId])){const [h,m]=s.startTime.split(':').map(Number),minute=h*60+m;patch['settings/naqibDuty/programs/'+id]={programId:s.programId,academicYearId:s.academicYearId,day:s.day,startTime:s.startTime,startMinute:minute,shiftId:minute>=240&&minute<720?'shift1':minute>=720&&minute<1200?'shift2':'shift3'};}
  await bulkPatchRoot({...patch,['settings/imports/'+pkg.id]:{appliedBy:session.user.uid,appliedAt:Date.now()}},session.user.uid,pkg.id);
  status.textContent='Jadwal halaqah pagi berhasil diterapkan. Muat ulang halaman Pembina Tahfiz dan Naqib.';
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
}
