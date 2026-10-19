import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceReferrals} from '../assets/js/attendance-referrals.js';
import {withReadDeadline} from '../assets/js/read-deadline.js';
const master={students:[{id:'boy',gender:'L',unitId:'UNIT-SMP'},{id:'girl',gender:'P'},{id:'sd',gender:'L',unitId:'UNIT-SD'},{id:'old',gender:'L',mergedInto:'boy'},{id:'inactive',gender:'L',status:'inactive'}],programs:[{id:'prayer',name:'Isya'}]};
const args={master,gender:'L',from:'2026-10-01',to:'2026-10-20'};
const row={stage:'FINAL',status:'Alfa'};
test('only final absences in the counselor unit become review candidates',()=>{
 const boarding={'2026-10-14':{prayer:{boy:row,girl:row,sd:row,old:row,inactive:row}},'2026-09-01':{prayer:{boy:row}}};
 const result=attendanceReferrals({...args,boarding});assert.equal(result.length,1);assert.equal(result[0].context,'Isya');
 assert.equal(attendanceReferrals({...args,boarding,gender:''}).length,0);
 assert.equal(attendanceReferrals({...args,boarding,gender:'P'})[0].studentId,'girl');
 for(const r of [{...row,stage:'AWAL'},{...row,status:'Izin'},{...row,status:'Sakit'},{...row,status:'Hadir'},{...row,attendanceManagedBy:'GEMA'}])assert.equal(attendanceReferrals({...args,boarding:{'2026-10-14':{prayer:{boy:r}}}}).length,0);
});
test('learning final late records and boarding have stable distinct source IDs',()=>{
 const data={...args,boarding:{'2026-10-14':{prayer:{boy:row}}},learning:{teacher:{'2026-10-14':{lesson:{stage:'FINAL',students:{boy:{status:'Terlambat'}}}}}}};
 const records=attendanceReferrals(data);assert.equal(records.length,2);assert.notEqual(records[0].sourceId,records[1].sourceId);assert.deepEqual(records,attendanceReferrals(data));
 data.learning.teacher['2026-10-14'].lesson.stage='AWAL';assert.equal(attendanceReferrals(data).length,1);
});
test('read deadline preserves results/errors and ends a stalled read',async()=>{
 assert.equal(await withReadDeadline(Promise.resolve(42),50),42);
 await assert.rejects(withReadDeadline(Promise.reject(Error('permission denied')),50),/permission denied/);
 await assert.rejects(withReadDeadline(new Promise(()=>{}),5),/Data belum dapat dimuat/);
});
