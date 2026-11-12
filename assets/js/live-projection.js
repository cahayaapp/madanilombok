// Shared by the scheduled publisher and the optional administrator preview.
import {teacherSchedules,calendarBreaks} from './teacher/model.js';
import {buildLiveSnapshot} from './live-model.js';
import {campusClock} from './live-prayer.js';

export const LIVE_UNITS=['putra','putri','gabungan'];
export function studentUnit(student){
 const gender=String(student.gender||'').trim().toLowerCase();
 if(['l','laki-laki','laki laki','male','putra'].includes(gender))return 'putra';
 if(['p','perempuan','female','putri'].includes(gender))return 'putri';
 return '';
}
function targetUnits(schedule,master){
 const members=(master.students||[]).filter(s=>{
  if(schedule.groupId)return !!master.groupAssignments?.[schedule.groupId]?.[s.id]&&master.groupAssignments[schedule.groupId][s.id]?.status!=='inactive';
  return (schedule.classIds||[schedule.classId]).includes(master.classAssignments?.[s.id]?.classId);
 });
 const sides=new Set(members.filter(s=>s.active!==false&&(!s.status||s.status==='active')&&!s.mergedInto&&!s.deletedAt).map(studentUnit).filter(Boolean));
 if(sides.size)return [...sides];
 const group=master.groups?.find(g=>g.id===schedule.groupId),unitId=schedule.unitId||group?.unitId;
 const label=`${unitId||''} ${group?.name||''} ${master.units?.find(u=>u.id===unitId)?.name||''}`.toLowerCase();
 if(/putri|asrama-pi|asrama_pi/.test(label))return ['putri'];
 if(/putra|asrama-pa|asrama_pa/.test(label))return ['putra'];
 return [];
}
export function scheduledLiveTeachers(master,sources,year,at=new Date()){
 const c=campusClock(at),dayName=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(c.date+'T12:00:00Z').getUTCDay()],result=[];
 for(const person of master.staff||[]){
  if(person.status==='inactive'||person.active===false)continue;
  for(const profile of (master.users||[]).filter(u=>u.staffId===person.id&&u.active!==false&&!u.accessRevoked)){
   const roles=new Set([profile.role,...(Array.isArray(profile.roles)?profile.roles:Object.keys(profile.roles||{}).filter(k=>profile.roles[k])),...Object.keys(profile.roleFlags||{}).filter(k=>profile.roleFlags[k])]);
   for(const role of ['guru_mapel','mentor_tahsin_tahfiz']){
    if(!roles.has(role))continue;
    const p={...profile,...profile.roleScopes?.[role]},ctx={yearId:year,master,session:{profile:p,activeRole:role,user:{uid:profile.id}}};
    for(const s of teacherSchedules(ctx)){
     if(s.day!==dayName||s.isExample||!s.assignmentConfirmed||s.status==='inactive'||s.academicYearId&&s.academicYearId!==year)continue;
     const academicYear=+c.date.slice(0,4)-(+c.date.slice(5,7)<7?1:0);
     if(calendarBreaks(sources.calendar||{},s,academicYear).includes(c.date))continue;
     const match=/^(\d{1,2})[:.](\d{2})$/.exec(s.startTime||'');if(!match)continue;
     result.push({id:person.id,startMinute:+match[1]*60+(+match[2]),units:targetUnits(s,master),label:role==='mentor_tahsin_tahfiz'?'Pembina Tahfiz':master.units?.find(u=>u.id===s.unitId)?.name||'Guru Mapel'});
    }
   }
  }
 }
 return result;
}
export function buildLiveUnits({master,sources,year,now=new Date(),scheduledTeachers=scheduledLiveTeachers(master,sources,year,now)}){
 return Object.fromEntries(LIVE_UNITS.map(unit=>{
  const schedules=unit==='gabungan'?scheduledTeachers:scheduledTeachers.filter(s=>s.units?.includes(unit));
  const staffIds=new Set(schedules.map(s=>s.id));
  const scoped=unit==='gabungan'?master:{...master,students:master.students.filter(s=>studentUnit(s)===unit),staff:master.staff.filter(s=>staffIds.has(s.id))};
  return [unit,{...buildLiveSnapshot({master:scoped,sources,scheduledTeachers:schedules,now}),unit}];
 }));
}
