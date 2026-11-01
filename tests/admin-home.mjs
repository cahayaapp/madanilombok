import test from 'node:test';
import assert from 'node:assert/strict';
import {adminHomeData} from '../assets/js/admin-home.js';
test('admin overview counts current active students once and keeps unplaced students visible',()=>{
 const m={students:[{id:'a',gender:'L',status:'active',boardingStatus:'boarding'},{id:'b',gender:'P',status:'active'},{id:'old',status:'graduated'},{id:'merged',mergedInto:'a'}],classes:[{id:'c',name:'VII'}],classAssignments:{a:{classId:'c'}},rooms:[{id:'r',dormitoryId:'d'}],roomAssignments:{a:{roomId:'r'}},dormitories:[{id:'d',name:'Asrama Putra'}]};
 const before=JSON.stringify(m),d=adminHomeData(m,'2026');assert.equal(d.students.length,2);assert.equal(d.unplaced,1);assert.equal(d.classRows[0].L,1);assert.equal(d.dorms.reduce((s,r)=>s+r.count,0),2);assert.equal(JSON.stringify(m),before);
});
test('today uses school timezone, current year and active schedules; updates require a timestamp',()=>{
 const m={dailySchedules:[{id:'a',day:'Senin',academicYearId:'2026',startTime:'08:00'},{id:'b',day:'Setiap Hari',startTime:'05:00'},{id:'old',day:'Senin',academicYearId:'2025'},{id:'off',day:'Senin',status:'inactive'},{id:'tomorrow',day:'Selasa'}],staff:[{id:'s',updatedAt:100},{id:'x',updatedAt:200},{id:'none'}]};
 const d=adminHomeData(m,'2026',new Date('2026-11-01T17:00:00Z'));assert.deepEqual(d.today.map(r=>r.id),['b','a']);assert.deepEqual(d.updates.map(r=>r.time),[200,100]);
});
