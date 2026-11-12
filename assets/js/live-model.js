import {campusClock,endOfCampusDay} from './live-prayer.js';
export const LIVE_BUCKETS={quran:['submitted','pending'],teachers:['present','excused','absent','missing','upcoming'],students:['present','excused','sick','absent','pending']};
export const LIVE_FEED_URL='https://madanilombok-f692d-default-rtdb.firebaseio.com/madani_live/current.json';
const active=r=>r&&r.status!=='inactive'&&r.active!==false&&!r.mergedInto&&!r.deletedAt;
const enrolled=r=>active(r)&&(!r.status||r.status==='active');
const cleanName=s=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,120);
const row=(person,label,status)=>({name:cleanName(person.name),label:cleanName(label).slice(0,100),status});
const byName=(a,b)=>a.name.localeCompare(b.name,'id');
export function records(node,predicate,result=[]){
 if(!node||typeof node!=='object')return result;
 if(predicate(node)){result.push(node);return result;}
 for(const child of Object.values(node))records(child,predicate,result);
 return result;
}
export function normalizeStatus(value){
 const s=String(value||'').toLowerCase().replace(/_/g,' ').trim();
 if(['hadir','terlambat','tepat waktu','masuk'].includes(s))return 'present';
 if(s==='izin')return 'excused';if(s==='sakit')return 'sick';if(['alfa','alpha','tidak hadir'].includes(s))return 'absent';return 'pending';
}
const stamp=r=>Number(r.updatedAt||r.recordedAt||r.createdAt||0);
export function buildLiveSnapshot({master,sources,scheduledTeachers=[],now=new Date()}){
 const {date,minute}=campusClock(now),classes=new Map((master.classes||[]).map(c=>[c.id,c]));
 const students=(master.students||[]).filter(enrolled),studentMap=new Map(students.map(s=>[s.id,s]));
 const label=s=>classes.get(master.classAssignments?.[s.id]?.classId)?.name||'';
 const quranGroups=(master.groups||[]).filter(g=>enrolled(g)&&g.programType!=='arabic'&&g.programType!=='lesson'&&/tahf|tahs|qur|halaq/i.test(`${g.type||''} ${g.name||''}`));
 const quranIds=new Set(quranGroups.flatMap(g=>Object.entries(master.groupAssignments?.[g.id]||{}).filter(([,m])=>m&&m!==false&&m.status!=='inactive').map(([id])=>id)).filter(id=>studentMap.has(id)));
 const submitted=new Set(records(sources.quran,r=>!!r.studentId&&!!r.date).filter(r=>r.date===date&&active(r)&&r.status!=='deleted'&&quranIds.has(r.studentId)).map(r=>r.studentId));
 const quran=[...quranIds].map(id=>row(studentMap.get(id),label(studentMap.get(id)),submitted.has(id)?'submitted':'pending')).sort(byName);
 const latest=new Map();
 const register=(id,r,rank)=>{if(!studentMap.has(id)||r.deletedAt||r.attendanceManagedBy||r.date!==date)return;const status=normalizeStatus(r.status);if(status==='pending')return;const old=latest.get(id),key=stamp(r);if(!old||key>old.key||key===old.key&&rank>old.rank)latest.set(id,{status,key,rank});};
 for(const r of records(sources.learning,r=>!!r.students&&!!r.date)){
  if(r.date!==date||r.deletedAt||r.stage!=='FINAL')continue;
  for(const [id,s]of Object.entries(r.students||{}))register(id,{...r,...s},3);
 }
 for(const r of records(sources.boarding,r=>!!r.studentId&&!!r.date&&!!r.programId))if(r.stage==='FINAL'||!r.stage)register(r.studentId,r,2);
 for(const [classId,days]of Object.entries(sources.legacyStudents||{}))for(const [id,r]of Object.entries(days?.[date]||{}))register(id,{...r,date,classId},1);
 const attendance=students.map(s=>row(s,label(s),latest.get(s.id)?.status||'pending')).sort(byName);
 const attended=new Set(records(sources.teacherAttendance,r=>!!r.staffId&&!!r.date).filter(r=>r.date===date&&!r.deletedAt&&['present'].includes(normalizeStatus(r.status))).map(r=>r.staffId));
 for(const r of records(sources.legacyTeachers,r=>!!r.staffId&&!!r.date))if(r.date===date&&!r.deletedAt&&(r.checkIn||normalizeStatus(r.status)==='present'))attended.add(r.staffId);
 const approved=new Set(records(sources.teacherLeaves,r=>!!r.staffId&&!!r.startDate&&!!r.endDate).filter(r=>r.decision?.status==='approved'&&r.startDate<=date&&r.endDate>=date&&!r.deletedAt).map(r=>r.staffId));
 const absent=new Set();
 for(const r of records(sources.legacyTeachers,r=>!!r.staffId&&!!r.date)){if(r.date!==date||r.deletedAt)continue;const st=normalizeStatus(r.status);if(['excused','sick'].includes(st))approved.add(r.staffId);if(st==='absent')absent.add(r.staffId);}
 const staffMap=new Map((master.staff||[]).filter(enrolled).map(s=>[s.id,s]));
 const schedules=new Map();
 for(const s of scheduledTeachers){if(!staffMap.has(s.id))continue;const old=schedules.get(s.id);if(!old||s.startMinute<old.startMinute)schedules.set(s.id,s);}
 // Include an actual attendance record even when the corresponding timetable was corrected later.
 for(const id of new Set([...attended,...absent]))if(staffMap.has(id)&&!schedules.has(id))schedules.set(id,{id,startMinute:0,label:'Kehadiran tercatat'});
 const teachers=[...schedules.values()].map(s=>row(staffMap.get(s.id),s.label||'Jadwal hari ini',attended.has(s.id)?'present':approved.has(s.id)?'excused':absent.has(s.id)?'absent':s.startMinute>minute?'upcoming':'missing')).sort(byName);
 const section=rows=>({total:rows.length,rows});
 return {version:1,enabled:true,date,updatedAt:now.getTime(),expiresAt:endOfCampusDay(date),quran:section(quran),teachers:section(teachers),students:section(attendance)};
}
export function validateLiveSnapshot(input,now=Date.now()){
 if(!input||input.version!==1||input.enabled!==true||input.date!==campusClock(new Date(now)).date||!Number.isFinite(input.updatedAt)||input.updatedAt>now+60000||!Number.isFinite(input.expiresAt)||input.expiresAt<=now)throw Error('Siaran hari ini belum tersedia.');
 const result={version:1,enabled:true,date:input.date,updatedAt:input.updatedAt,expiresAt:input.expiresAt};
 for(const [section,statuses]of Object.entries(LIVE_BUCKETS)){
  const value=input[section],raw=Array.isArray(value?.rows)?value.rows:Object.values(value?.rows||{});
  if(!value||!Number.isInteger(value.total)||value.total<0||raw.length!==value.total||raw.length>1000)throw Error('Ringkasan siaran belum lengkap.');
  const rows=raw.map(r=>{if(!r||typeof r.name!=='string'||!r.name.trim()||!statuses.includes(r.status))throw Error('Data siaran tidak valid.');return {name:cleanName(r.name),label:cleanName(r.label).slice(0,100),status:r.status};});
  result[section]={total:rows.length,rows};
 }
 return result;
}
export function bucket(snapshot,section,status){return snapshot?.[section]?.rows?.filter(r=>r.status===status)||[];}
