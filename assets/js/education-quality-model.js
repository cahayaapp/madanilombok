import {monitorScope,teachingReportInScope,attendanceSummary,learningRows,teacherMissing,caseHandled} from './leadership-monitor-model.js';
import {mergeConsecutiveSchedules,calendarBreaks} from './teacher/model.js';
export const percent=(n,d)=>d?Math.round(n/d*1000)/10:null;
export function collect(node,predicate,out=[]){if(!node||typeof node!=='object')return out;if(predicate(node)){out.push(node);return out;}Object.values(node).forEach(v=>collect(v,predicate,out));return out;}
export function qualityScope(session,master,gender=''){
 if(session.activeRole!=='head_formal_school')throw Error('Hanya Kepala Sekolah yang dapat membuka kontrol mutu pendidikan.');
 const scope=monitorScope(session,master);scope.students=scope.students.filter(s=>s.status!=='inactive'&&(!gender||s.gender===gender));scope.studentIds=new Set(scope.students.map(s=>s.id));return scope;
}
export function educationQuality({session,master,data={},from,to,gender='',staffId='',studentId='',now=Date.now()}){
 if(!from||!to||from>to||Date.parse(to)-Date.parse(from)>366*86400000)throw Error('Pilih periode valid, maksimal satu tahun.');
 const scope=qualityScope(session,master,gender);
 if(studentId)scope.studentIds=new Set(scope.studentIds.has(studentId)?[studentId]:[]);
 const dated=r=>r.date>=from&&r.date<=to;
 const staff=new Map((master.staff||[]).map(s=>[s.id,s]));
 const teacherScope=r=>teachingReportInScope(r,scope,master)&&(!staffId||r.staffId===staffId||r.teacherStaffId===staffId)&&(!gender||staff.get(r.staffId||r.teacherStaffId)?.gender===gender);
 const schedules=mergeConsecutiveSchedules((master.academicSchedules||[]).filter(s=>s.status!=='inactive'&&!s.isExample&&(!s.academicYearId||s.academicYearId===data.yearId)&&teacherScope(s)));
 const attendance=collect(data.attendance,r=>!!r.scheduleId&&!!r.date).filter(r=>teacherScope(r)&&dated(r));
 const missing=teacherMissing(schedules,attendance,from,to,now).filter(r=>!calendarBreaks(data.calendar||{},r,Number(r.date.slice(0,4))-(Number(r.date.slice(5,7))<7?1:0)).includes(r.date));
 const leaves=collect(data.leaves,r=>!!r.staffId&&!!r.startDate&&!!r.decision).filter(r=>scope.units.includes(r.unitId)&&r.decision.status==='approved');
 const excused=missing.filter(r=>leaves.some(l=>l.staffId===r.staffId&&(l.lessons||[]).some(s=>s.date===r.date&&(s.scheduleId===r.id||(r.sourceScheduleIds||[]).includes(s.scheduleId)))));
 const teacher=attendanceSummary(attendance),teacherTotal=teacher.total+missing.length;
 const sessions=collect(data.learning,r=>!!r.students&&!!r.date).filter(r=>dated(r)&&teachingReportInScope(r,scope,master));
 const formal=learningRows(sessions,scope),boarding=collect(data.boarding,r=>!!r.studentId&&!!r.date).filter(r=>dated(r)&&scope.studentIds.has(r.studentId)&&r.stage==='FINAL');
 const students=attendanceSummary([...formal,...boarding]);
 const cases=collect(data.cases,r=>!!r.studentId&&!!r.status).filter(r=>scope.studentIds.has(r.studentId)&&dated(r));
 // Only proven/finally assessed cases are counted as violations; reports remain cases.
 const violations=cases.filter(r=>r.status!=='tidak_terbukti'&&(r.finalPoints!==undefined||Object.values(r.tabayyunHistory||{}).some(t=>t.conclusion==='TERBUKTI'))&&r.attendanceStatus!=='Terlambat'&&!/terlambat|ketepatan waktu/i.test(r.category||''));
 const categories={};violations.forEach(r=>categories[r.category||'Belum dikategorikan']=(categories[r.category||'Belum dikategorikan']||0)+1);
 const exams=Object.entries(data.exams||{}).flatMap(([owner,records])=>Object.entries(records||{}).map(([examId,r])=>({...r,examId,staffId:r.staffId||owner}))).filter(r=>dated(r)&&r.stage==='FINAL'&&teachingReportInScope(r,scope,master));
 const scores=exams.flatMap(r=>Object.entries(r.students).filter(([id,s])=>scope.studentIds.has(id)&&s.score!==null&&s.score!==''&&s.score!==undefined&&Number.isFinite(Number(s.score))).map(([id,s])=>({studentId:id,examId:r.examId,staffId:r.staffId,score:Number(s.score),kkm:Number(r.kkm??75)})));
 const examined=new Set(scores.map(r=>r.studentId)),passed=[...examined].filter(id=>scores.filter(r=>r.studentId===id).every(r=>r.score>=r.kkm));
 const need=new Set(scores.filter(r=>r.score<=75).map(r=>r.studentId));
 const follow=collect(data.followups,r=>!!r.studentId&&!!r.examId).filter(r=>need.has(r.studentId)&&scores.some(s=>s.studentId===r.studentId&&s.examId===r.examId&&s.staffId===r.staffId&&s.score<=75)&&teachingReportInScope(r,scope,master)&&['Dalam Proses','Selesai'].includes(r.status));
 const mentoring=collect(data.mentoring,r=>!!r.studentId&&!!r.date&&!!r.target).filter(r=>scope.studentIds.has(r.studentId)&&dated(r));
 const latest=new Map();mentoring.forEach(r=>{if(!latest.has(r.studentId)||latest.get(r.studentId).date<r.date)latest.set(r.studentId,r);});
 const character=[...latest.values()].flatMap(r=>Object.values(r.clarification?.answers||{})).map(Number).filter(n=>n>=1&&n<=5);
 const quran=collect(data.quran,r=>!!r.studentId&&!!r.date).filter(r=>scope.studentIds.has(r.studentId)&&dated(r)&&r.type==='Tahfiz'&&r.activity==='Ziyadah');
 const daily=new Map();quran.forEach(r=>{const key=r.studentId+'/'+r.date;daily.set(key,{studentId:r.studentId,lines:(daily.get(key)?.lines||0)+Number(r.lines||0)});});
 const qDays=[...daily.values()].filter(r=>Number(data.quranTargets?.[r.studentId]?.dailyLines)>0),qMet=qDays.filter(r=>r.lines>=Number(data.quranTargets[r.studentId].dailyLines));
 const materials=collect(data.materials,r=>!!r.material&&!!r.date).filter(r=>dated(r)&&r.active!==false&&!r.isExample&&teacherScope(r));
 const classIds=new Set(schedules.flatMap(s=>s.classIds||[s.classId]).filter(Boolean));
 const observationRows=collect(data.observations,r=>!!r.date&&Array.isArray(r.indicators)).filter(r=>dated(r)&&teacherScope(r));
 const indicatorScores=observationRows.flatMap(r=>r.indicators).map(i=>Number(i.nilai)).filter(n=>n>=1&&n<=4);
 const studentExcused=[...formal,...boarding].filter(r=>!r.attendanceManagedBy&&['Sakit','Izin'].includes(r.status)).length;
 return {studentExcused,observationCount:observationRows.length,observationScore:indicatorScores.length?Math.round(indicatorScores.reduce((a,b)=>a+b,0)/(indicatorScores.length*4)*1000)/10:null,scope,schedules,attendance,missing,excused,teacher,teacherTotal,teacherPresence:percent(teacher.present,teacherTotal),teacherExcused:percent(excused.length,teacherTotal),teacherUnknown:percent(missing.length-excused.length,teacherTotal),formal:attendanceSummary(formal),boarding:attendanceSummary(boarding),students,cases,handled:cases.filter(r=>caseHandled(r)||Object.keys(r.tabayyunHistory||{}).length>0||['tabayyun','konseling','konsekuensi','evaluasi'].includes(r.status)).length,categories,examined:examined.size,passed:passed.length,need:need.size,followed:new Set(follow.map(r=>r.studentId)).size,mentored:new Set(mentoring.map(r=>r.studentId)).size,mentoringCount:mentoring.length,character:character.length?Math.round(character.reduce((a,b)=>a+b,0)/(character.length*5)*1000)/10:null,characterAnswers:character.length,qDays:qDays.length,qMet:qMet.length,quranCount:quran.length,scheduledClasses:scope.classes.filter(c=>classIds.has(c.id)).length,classes:scope.classes.length,materials:materials.length,teachers:new Set(schedules.map(s=>s.staffId||s.teacherStaffId)).size};
}
