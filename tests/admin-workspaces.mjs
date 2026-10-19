import test from 'node:test';import assert from 'node:assert/strict';
import {ADMIN_WORKSPACES,normalizeAdminRecord,workspaceFor} from '../assets/js/admin-workspaces.js';
import {teacherSchedules} from '../assets/js/teacher/model.js';
import {naqibProgramEnabled} from '../assets/js/naqib-program-policy.js';
test('seven admin workspaces keep placement and year workflows reachable',()=>{assert.equal(Object.keys(ADMIN_WORKSPACES).length,7);assert.equal(workspaceFor('class-placements'),'school');assert.equal(workspaceFor('group-placements'),'boarding');assert.equal(workspaceFor('quran-schedules'),'lessons');});
test('new halaqah schedules feed only assigned teacher and intended group',()=>{
 const daily=['quran','arabic'].map((kind,i)=>({id:'s'+i,...normalizeAdminRecord(kind+'-schedules',{academicYearId:'y',day:'Senin',startTime:'08:00',endTime:'09:00',targetId:kind})}));
 const groups=['quran','arabic'].map(id=>({id,programType:id,mentorStaffId:'t',teachingEnabled:true,subjectId:'a'}));
 const ctx={yearId:'y',master:{groups,dailySchedules:daily,subjects:[{id:'a',name:'Bahasa Arab'}]},session:{activeRole:'mentor_tahsin_tahfiz',profile:{staffId:'t'}}};
 assert.equal(teacherSchedules(ctx).length,1);assert.equal(teacherSchedules(ctx)[0].groupId,'quran');
 ctx.session.activeRole='guru_mapel';assert.equal(teacherSchedules(ctx).length,1);assert.equal(teacherSchedules(ctx)[0].groupId,'arabic');
 ctx.session.profile.staffId='other';assert.equal(teacherSchedules(ctx).length,0);
});
test('independent attendance/report requirements preserve legacy defaults',()=>{
 const p={name:'Sholat subuh'};assert.equal(naqibProgramEnabled({},p),true);
 assert.equal(naqibProgramEnabled({naqibAttendance:false,naqibReport:true},p),false);
 assert.equal(naqibProgramEnabled({naqibAttendance:false,naqibReport:true},p,'report'),true);
 assert.equal(naqibProgramEnabled({naqibAttendance:true,naqibReport:false},p,'report'),false);
 assert.equal(naqibProgramEnabled({naqibAttendance:true,status:'inactive'},p),false);
 assert.equal(naqibProgramEnabled({naqibAttendance:true},{name:'Kegiatan baru'}),true);
});
test('groups normalize teacher links and schedule validation rejects empty times',()=>{
 assert.deepEqual(normalizeAdminRecord('groups',{type:'Bahasa Arab',mentorStaffId:'t',mentorStaffIds:['t','b']}).mentorStaffIds,['t','b']);
 assert.throws(()=>normalizeAdminRecord('quran-schedules',{startTime:'08:00',endTime:'09:00'}),/halaqah/);
 assert.throws(()=>normalizeAdminRecord('daily-schedules',{startTime:'',endTime:''}),/jam/);
});
