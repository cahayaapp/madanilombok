import test from 'node:test';import assert from 'node:assert/strict';
import {educationQuality as calculate} from '../assets/js/education-quality-model.js';
const session={activeRole:'head_formal_school',profile:{unitIds:['smp']}};
const master={students:[{id:'a',unitId:'smp',gender:'L'},{id:'b',unitId:'smp',gender:'P'},{id:'outside',unitId:'smk',gender:'L'}],staff:[{id:'t',gender:'L'},{id:'u',gender:'P'}],classes:[{id:'c',unitId:'smp'},{id:'x',unitId:'smk'}],academicSchedules:[{id:'lesson',day:'Senin',staffId:'t',classId:'c',startTime:'08:00',endTime:'09:00',subjectId:'m'},{id:'miss',day:'Senin',staffId:'u',classId:'c',startTime:'10:00',endTime:'11:00',subjectId:'m'}]};
const base={session,master,from:'2026-10-19',to:'2026-10-19',now:Date.parse('2026-10-20T00:00:00Z')};
const exam={date:'2026-10-19',stage:'FINAL',classId:'c',kkm:80,students:{a:{score:79},b:{score:90},outside:{score:99}}};
test('teacher attendance reconciles approved leave and does not call missing attendance alfa',()=>{
 const data={attendance:{one:{date:'2026-10-19',classId:'c',staffId:'t',scheduleId:'lesson',status:'TERLAMBAT'}},leaves:{one:{staffId:'u',unitId:'smp',startDate:'2026-10-19',decision:{status:'approved'},lessons:[{date:'2026-10-19',scheduleId:'miss'}]}}};
 const r=calculate({...base,data});assert.equal(r.teacherPresence,50);assert.equal(r.teacherExcused,50);assert.equal(r.teacherUnknown,0);assert.equal(r.teacher.punctuality,0);
 data.leaves.one.decision.status='pending';assert.equal(calculate({...base,data}).teacherUnknown,50);
 const individual=calculate({...base,data,staffId:'t'});assert.equal(individual.teacherPresence,100);assert.equal(individual.missing.length,0);
});
test('school and gender scope exclude foreign students, preliminary and delegated attendance',()=>{
 const r=calculate({...base,gender:'L',data:{learning:{one:{date:'2026-10-19',stage:'FINAL',classId:'c',students:{a:{status:'Hadir'},b:{status:'Alfa'},outside:{status:'Alfa'}}}},boarding:{one:{date:'2026-10-19',stage:'FINAL',studentId:'a',status:'Terlambat'},two:{date:'2026-10-19',stage:'AWAL',studentId:'a',status:'Alfa'},three:{date:'2026-10-19',stage:'FINAL',studentId:'outside',status:'Alfa'}}}});
 assert.equal(r.students.total,2);assert.equal(r.students.attendance,100);assert.equal(r.students.punctuality,50);
 assert.equal(calculate({...base,studentId:'outside'}).scope.studentIds.size,0);
 assert.throws(()=>calculate({...base,session:{...session,activeRole:'naqib'}}),/Hanya Kepala/);
 assert.equal(calculate({...base,session:{...session,profile:{}}}).scope.studentIds.size,0);
});
test('exam final KKM uses individual students and followups must match exam and teacher',()=>{
 const data={exams:{t:{e:exam,old:{...exam,date:'2026-09-01'},draft:{...exam,stage:'DRAFT'}}},followups:{one:{studentId:'a',examId:'old',staffId:'t',classId:'c',status:'Selesai'}}};
 let r=calculate({...base,data});assert.equal(r.examined,2);assert.equal(r.passed,1);assert.equal(r.need,0);
 data.exams.t.e.students.a.score=70;r=calculate({...base,data});assert.equal(r.need,1);assert.equal(r.followed,0);
 data.followups.one.examId='e';assert.equal(calculate({...base,data}).followed,1);
});
test('tahfiz accumulates daily lines, character uses latest assessment and unproven cases are excluded',()=>{
 const data={quranTargets:{a:{dailyLines:10}},quran:{a:{studentId:'a',date:'2026-10-19',activity:'Ziyadah',type:'Tahfiz',lines:6},b:{studentId:'a',date:'2026-10-19',activity:'Ziyadah',type:'Tahfiz',lines:4},c:{studentId:'a',date:'2026-10-19',activity:'Murojaah',type:'Tahfiz',lines:100}},mentoring:{one:{studentId:'a',date:'2026-10-19',target:'adab',clarification:{answers:{a:4,b:5,c:0}}}},cases:{one:{studentId:'a',date:'2026-10-19',status:'menunggu_konselor',category:'Kebersihan'},two:{studentId:'a',date:'2026-10-19',status:'selesai',category:'Kebersihan',finalPoints:-5},three:{studentId:'outside',date:'2026-10-19',status:'selesai',category:'Kebersihan',finalPoints:-5}}};
 const r=calculate({...base,data});assert.equal(r.qDays,1);assert.equal(r.qMet,1);assert.equal(r.character,90);assert.equal(r.categories.Kebersihan,1);assert.equal(r.cases.length,2);assert.equal(r.handled,1);
});
test('empty denominators remain unavailable, never fabricated zero percent',()=>{const r=calculate({...base,master:{},data:{}});assert.equal(r.teacherPresence,null);assert.equal(r.character,null);assert.equal(r.students.attendance,null);});
test('school calendar breaks exclude expected attendance instead of marking everyone missing',()=>{
 const r=calculate({...base,data:{calendar:{break:{date:'2026-10-19',effectMode:'all',title:'Libur'}}}});assert.equal(r.missing.length,0);assert.equal(r.teacherUnknown,null);
});
