import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildLiveCounselor} from '../assets/js/live-counselor.js';
import {buildLiveUnits} from '../assets/js/live-projection.js';
import {validateLiveSnapshot} from '../assets/js/live-model.js';
const date='2026-11-12',now=new Date(date+'T01:00:00Z');
const master=()=>({students:[{id:'a',name:'Santri A',gender:'L',unitId:'UNIT-SMP'},{id:'b',name:'Santri B',gender:'P',unitId:'UNIT-SMK'},{id:'sd',name:'SD',gender:'L',unitId:'UNIT-SD'},{id:'old',name:'Arsip',gender:'L',status:'inactive'},{id:'merged',name:'Gabung',gender:'L',mergedInto:'a'}],staff:[],classes:[{id:'c',name:'Kelas Contoh'}],classAssignments:{a:{classId:'c'},b:{classId:'c'}}});
const report=(studentId,patch={})=>({studentId,date,status:'menunggu_konselor',category:'Kedisiplinan',description:'PRIVATE-NARRATIVE',note:'PRIVATE',...patch});
test('daily calls are unique per student, use Madya when required, and contain only public name/class/level',()=>{
 const sources={cases:{a:report('a'),a2:report('a',{category:'Moral dan Etika'}),b:report('b'),sd:report('sd'),old:report('old'),merged:report('merged'),unknown:report('missing')}};
 const result=buildLiveCounselor(master(),sources,now);assert.equal(result.total,2);assert.deepEqual(result.rows,[{name:'Santri A',label:'Kelas Contoh',status:'madya'},{name:'Santri B',label:'Kelas Contoh',status:'pemula'}]);assert(!JSON.stringify(result).includes('PRIVATE'));
 const units=buildLiveUnits({master:master(),sources,year:'Y',now,scheduledTeachers:[]});assert.equal(units.putra.counselor.total,1);assert.equal(units.putri.counselor.total,1);assert.equal(units.gabungan.counselor.total,2);
});
test('closed, unproven, treated, deleted, escalated-to-leadership and other-day cases never become calls',()=>{
 for(const patch of [{status:'selesai'},{status:'tidak_terbukti'},{tabayyun:{conclusion:'TIDAK TERBUKTI'}},{status:'konsekuensi'},{status:'evaluasi'},{deletedAt:1},{higherEscalation:{requestedAt:1}},{date:'2026-11-11'},{date:'2026-11-13'},{handlingRole:'wali_kelas'},{status:'unknown'}])assert.equal(buildLiveCounselor(master(),{cases:{c:report('a',patch)}},now).total,0);
 assert.equal(buildLiveCounselor(master(),{cases:{c:report('a',{status:'dieskalasi',escalationTarget:'konselor_madya'})}},now).rows[0].status,'madya');
});
test('only final Alfa/Terlambat enter calls, and saved closed sources cannot be resurrected',()=>{
 const learning={t:{[date]:{s:{date,stage:'FINAL',students:{a:{status:'Alfa'},b:{status:'Terlambat'},sd:{status:'Alfa'}}},initial:{date,stage:'AWAL',students:{a:{status:'Alfa'}}},delegated:{date,stage:'FINAL',students:{a:{status:'Alfa',attendanceManagedBy:'GEMA'}}}}}};
 assert.equal(buildLiveCounselor(master(),{learning},now).total,2);
 const closed=report('a',{status:'selesai',attendanceSourcePath:`learning/t/${date}/s/a`});
 const result=buildLiveCounselor(master(),{learning,cases:{closed}},now);assert.equal(result.total,1);assert.equal(result.rows[0].name,'Santri B');
});
test('preceding two days affect existing three-day routing, but only today appears on TV',()=>{
 const boarding=Object.fromEntries(['2026-11-10','2026-11-11',date].map(d=>[d,{p:{a:{studentId:'a',date:d,programId:'p',stage:'FINAL',status:'Alfa',note:'PRIVATE'}}}]));
 const result=buildLiveCounselor(master(),{counselorBoarding:boarding},now);assert.equal(result.total,1);assert.equal(result.rows[0].status,'madya');
 const prior={...boarding};delete prior[date];assert.equal(buildLiveCounselor(master(),{counselorBoarding:prior},now).total,0);
});
test('public counselor schema drops private details and rejects unsupported call levels',()=>{
 const snapshot=buildLiveUnits({master:master(),sources:{cases:{a:report('a')}},year:'Y',now,scheduledTeachers:[]}).gabungan;snapshot.counselor.rows[0].description='PRIVATE';
 assert(!JSON.stringify(validateLiveSnapshot(snapshot,+now)).includes('PRIVATE'));
 snapshot.counselor.rows[0].status='diagnosis';assert.throws(()=>validateLiveSnapshot(snapshot,+now));
});
