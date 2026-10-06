import test from 'node:test';import assert from 'node:assert/strict';
import {schoolCaseRoute,canHandleSchoolCase,applySchoolCaseNote} from '../assets/js/school-case-routing.js';
import {applyCaseOperation} from '../assets/js/counselor-model.js';
const master={students:[{id:'sd',unitId:'UNIT-SD'},{id:'smp',unitId:'UNIT-SMP'}],classes:[{id:'c',unitId:'UNIT-SD',homeroomStaffId:'wali'}],classAssignments:{sd:{classId:'c'}}};
test('SD uses Wali Kelas from rombel; other units retain counselor inbox',()=>{
 const route=schoolCaseRoute(master,'sd','y');assert.equal(route.path,'boarding/homeroom_cases/y');assert.equal(route.fields.assignedHomeroomStaffId,'wali');assert.equal(route.fields.status,'menunggu_wali_kelas');assert.equal(schoolCaseRoute(master,'smp','y').path,'boarding/cases/y');
 assert.equal(schoolCaseRoute({...master,classes:[]},'sd','y').fields.routingStatus,'needs_homeroom');
});
test('only current class teacher can follow up or close SD cases; history retained',()=>{
 const r={studentId:'sd',status:'menunggu_wali_kelas',description:'Laporan asli'},s={activeRole:'guru_mapel',profile:{staffId:'wali'},user:{uid:'u'}},d={id:'n',note:'Klarifikasi dan pembinaan',status:'selesai'};
 assert.equal(canHandleSchoolCase(master,r,{staffId:'mentor'}),false);assert.throws(()=>applySchoolCaseNote(r,d,master,{...s,profile:{staffId:'other'}},1),/Wali Kelas/);assert.throws(()=>applySchoolCaseNote(r,d,master,{...s,activeRole:'konselor'},1),/Wali Kelas/);
 const updated=applySchoolCaseNote(r,d,master,s,1);assert.equal(updated.description,r.description);assert.equal(updated.homeroomHistory.n.note,d.note);assert.equal(updated.status,'selesai');assert.throws(()=>applySchoolCaseNote(updated,d,master,s,2),/ditutup/);
 assert.throws(()=>applyCaseOperation({...r,handlingRole:'wali_kelas'}, {type:'session',id:'x'},s,2),/Wali Kelas/);
});
