import {teachingGroups,groupTeacherIds} from '../group-teachers.js';
const days=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
export function groupLessonSchedules(ctx){
 if(ctx.session.activeRole!=='guru_mapel'||!ctx.session.profile.staffId)return [];
 const m=ctx.master,id=ctx.session.profile.staffId;
 return (m.groups||[]).filter(g=>g.status!=='inactive'&&g.programType==='arabic'&&g.teachingEnabled&&groupTeacherIds(g).includes(id)).flatMap(g=>{
  const s=(m.dailySchedules||[]).find(s=>s.id===g.dailyScheduleId&&s.status!=='inactive'&&s.academicYearId===ctx.yearId),subject=(m.subjects||[]).find(s=>s.id===g.subjectId&&s.status!=='inactive');
  if(!s||!subject||!s.startTime||!s.endTime)return [];
  const teachingDays=s.day==='Setiap Hari'?days:[s.day==='Ahad'?'Minggu':s.day];
  return teachingDays.filter(d=>days.includes(d)).map(day=>({id:`group-${g.id}-${days.indexOf(day)}`,groupId:g.id,classId:null,classIds:[],subjectId:g.subjectId,unitId:g.unitId,day,startTime:s.startTime,endTime:s.endTime,academicYearId:ctx.yearId,teacherStaffId:id,assignmentConfirmed:true,sourceDailyScheduleId:s.id,programId:s.programId,activityName:subject.name,teachingTarget:'group'}));
 });
}
export function teachingTargetFields(s){return s.groupId?{groupId:s.groupId,teachingTarget:'group',classId:null,classIds:[]}:{classId:s.classId,classIds:s.classIds||[s.classId]};}

export function quranLessonSchedules(ctx){
 if(ctx.session.activeRole!=='mentor_tahsin_tahfiz')return [];
 return teachingGroups(ctx.master,ctx.session.profile,'quran').flatMap(g=>(ctx.master.dailySchedules||[]).filter(s=>(s.quranMorning===true||g.gemaProgram===true&&s.participantScope==='boarding_gema'&&s.attendanceRole==='mentor_tahsin_tahfiz')&&s.status!=='inactive'&&s.academicYearId===ctx.yearId).flatMap(s=>(s.day==='Setiap Hari'?days:[s.day==='Ahad'?'Minggu':s.day]).map(day=>({id:`quran-${g.id}-${s.id}-${days.indexOf(day)}`,groupId:g.id,classId:null,classIds:[],subjectId:'MPL-PONDOK-QURAN',day,startTime:s.startTime,endTime:s.endTime,academicYearId:ctx.yearId,teacherStaffId:ctx.session.profile.staffId,assignmentConfirmed:true,sourceDailyScheduleId:s.id,activityName:'Tahsin / Tahfiz',teachingTarget:'group'}))));
}
