import test from 'node:test';
import assert from 'node:assert/strict';
import {worshipSummary} from '../assets/js/leadership-worship-model.js';

const options={yearId:'2026',scope:'boarding-L',from:'2026-10-01',to:'2026-10-31'};
const record=(extra={})=>({academicYearId:'2026',scope:'boarding-L',date:'2026-10-30',prayer:'subuh',attendance:{staff:'Hadir'},...extra});

test('worship report isolates unit, academic year, period and known prayers',()=>{
 const data={valid:record(),girls:record({scope:'boarding-P'}),oldYear:record({academicYearId:'2025'}),oldDate:record({date:'2026-09-30'}),future:record({date:'2026-11-01'}),invalidPrayer:record({prayer:'unknown'})};
 assert.equal(worshipSummary(data,options).rows.length,1);
 assert.equal(worshipSummary(data,{...options,scope:'boarding-P'}).rows.length,1);
 assert.equal(worshipSummary(data,{...options,scope:''}).rows.length,0);
});

test('attendance denominator uses filled statuses and does not infer missing attendance',()=>{
 const result=worshipSummary({one:record({attendance:{a:'Hadir',b:'Tidak Hadir',c:'Izin',d:'Sakit',e:'Tugas Lembaga',f:'Belum Diisi',g:null}})},options);
 assert.equal(result.filled,5);
 assert.equal(result.attendance,20);
 assert.deepEqual(result.counts,{Hadir:1,'Tidak Hadir':1,Izin:1,Sakit:1,'Tugas Lembaga':1,'Belum Diisi':2});
 assert.equal(worshipSummary({},options).attendance,null);
 assert.equal(worshipSummary({one:record({attendance:{a:'Belum Diisi'}})},options).attendance,null);
});

test('historical records use saved unit without requiring current roster or gender',()=>{
 const data={one:record({academicYearId:undefined,attendance:{formerStaff:'Hadir'}}),two:record({prayer:'isya'}),three:record({date:'2026-10-31'})};
 const result=worshipSummary(data,options);
 assert.deepEqual(result.rows.map(r=>[r.date,r.prayer]),[['2026-10-31','subuh'],['2026-10-30','subuh'],['2026-10-30','isya']]);
 assert.ok(result.rows.some(r=>r.staffId==='formerStaff'));
 assert.equal(result.attendance,100);
});
