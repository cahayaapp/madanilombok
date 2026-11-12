import {requireAdmin} from './auth.js';
import {getNode,getCurrentAcademicYearId} from './repository.js';
import {db} from './firebase.js';
import {ref,set,update,onValue,get} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {teacherSchedules,calendarBreaks} from './teacher/model.js';
import {buildLiveSnapshot} from './live-model.js';
import {campusClock} from './live-prayer.js';
const $=id=>document.getElementById(id),ROOT='madani_app',PUBLIC='madani_live/current';
let session,master,year,sources={},ready=new Set(),unsubscribers=[],running=false,busy=false,again=false,offset=0,lastSnapshot,day,refreshTimer,publishTimer,debounce;
const sourcePaths={quran:'academic/quran_records',learning:'academic/learning_sessions',teacherAttendance:'academic/teaching_attendance',legacyTeachers:'academic/teacher_attendance',legacyStudents:'academic/student_attendance',teacherLeaves:'academic/teacher_leaves'};
const now=()=>new Date(Date.now()+offset);
const status=message=>$('studioStatus').textContent=message;
function stopWatch(){unsubscribers.splice(0).forEach(stop=>stop());clearTimeout(debounce);ready.clear();}
async function loadMaster(){
 const result=await Promise.all(['students','staff','users','classes','groups','units','subjects','schedules/academic','schedules/daily',`assignments/classes/${year}`,`assignments/groups/${year}`].map(getNode));
 const list=v=>Object.entries(v||{}).map(([id,r])=>({id,...r}));
 return {students:list(result[0]),staff:list(result[1]),users:list(result[2]),classes:list(result[3]),groups:list(result[4]),units:list(result[5]),subjects:list(result[6]),academicSchedules:list(result[7]).filter(s=>s.status!=='inactive'),dailySchedules:list(result[8]).filter(s=>s.status!=='inactive'),classAssignments:result[9]||{},groupAssignments:result[10]||{}};
}
function scheduledTeachers(at){
 const c=campusClock(at),dayName=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(c.date+'T12:00:00Z').getUTCDay()],result=[];
 for(const person of master.staff){
  if(person.status==='inactive')continue;
  const profiles=master.users.filter(u=>u.staffId===person.id&&u.active!==false&&!u.accessRevoked);
  for(const profile of profiles){
   const roles=new Set([profile.role,...(Array.isArray(profile.roles)?profile.roles:Object.keys(profile.roles||{}).filter(k=>profile.roles[k])),...Object.keys(profile.roleFlags||{}).filter(k=>profile.roleFlags[k])]);
   for(const role of ['guru_mapel','mentor_tahsin_tahfiz']){
    if(!roles.has(role))continue;
    const p={...profile,...profile.roleScopes?.[role]},ctx={yearId:year,master,session:{profile:p,activeRole:role,user:{uid:profile.id}}};
    for(const s of teacherSchedules(ctx)){
     if(s.day!==dayName||s.isExample||!s.assignmentConfirmed||s.status==='inactive'||s.academicYearId&&s.academicYearId!==year)continue;
     const academicYear=+c.date.slice(0,4)-(+c.date.slice(5,7)<7?1:0);
     if(calendarBreaks(sources.calendar||{},s,academicYear).includes(c.date))continue;
     const match=/^(\d{1,2})[:.](\d{2})$/.exec(s.startTime||'');if(!match)continue;
     const unit=master.units.find(u=>u.id===s.unitId)?.name;
     result.push({id:person.id,startMinute:+match[1]*60+(+match[2]),label:role==='mentor_tahsin_tahfiz'?'Pembina Tahfiz':unit||'Guru Mapel'});
    }
   }
  }
 }
 return result;
}
function drawPreview(snapshot){
 $('studioCounts').replaceChildren(...[['quran','Santri halaqah'],['teachers','Guru terjadwal'],['students','Santri aktif']].map(([key,label])=>{const box=document.createElement('div'),value=document.createElement('b');value.textContent=snapshot[key].total;box.append(value,document.createTextNode(label));return box;}));
 const preview=$('studioPreview');preview.replaceChildren();
 const labels={submitted:'Sudah setoran',pending:'Belum tercatat',present:'Hadir',excused:'Izin',sick:'Sakit',absent:'Alfa',missing:'Belum absen',upcoming:'Belum waktunya'};
 for(const [key,title]of [['quran','Setoran Al-Qur’an'],['teachers','Guru dan pembina'],['students','Santri']]){
  const h=document.createElement('h3');h.textContent=title;preview.append(h);
  for(const r of snapshot[key].rows){const p=document.createElement('p');p.textContent=`${r.name} · ${r.label} · ${labels[r.status]}`;preview.append(p);}
 }
}
function prepare(){
 if(ready.size!==Object.keys(sourcePaths).length+2)return null;
 const snapshot=buildLiveSnapshot({master,sources,scheduledTeachers:scheduledTeachers(now()),now:now()});drawPreview(snapshot);
 $('startBroadcast').disabled=running||!$('publishNames').checked;return snapshot;
}
async function publish(){
 if(!running)return;if(busy){again=true;return;}busy=true;
 try{
  const clock=campusClock(now());
  if(clock.date!==day){await connectSources();return;}
  const snapshot=prepare();if(!snapshot){status('Menunggu seluruh sumber data hari ini. Ringkasan parsial tidak disiarkan.');return;}
  await set(ref(db,PUBLIC),snapshot);lastSnapshot=snapshot;
  status('Siaran aktif · nama dan status hari ini tersinkronisasi.');$('studioError').textContent='';$('studioLog').textContent=`Terakhir tersimpan: ${campusClock(now()).time} WITA · pemeriksaan otomatis setiap 30 detik.`;
 }catch(error){$('studioError').textContent='Sinkronisasi belum berhasil: '+error.message;status('Sinkronisasi tertunda. Layar TV akan menandai data yang belum diperbarui.');}
 finally{busy=false;if(again){again=false;debounce=setTimeout(publish,1200);}}
}
async function connectSources(){
 stopWatch();sources={};day=campusClock(now()).date;
 const paths={...Object.fromEntries(Object.entries(sourcePaths).map(([k,p])=>[k,`${p}/${year}`])),boarding:`boarding/program_attendance/${year}/${day}`,calendar:'parent/calendar'};
 for(const [key,path]of Object.entries(paths))unsubscribers.push(onValue(ref(db,`${ROOT}/${path}`),snap=>{
  sources[key]=snap.val()||{};ready.add(key);clearTimeout(debounce);
  debounce=setTimeout(()=>{try{const prepared=prepare();if(prepared&&!running)status('Pratinjau siap. Belum ada data yang dipublikasikan dari tab ini.');if(running)publish();}catch(error){$('studioError').textContent=error.message;}},1200);
 },error=>{ready.delete(key);$('startBroadcast').disabled=true;$('studioError').textContent='Sumber data gagal dimuat: '+error.message;}));
}
async function init(){
 session=await requireAdmin();if(!session.roles.some(r=>['admin','super_admin'].includes(r)))throw Error('Studio siaran khusus administrator.');
 offset=Number((await get(ref(db,'.info/serverTimeOffset'))).val())||0;
 year=await getCurrentAcademicYearId();if(!year)throw Error('Tahun ajaran aktif belum ditetapkan.');master=await loadMaster();
 status('Memuat sumber presensi dan setoran hari ini…');await connectSources();
 $('publishNames').onchange=()=>{$('startBroadcast').disabled=running||!$('publishNames').checked||ready.size!==Object.keys(sourcePaths).length+2;};
 $('startBroadcast').onclick=async()=>{if(!$('publishNames').checked||running)return;running=true;$('startBroadcast').disabled=true;$('publishNames').disabled=true;$('stopBroadcast').disabled=false;status('Mengaktifkan siaran publik…');await publish();};
 $('stopBroadcast').onclick=async()=>{
  $('stopBroadcast').disabled=true;running=false;clearTimeout(debounce);
  try{if(busy)throw Error('Penyimpanan sedang berlangsung. Coba hentikan kembali sesaat lagi.');if(lastSnapshot)await update(ref(db,PUBLIC),{enabled:false});status('Siaran dihentikan. Data tidak dapat dibaca dari halaman publik.');$('studioLog').textContent='Siaran dinonaktifkan oleh administrator.';$('publishNames').disabled=false;prepare();}
  catch(error){$('studioError').textContent=error.message;$('stopBroadcast').disabled=false;}
 };
 refreshTimer=setInterval(async()=>{try{const nextYear=await getCurrentAcademicYearId();if(!nextYear)throw Error('Tahun ajaran aktif belum tersedia.');if(nextYear!==year){year=nextYear;master=await loadMaster();await connectSources();}else{master=await loadMaster();if(running)publish();}}catch(error){$('studioError').textContent='Master belum dapat diperbarui: '+error.message;}},300000);
 publishTimer=setInterval(()=>{if(running)publish();else if(campusClock(now()).date!==day)connectSources();},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running)publish();});
 window.addEventListener('pagehide',()=>{stopWatch();clearInterval(refreshTimer);clearInterval(publishTimer);});
}
init().catch(error=>{status('Studio belum tersedia.');$('studioError').textContent=error.message;});
