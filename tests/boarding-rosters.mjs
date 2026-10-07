import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const d=JSON.parse(fs.readFileSync('seed/master-data.json')),p=JSON.parse(fs.readFileSync('seed/imports/boarding-2026-update.json')),y=p.report.academicYearId;
test('roster import only changes boarding scopes and uses existing student IDs',()=>{
 assert.equal(p.report.groupCount,21);assert.equal(p.report.recurring,11);
 for(const [path,v]of Object.entries(p.changes)){
  assert.match(path,/^(groups\/|rooms\/|assignments\/(rooms|groups)\/|schedules\/recurring\/|reference\/boardingRoster)/);
  if(v?.studentId)assert.ok(d.students[v.studentId]);
 }
 assert.ok(!Object.keys(p.changes).some(k=>k.startsWith('students/')||k.startsWith('staff/')||k.startsWith('finance/')||k.startsWith('assignments/classes/')));
});
test('source uncertainties remain in review without fabricated students or school placement',()=>{
 const pending=p.report.pending;assert.ok(pending.some(x=>x.name==='AL'));assert.ok(pending.some(x=>x.name==='QOYYIM'));
 assert.ok(!Object.values(d.students).some(s=>s.name==='AL'));
 const staffRoom=d.reference.boardingRosterStaffRooms[y]['ROOM-PTRI-M2'];assert.equal(staffRoom.members.length,12);
 assert.ok(!Object.values(p.changes).some(v=>v?.sourceName?.startsWith('Usth')));
});
test('new Arabic groups are distinct from Quran and contain the morning period provenance',()=>{
 const groups=Object.entries(d.groups).filter(([id,g])=>id.startsWith('GRP-2026-')&&g.programType==='arabic');assert.equal(groups.length,6);
 for(const [id,g]of groups){assert.equal(g.type,'Bahasa Arab');assert.equal(g.startTime,'05:40');assert.ok(g.scheduleBasis);assert.equal(new Set(Object.keys(d.assignments.groups[y][id]||{})).size,Object.keys(d.assignments.groups[y][id]||{}).length);}
});
test('recurring schedules retain approximate source times and confirmed period without duplicating Saturday GEMA',()=>{
 const rows=Object.values(d.schedules.recurring).filter(s=>s.importId===p.id);
 assert.equal(rows.filter(s=>s.lessonGroupId==='GRP-GEMA-LESSON-KAJIAN').length,1);
 assert.equal(rows.filter(s=>s.frequency==='monthly').length,1);
 assert.ok(rows.every(s=>s.sourcePeriod==='Oktober 2025'&&s.confirmedCurrentPeriod&&(!s.startTime||s.lessonGroupId)));
});
