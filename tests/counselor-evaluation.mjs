import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEvaluation} from '../assets/js/counselor-evaluation-model.js';
const record=(id,date,studentId='s1',extra={})=>({id,date,studentId,category:'Kedisiplinan',tabayyun:{conclusion:'TERBUKTI'},...extra});
test('evaluation counts proven incident dates once and separates completed cases',()=>{
 const a=record('a','2026-10-30','s1',{status:'selesai',attendanceStatus:'Alfa'});
 const r=buildEvaluation([a,a,record('b','2026-10-29','s1',{attendanceStatus:'Terlambat'}),record('c','2026-10-30','s2',{tabayyun:{conclusion:'TIDAK TERBUKTI'}}),record('d','2026-10-30','s2',{tabayyun:null}),record('e','2026-10-30','s2',{incidentDate:'2026-09-01'})],'week','2026-10-30');
 assert.equal(r.summary.total,2);assert.equal(r.summary.students,1);assert.equal(r.summary.kinds,2);assert.equal(r.summary.finished,1);assert.equal(r.summary.pending,1);assert.equal(r.summary.completion,50);assert.equal(r.trend.reduce((n,p)=>n+p.count,0),2);
});
test('four-month comparison deduplicates students across months and uses preceding four months',()=>{
 const r=buildEvaluation([record('a','2025-10-01'),record('b','2026-01-01'),record('c','2025-06-30','s2')],'4months','2026-01-15');
 assert.equal(r.from,'2025-10-01');assert.equal(r.to,'2026-01-31');assert.equal(r.buckets.length,4);assert.equal(r.summary.total,2);assert.equal(r.summary.students,1);assert.equal(r.previous.total,1);assert.equal(r.trend.length,4);
});
test('empty periods produce real zeros without invalid percentages',()=>{
 for(const mode of ['week','month','4weeks','4months']){
  const r=buildEvaluation([],mode,'2026-10-30');assert.equal(r.summary.total,0);assert.equal(r.summary.completion,0);assert.deepEqual(r.summary.top,[]);assert.ok(r.trend.every(p=>p.count===0));
 }
 assert.throws(()=>buildEvaluation([],'invalid','2026-10-30'));
});
