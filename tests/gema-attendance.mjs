import test from 'node:test';import assert from 'node:assert/strict';
import {gemaClassAttendance} from '../assets/js/teacher/gema-attendance.js';
import {learningTransition} from '../assets/js/teacher/model.js';
test('only active GEMA placements delegate formal SD/SMP/SMK attendance',()=>{
 for(const unitId of ['UNIT-SD','UNIT-SMP','UNIT-SMK'])for(const roomId of ['ROOM-PTR-GEMA','ROOM-PTRI-GEMA']){
 const student={id:'s',unitId},master={roomAssignments:{s:{roomId,academicYearId:'y',status:'active'}}};
 assert.equal(gemaClassAttendance(student,{classId:'c'},master,'y'),true);
 assert.equal(gemaClassAttendance(student,{classId:null,groupId:'h'},master,'y'),false);
 assert.equal(gemaClassAttendance(student,{classId:'c'},master,'other'),false);
 master.roomAssignments.s.status='inactive';assert.equal(gemaClassAttendance(student,{classId:'c'},master,'y'),false);
 }
});
test('GEMA remains in roster with no status, score or attendance points in both stages; halaqah can mark normally',()=>{
 const info={roster:[{id:'g',attendanceManagedBy:'GEMA'},{id:'r'}],schedule:{id:'s',classId:'c'},date:'2026-10-08',actor:{uid:'u',staffId:'t'},subjectName:'IPA'};
 const input={students:{g:{status:'Alfa',score:0},r:{status:'Hadir'}}};
 const first=learningTransition(null,input,info),final=learningTransition(first,input,info);
 for(const rec of [first,final]){assert.equal(rec.students.g.status,null);assert.equal(rec.students.g.points,0);assert.equal(rec.students.g.score,null);assert.equal(rec.students.g.attendanceNote,'Presensi oleh Pembina GEMA');assert.equal(rec.students.r.status,'Hadir');}
 const halaqah=learningTransition(null,{students:{g:{status:'Hadir'}}},{...info,roster:[{id:'g'}],schedule:{id:'h',groupId:'h'},subjectName:'Tahfiz'});assert.equal(halaqah.students.g.status,'Hadir');
});
