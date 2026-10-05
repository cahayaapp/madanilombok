import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync('seed/master-data.json')),pack=JSON.parse(fs.readFileSync('seed/imports/sd-2026-2027-update.json')),smp=JSON.parse(fs.readFileSync('seed/imports/smp-2026-2027-update.json'));
const schedules=Object.values(d.schedules.academic).filter(s=>s.unitId==='UNIT-SD'&&s.status==='active');
test('SD uses confirmed Sheet1 values and retires the old timetable without deletion',()=>{
 assert.equal(schedules.length,238);assert.ok(schedules.every(s=>s.sourceSheet==='Sheet1'));assert.equal(schedules.filter(s=>s.teacherStaffId).length,108);
 const pjok=schedules.find(s=>s.classId==='CLS-SD-1'&&s.day==='Senin'&&s.subjectId==='MPL-SD-04');assert.equal(pjok.startTime,'08:45');assert.equal(pjok.endTime,'09:45');assert.equal(pjok.teacherStaffId,'AMD-SDM-0017');
 const old=Object.entries(d.schedules.academic).filter(([id,s])=>s.unitId==='UNIT-SD'&&!id.startsWith('JSD-2627G-'));assert.equal(old.length,214);assert.ok(old.every(([,r])=>r.status==='inactive'&&r.source.endsWith('.pdf')));
 assert.equal(schedules.filter(s=>s.endTime==='selesai').length,24);assert.equal(pack.report.warnings.length,4);
});
test('SD staff and homeroom references use existing identities plus authorized Miftahussurur',()=>{
 assert.equal(d.staff['AMD-SDM-0087'].name,'MIFTAHUSSURUR');assert.equal(d.classes['CLS-SD-6'].homeroomStaffId,'AMD-SDM-0026');
 assert.equal(schedules.find(s=>s.classId==='CLS-SD-6'&&s.subjectId==='MPL-SD-07').teacherStaffId,'AMD-SDM-0087');
 for(const s of schedules){assert.ok(d.subjects[s.subjectId]);assert.ok(d.classes[s.classId]);if(s.teacherStaffId)assert.ok(d.staff[s.teacherStaffId]);else assert.equal(s.teacherAssignmentStatus,'needs_review');}
 assert.ok(Object.keys(pack.changes).every(p=>!p.startsWith('finance/')&&!p.startsWith('students/')&&!p.startsWith('assignments/')));
});
test('SD update leaves all SMP schedules and mentor assignments intact',()=>{
 for(const [path,r] of Object.entries(smp.changes).filter(([p])=>p.startsWith('schedules/academic/')||p.startsWith('assignments/mentors/'))){assert.deepEqual(path.split('/').reduce((v,k)=>v[k],d),r);}
 const keys=Object.keys(pack.changes);assert.ok(keys.every(p=>!keys.some(q=>q!==p&&q.startsWith(p+'/'))));
});
