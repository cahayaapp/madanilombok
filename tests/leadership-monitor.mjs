import test from 'node:test';import assert from 'node:assert/strict';
import {monitorScope,learningRows,attendanceSummary,teacherMissing,caseHandled} from '../assets/js/leadership-monitor-model.js';
const master={students:[{id:'a',unitId:'sd',gender:'L',boardingStatus:'boarding'},{id:'b',unitId:'smp',gender:'P',boardingStatus:'boarding'},{id:'c',unitId:'sd',gender:'P',boardingStatus:'non_boarding'},{id:'old',unitId:'sd',mergedInto:'a'}],classes:[{id:'sd1',unitId:'sd'},{id:'smp1',unitId:'smp'}]};
const session=(activeRole,profile={})=>({activeRole,profile});
test('school scope is explicit, role-specific, and closed if unassigned',()=>{
 assert.equal(monitorScope(session('head_formal_school'),master).students.length,0);
 assert.deepEqual([...monitorScope(session('head_formal_school',{unitIds:['smp'],roleScopes:{head_formal_school:{unitIds:['sd']}}}),master).studentIds],['a','c']);
 assert.deepEqual([...monitorScope(session('head_boys_dorm'),master).studentIds],['a']);assert.deepEqual([...monitorScope(session('head_girls_dorm'),master).studentIds],['b']);assert.throws(()=>monitorScope(session('guru_mapel'),master));
});
test('only final learning rows in own unit, delegated GEMA and unknown excluded from percentage',()=>{
 const scope=monitorScope(session('head_formal_school',{unitIds:['sd']}),master),rows=learningRows([{stage:'AWAL',students:{a:{status:'Alfa'}}},{stage:'FINAL',students:{a:{status:'Terlambat'},b:{status:'Alfa'},c:{attendanceManagedBy:'GEMA',status:null}}}],scope);
 assert.equal(rows.length,2);assert.deepEqual(attendanceSummary(rows),{total:1,present:1,late:1,absent:0,attendance:100,punctuality:0,unknown:1});assert.equal(attendanceSummary([]).attendance,null);
 const totals=attendanceSummary([{status:'Hadir'},{status:'Terlambat'},{status:'Sakit'},{status:'Izin'},{status:'Alfa'}]);assert.equal(totals.attendance,40);assert.equal(totals.punctuality,50);
});
test('teacher missing compares merged source IDs and only finished sessions',()=>{
 const schedule={id:'one',sourceScheduleIds:['one','two'],day:'Senin',startTime:'08:00',endTime:'10:00',staffId:'staff'};
 const now=Date.parse('2026-10-12T09:00:00+08:00');assert.equal(teacherMissing([schedule],[],'2026-10-12','2026-10-12',now).length,0);
 assert.equal(teacherMissing([schedule],[],'2026-10-12','2026-10-12',now+7200000).length,1);
 assert.equal(teacherMissing([schedule],[{scheduleId:'two',date:'2026-10-12',staffId:'staff'}],'2026-10-12','2026-10-12',now+7200000).length,0);
});
test('case is handled only with handling evidence or handling status',()=>{assert.equal(caseHandled({status:'menunggu_konselor'}),false);assert.equal(caseHandled({tabayyun:{facts:'klarifikasi'}}),true);assert.equal(caseHandled({status:'selesai'}),true);});
