import test from 'node:test';import assert from 'node:assert/strict';
import {naqibDecision,naqibLeaveGender} from '../assets/js/naqib-leave-model.js';
import {validateDuty} from '../assets/js/leadership-duty-model.js';
test('Naqib leave needs active duty and heads review only own gender, no self approval',()=>{
 assert.throws(()=>naqibLeaveGender('naqib',{},null));assert.equal(naqibLeaveGender('naqib',{}, {active:true,gender:'P'}),'P');
 const r={ownerUid:'naqib',gender:'P'},actor={uid:'head',role:'head_girls_dorm',gender:'P'};
 assert.equal(naqibDecision(r,actor,'approved','Pengganti siap').status,'approved');
 assert.throws(()=>naqibDecision(r,{...actor,role:'head_boys_dorm',gender:'L'},'approved','catatan'));
 assert.throws(()=>naqibDecision(r,{...actor,uid:'naqib'},'approved','catatan'));
 assert.throws(()=>naqibDecision({...r,decision:{}},actor,'approved','catatan'));
 assert.equal(naqibDecision(r,{uid:'naqib'},'cancelled','Batal').status,'cancelled');
 assert.throws(()=>naqibDecision(r,actor,'cancelled','Batal'));
});
test('duty settings retain eight-hour canonical shifts and reject other gender',()=>{
 const row={gender:'P',shiftId:'shift3',startMinute:960,endMinute:1440};
 assert.equal(validateDuty(row,{gender:'P'},{gender:'P'}),row);
 assert.throws(()=>validateDuty(row,{gender:'L'},{gender:'P'}));assert.throws(()=>validateDuty(row,{gender:'P'},{gender:'L'}));
 assert.throws(()=>validateDuty({...row,endMinute:1430},{gender:'P'},{gender:'P'}));
});
