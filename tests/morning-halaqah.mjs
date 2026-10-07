import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {teacherSchedules} from '../assets/js/teacher/model.js';
import {naqibProgramKind} from '../assets/js/naqib-program-policy.js';
import {canAccess} from '../assets/js/permissions.js';
const m=JSON.parse(fs.readFileSync('seed/master-data.json')),pack=JSON.parse(fs.readFileSync('seed/imports/morning-halaqah.json')),rows=o=>Object.entries(o).map(([id,r])=>({id,...r}));
test('every day has one confirmed morning block; Monday/Saturday belong to Naqib',()=>{
 const daily=rows(m.schedules.daily).filter(s=>s.id.startsWith('DS-PAGI-'));assert.equal(daily.length,7);
 for(const day of ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']){
  const a=daily.filter(s=>s.day===day);assert.equal(a.length,1);assert.equal(a[0].startTime,'07:00');assert.equal(a[0].endTime,'07:50');assert.equal(a[0].participantScope,'all_boarding');
  assert.equal(naqibProgramKind(a[0],m.programs[a[0].programId]),day==='Senin'?'apel_pagi':day==='Sabtu'?'senam':null);
 }
 assert.ok(Object.keys(pack.changes).every(p=>/^(programs|schedules\/(daily|recurring)|subjects|groups)\//.test(p)));
 // Retain 24h coverage of both boarding audiences, with no overlapping morning slots.
 for(const scope of ['boarding_general','boarding_gema'])for(const day of ['Senin','Selasa','Sabtu']){
  const a=rows(m.schedules.daily).filter(s=>s.status!=='inactive'&&(s.importId==='daily-2026-docx'&&s.participantScope===scope||s.id.startsWith('DS-PAGI-'))&&(s.day==='Setiap Hari'||s.day===day)).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  a.forEach((s,i)=>assert.equal(s.endTime,a[(i+1)%a.length].startTime));
 }
});
test('Tahfiz attendance uses assigned halaqah only, never formal classes or Arabic, and excludes Monday/Saturday',()=>{
 const ctx={yearId:'TA-2026-2027-GANJIL',session:{activeRole:'mentor_tahsin_tahfiz',profile:{staffId:'teacher'},user:{uid:'u'}},master:{dailySchedules:rows(m.schedules.daily),groups:[{id:'own',mentorStaffId:'teacher',programType:'tahfiz'},{id:'other',mentorStaffId:'other'},{id:'arab',mentorStaffId:'teacher',programType:'arabic'}]}};
 const a=teacherSchedules(ctx);assert.equal(a.length,5);assert.ok(a.every(s=>s.groupId==='own'&&s.classId===null&&!['Senin','Sabtu'].includes(s.day)));
 assert.equal(teacherSchedules({...ctx,yearId:'other'}).length,0);
 assert.ok(canAccess('academic.teacher_attendance',['mentor_tahsin_tahfiz']));assert.ok(canAccess('academic.student_attendance',['mentor_tahsin_tahfiz']));
});
test('GEMA Quran groups get all three additional daily halaqah sessions while other halaqah do not',()=>{
 const ctx={yearId:'TA-2026-2027-GANJIL',session:{activeRole:'mentor_tahsin_tahfiz',profile:{staffId:'t'},user:{uid:'u'}},master:{dailySchedules:rows(m.schedules.daily),groups:[{id:'gema',mentorStaffId:'t',gemaProgram:true}]}};
 const schedules=teacherSchedules(ctx);assert.equal(schedules.length,26);
 for(const day of ['Senin','Sabtu'])assert.deepEqual(schedules.filter(s=>s.day===day).map(s=>s.startTime),['06:10','09:00','14:00']);
});
