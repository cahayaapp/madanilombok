import {groupTeacherIds} from '../group-teachers.js';
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
