import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {filterScopedStudents} from '../assets/js/role-experience.js';
import {teacherSchedules} from '../assets/js/teacher/model.js';
const d=JSON.parse(fs.readFileSync('seed/master-data.json')),pack=JSON.parse(fs.readFileSync('seed/imports/smp-2026-2027-update.json')),checks=JSON.parse(fs.readFileSync('seed/imports/smp-preservation-checks.json'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const year='TA-2026-2027-GANJIL',rows=o=>Object.entries(o||{}).map(([id,r])=>({id,...r}));
test('SMP update preserves student identities, other school schedules and finance',()=>{
 assert.equal(hash(Object.fromEntries(Object.entries(d.students).filter(([id])=>!['AMD-SMP-0101','AMD-SMP-0102'].includes(id)))),checks.students);assert.equal(hash(d.finance),checks.finance);
 assert.equal(Object.keys(d.students).length,354);
 // Undo only the explicitly scoped, later boarding update before checking SMP preservation.
 const prior=structuredClone(d.assignments),boarding=JSON.parse(fs.readFileSync('seed/imports/boarding-2026-update.json'));
 for(const [path,value] of Object.entries(boarding.changes))if(path.startsWith('assignments/')){
  const parts=path.split('/').slice(1);let node=prior;for(const key of parts.slice(0,-1))node=node[key];
  const expected=boarding.expected[path];if(expected==null)delete node[parts.at(-1)];else node[parts.at(-1)]=expected;
 }
 for(const [gid,members] of Object.entries(prior.groups[year]))if(gid.startsWith('GRP-2026-')&&!Object.keys(members).length)delete prior.groups[year][gid];
 for(const kind of ['classes','rooms','groups'])assert.equal(hash(prior[kind]),checks[kind]);
 assert.equal(hash(Object.fromEntries(Object.entries(d.schedules.academic).filter(([id,s])=>s.unitId!=='UNIT-SMP'&&!id.startsWith('JSD-2627G-')).map(([id,s])=>{const old={...s};if(old.supersededBy==='sd-2026-2027-20261004'){old.status='active';delete old.supersededBy;}return [id,old];}))),checks.schedules);
 assert.equal(pack.report.scheduleCount,252);assert.equal(pack.report.homerooms,6);assert.equal(pack.report.matchedStudents,80);
 assert.ok(Object.keys(pack.changes).every(p=>!p.startsWith('finance/')));
 assert.deepEqual(Object.keys(pack.changes).filter(p=>p.startsWith('students/')).sort(),['students/AMD-SMP-0101','students/AMD-SMP-0102']);
});
test('all source lesson cells retain period, class, source and teacher code references',()=>{
 const schedules=rows(d.schedules.academic).filter(s=>s.unitId==='UNIT-SMP');assert.equal(schedules.length,252);
 for(const s of schedules){assert.ok(d.classes[s.classId]);assert.ok(d.subjects[s.subjectId]);assert.ok(s.startTime<s.endTime);assert.ok(s.sourceCell);assert.equal(s.academicYearId,year);if(s.teacherStaffId)assert.ok(d.staff[s.teacherStaffId]);}
 assert.equal(new Set(schedules.map(s=>`${s.classId}|${s.day}|${s.period}`)).size,252);
 assert.equal(schedules.find(s=>s.sourceCell==='D7').teacherStaffId,'AMD-SDM-0077');
 assert.equal(schedules.find(s=>s.sourceCell==='E7').teacherStaffId,'AMD-SDM-0036');
 assert.equal(pack.report.conflicts.length,0);
});
test('mentor assignments override homeroom and stale broad scope without creating students',()=>{
 const master={students:rows(d.students),mentorAssignments:d.assignments.mentors[year],classAssignments:d.assignments.classes[year]};
 const actual=filterScopedStudents(master,{staffId:'AMD-SDM-0036',classIds:['CLS-SMP-9-PUTRA'],menteeStudentIds:['AMD-SMP-0083']},'guru_wali');
 const expected=Object.values(master.mentorAssignments).filter(a=>a.mentorStaffId==='AMD-SDM-0036'&&a.status==='active').map(a=>a.studentId).sort();
 assert.deepEqual(actual.map(s=>s.id).sort(),expected);assert.equal(expected.length,8);
 for(const a of Object.values(master.mentorAssignments)){assert.ok(d.students[a.studentId]);if(a.mentorStaffId)assert.ok(d.staff[a.mentorStaffId]);}
});
test('all teachers are linked; broad scope cannot steal their assigned lessons',()=>{
 const ctx={yearId:year,session:{profile:{staffId:'unknown',unitIds:['UNIT-SMP'],classIds:rows(d.classes).filter(r=>r.unitId==='UNIT-SMP').map(r=>r.id),subjectIds:Object.keys(d.subjects)},user:{uid:'u'}},master:{classes:rows(d.classes),subjects:rows(d.subjects),academicSchedules:rows(d.schedules.academic)}};
 const schedules=teacherSchedules(ctx);assert.equal(schedules.length,0);
});
test('confirmed combined PJOK has one teacher session per period and both rosters',()=>{
 const master={classes:rows(d.classes),subjects:rows(d.subjects),students:rows(d.students),classAssignments:d.assignments.classes[year],academicSchedules:rows(d.schedules.academic)};
 const sessions=teacherSchedules({yearId:year,master,session:{profile:{staffId:'AMD-SDM-0086'},user:{uid:'hasrul'}}}).filter(s=>s.day==='Kamis');
 assert.equal(sessions.length,2);assert.ok(sessions.every(s=>s.classIds.length===2&&s.id.startsWith('JSMP-2627G-GABUNG')));
 const keys=Object.keys(pack.changes);assert.ok(keys.every(p=>!keys.some(q=>q!==p&&q.startsWith(p+'/'))));
 assert.equal(pack.report.issues.length,0);assert.equal(pack.report.activeMentoring,80);
});
