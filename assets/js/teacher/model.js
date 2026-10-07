import {GEMA_ATTENDANCE_NOTE} from './gema-attendance.js';
import {quranLessonSchedules,groupLessonSchedules,teachingTargetFields} from './group-schedules.js';
// Rules adapted from fajrulislam Guru v204/v197/v53; all references are Madani IDs.
export const TIMEZONE='Asia/Makassar';
export const DAYS=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
export function localClock(now=new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  const date=`${p.year}-${p.month}-${p.day}`;
  return {date,minutes:Number(p.hour)*60+Number(p.minute),time:`${p.hour}:${p.minute}`,day:DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]};
}
export const minutes=v=>{const m=String(v||'').match(/^(\d{1,2})[:.](\d{2})$/);return m&&+m[1]<24&&+m[2]<60?+m[1]*60+(+m[2]):NaN;};
export const staffId=ctx=>ctx.session.profile.staffId||ctx.session.user.uid;
export function teacherSchedules(ctx) {
  if(ctx.session.activeRole==='mentor_tahsin_tahfiz')return quranLessonSchedules(ctx);
  const p=ctx.session.profile,master=ctx.master;
  const classes=(master.classes||[]).filter(c=>(!p.classIds?.length||p.classIds.includes(c.id))&&(!p.unitIds?.length||p.unitIds.includes(c.unitId)));
  const allowed=new Set(classes.map(c=>c.id));
  // Empty scope must not silently grant every class to a teacher.
  const scoped=!!(p.classIds?.length||p.unitIds?.length||p.subjectIds?.length);
  const schedules=(master.academicSchedules||[]).filter(s=>!s.isExample&&!String(s.id||'').startsWith('example-')&&!(ctx.session.activeRole==='guru_mapel'&&/tahsin|tahfi[dz]|mutqin|ziyadah|muraja|muroja/i.test((master.subjects||[]).find(x=>x.id===s.subjectId)?.name||s.activityName||''))&&s.status!=='inactive'&&(!s.academicYearId||s.academicYearId===ctx.yearId)&&allowed.has(s.classId)&&(!p.subjectIds?.length||p.subjectIds.includes(s.subjectId))&&((s.staffId||s.teacherStaffId)?(s.staffId||s.teacherStaffId)===staffId(ctx):scoped));
  const result=schedules.map(s=>({...s,unitId:s.unitId||classes.find(c=>c.id===s.classId)?.unitId||'',day:s.day==='Ahad'?'Minggu':s.day,assignmentConfirmed:s.teacherAssignmentStatus==='needs_review'?false:!!(s.staffId||s.teacherStaffId||(p.classIds?.length&&p.subjectIds?.length))}));
  const sessions=new Map();for(const s of result){const id=s.teachingSessionId||s.id;if(!sessions.has(id))sessions.set(id,{...s,id,classIds:s.combinedClassIds||[s.classId]});}
  return mergeConsecutiveSchedules([...sessions.values(),...groupLessonSchedules(ctx)]);
}
// Keep the first source ID as the canonical session ID; never rewrite timetable/history.
export function mergeConsecutiveSchedules(rows){
 const groups=new Map();
 for(const row of rows){const key=JSON.stringify([row.academicYearId||'',row.day,row.unitId||'',row.staffId||row.teacherStaffId||'',row.subjectId,row.groupId||'',[...(row.classIds||[row.classId])].sort(),row.assignmentConfirmed,row.teacherAssignmentStatus||'']);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const result=[];
 for(const rows of groups.values()){
  rows.sort((a,b)=>minutes(a.startTime)-minutes(b.startTime)||String(a.id).localeCompare(String(b.id)));let previous=null;
  for(const row of rows){const ids=row.sourceScheduleIds||[row.id];if(previous&&Number.isFinite(minutes(row.startTime))&&minutes(previous.endTime)===minutes(row.startTime)&&minutes(row.endTime)>minutes(row.startTime)){previous.endTime=row.endTime;previous.sourceScheduleIds.push(...ids);previous.slotCount=previous.sourceScheduleIds.length;}else{previous={...row,sourceScheduleIds:[...ids],slotCount:ids.length};result.push(previous);}}
 }
 return result.sort((a,b)=>DAYS.indexOf(a.day)-DAYS.indexOf(b.day)||minutes(a.startTime)-minutes(b.startTime)||String(a.id).localeCompare(String(b.id)));
}
export function attendanceForSchedule(records,schedule){return (schedule.sourceScheduleIds||[schedule.id]).map(id=>records?.[id]).find(Boolean)||null;}
export const assignmentKey=s=>`${s.groupId?'group-'+s.groupId:s.classIds?.length>1?[...s.classIds].sort().join('+'):s.classId}__${s.subjectId}`;
export function assignments(schedules) {const map=new Map();for(const s of schedules){const key=assignmentKey(s);if(!map.has(key))map.set(key,{...s,id:key,days:[]});const a=map.get(key);if(!a.days.includes(s.day))a.days.push(s.day);}return [...map.values()];}
export function meetingDates(year,semester,days,holidays=[]) {
  const start=`${year+(semester===2?1:0)}-${semester===2?'01':'07'}-01`,end=`${year+(semester===2?1:0)}-${semester===2?'06-30':'12-31'}`;
  const result=[];for(let d=new Date(`${start}T12:00:00Z`);d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1)){const date=d.toISOString().slice(0,10);if(days.includes(DAYS[d.getUTCDay()])&&!holidays.includes(date))result.push(date);}return result;
}
export function calendarBreaks(calendar, schedule, year) {
  const dates=new Set(),limitStart=`${year}-07-01`,limitEnd=`${year+1}-06-30`;
  for(const r of Object.values(calendar||{})){
    if(!r||r.status==='inactive'||r.active===false)continue;
    const mode=r.effectMode||(r.isHoliday||/libur|cuti|ujian|asesmen|sumatif|semester|triwulan|wisuda|kunjungan|pulang|ramadhan|idul|maulid|isra|natal|tahun baru/i.test(`${r.title||''} ${r.type||''}`)?'all':'none');
    if(mode==='none'||(r.unitId&&r.unitId!==schedule.unitId))continue;
    const affected=r.affectedClassIds||r.affectedClasses||[];
    if(mode!=='all'&&!affected.includes(schedule.classId))continue;
    const start=String(r.startDate||r.date||'').slice(0,10),end=String(r.endDate||r.date||start).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))continue;
    for(let d=new Date(`${start<limitStart?limitStart:start}T12:00:00Z`);Number.isFinite(+d)&&d.toISOString().slice(0,10)<=end&&d.toISOString().slice(0,10)<=limitEnd;d.setUTCDate(d.getUTCDate()+1))dates.add(d.toISOString().slice(0,10));
  }
  return [...dates];
}
export function distanceMeters(a,b,c,d){const rad=x=>x*Math.PI/180,q=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 6371000*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
export function verifyLocation(coords,zone) {
  if(!zone||zone.active===false||zone.status==='inactive'||![zone.latitude,zone.longitude,zone.radiusMeter].every(x=>x!==null&&x!==''&&Number.isFinite(Number(x)))||Math.abs(+zone.latitude)>90||Math.abs(+zone.longitude)>180||+zone.radiusMeter<=0)throw Error('Lokasi absensi Madani belum dikonfigurasi. Hubungi administrator.');
  if(!coords||![coords.latitude,coords.longitude,coords.accuracy].every(Number.isFinite)||coords.accuracy<0)throw Error('GPS belum memberikan koordinat yang valid.');
  const distance=distanceMeters(coords.latitude,coords.longitude,+zone.latitude,+zone.longitude),tolerance=Math.min(Math.max(coords.accuracy,35),350),effective=Math.max(0,distance-tolerance-60);
  if(effective>+zone.radiusMeter)throw Error(`Anda berada di luar zona ${zone.name||'Madani'}. Jarak ${Math.round(distance)} m, radius ${zone.radiusMeter} m.`);
  return {latitude:coords.latitude,longitude:coords.longitude,accuracy:Math.round(coords.accuracy),distance:Math.round(distance),effectiveDistance:Math.round(effective),radiusMeter:+zone.radiusMeter,locationId:zone.id||'campus',locationName:zone.name||'Madani'};
}
export const isQuran=name=>/tahsin|tahfi[dz]|qur.?an|muraja|muroja|mutqin/i.test(name||'');
export function attendancePoints(status,quran=false){return status==='Hadir'?(quran?40:30):status==='Terlambat'?-20:status==='Alfa'?-40:0;}
export function learningTransition(previous,input,{roster,schedule,date,actor,subjectName,targets=[]}) {
  if(!roster.length)throw Error('Rombel belum memiliki santri.');
  const rows=input.students||{},old=previous?.students||{};
  const final=!!previous,locked=previous?.stage==='FINAL';
  if(Object.keys(rows).some(id=>!roster.some(s=>s.id===id)))throw Error('Santri di luar rombel.');
  if(!isQuran(subjectName)&&targets.length&&!input.materialIds?.length)throw Error('Target materi tersedia. Pilih materi yang diajarkan.');
  if((input.materialIds||[]).some(id=>!targets.some(t=>t.id===id)))throw Error('Materi bukan milik pelajaran ini.');
  const students={};
  for(const s of roster){
    if(s.attendanceManagedBy==='GEMA'){students[s.id]={studentId:s.id,attendanceManagedBy:'GEMA',attendanceNote:GEMA_ATTENDANCE_NOTE,status:null,statusAwal:null,score:null,points:0};continue;}
    const row=rows[s.id];if(!row)throw Error('Lengkapi kehadiran seluruh santri.');const statusAwal=old[s.id]?.statusAwal||row.status;
    let status=locked?old[s.id]?.status:final&&statusAwal!=='Belum Hadir'?statusAwal:row.status;
    const allowed=final?['Hadir','Terlambat','Alfa','Izin','Sakit']:['Hadir','Belum Hadir','Izin','Sakit'];
    if(!allowed.includes(status)||(final&&statusAwal==='Belum Hadir'&&status==='Hadir'))throw Error('Tentukan status akhir santri yang belum hadir: Terlambat, Alfa, Izin, atau Sakit.');
    const score=row.score===null||row.score===''||row.score===undefined?null:Number(row.score);
    if(score!==null&&(!Number.isFinite(score)||score<0||score>100))throw Error('Nilai harian harus 0–100.');
    students[s.id]={studentId:s.id,statusAwal,status,score,points:attendancePoints(status,isQuran(subjectName))};
  }
  return {...previous,academicYearId:schedule.academicYearId,scheduleId:schedule.id,...teachingTargetFields(schedule),subjectId:schedule.subjectId,staffId:actor.staffId,teacherUid:actor.uid,date,stage:final?'FINAL':'AWAL',students,materialIds:input.materialIds||[],note:input.note||'',version:(previous?.version||0)+1};
}
export const ASSESSMENTS={
 tahfiz:{label:'Tahfiz Al-Qur’an',components:[['Lisan',80],['Tulisan',20]]},
 kitab_tanpa_praktek:{label:'Pelajaran Kitab tanpa Praktek',components:[['Lisan',40],['Tulisan',40],['Tashnif',20]]},
 kitab_dengan_praktek:{label:'Pelajaran Kitab dengan Praktek',components:[['Lisan',30],['Tulisan',25],['Praktek',25],['Tashnif',20]]},
 bahasa_arab:{label:'Bahasa Arab',components:[['Lisan',50],['Tulisan',50]]},
 tahsin_level_1:{label:'Tahsin Level 1',components:[['Praktek',100]]},
 tahsin_level_2:{label:'Tahsin Level 2',components:[['Lisan',50],['Tulisan',30],['Tashnif',20]]},
 tahsin_level_3:{label:'Tahsin Level 3',components:[['Praktek',100]]}
};
export function weightedScore(schema,values){const components=ASSESSMENTS[schema]?.components;if(!components)throw Error('Pilih skema penilaian.');if(components.some(([id])=>values[id]===''||values[id]===null||values[id]===undefined))return null;let total=0;for(const [id,weight]of components){const value=Number(values[id]);if(!Number.isFinite(value)||value<0||value>100)throw Error('Nilai harus 0–100.');total+=value*weight/100;}return Math.round(total*100)/100;}
export function tahsinScore(values){if(values.length!==4||values.some(x=>!Number.isInteger(x)||x<1||x>4))throw Error('Isi empat indikator tahsin pada skala 1–4.');const score=Math.round(values.reduce((a,b)=>a+b,0)/16*100);return {score,quality:score>=90?'MUMTAZ':score>=80?'JAYYID JIDDAN':score>=70?'JAYYID':score>=60?'MAQBUL':'BIMBINGAN'};}
export function tahfizQuality(errors){if(!Number.isInteger(errors)||errors<0)throw Error('Lahn jali harus bilangan bulat minimal 0.');return errors===0?'MUMTAZ':errors<=2?'JAYYID JIDDAN':errors<=4?'JAYYID':errors<=6?'MAQBUL':'BIMBINGAN';}
