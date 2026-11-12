import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildLiveUnits,scheduledLiveTeachers} from '../assets/js/live-projection.js';
import {publishLive} from '../scripts/publish-live.mjs';
import {unitLiveRules} from '../scripts/prepare-live-rules.mjs';

test('unit projections preserve IDs internally, isolate students and deduplicate the combined screen',()=>{
 const master={students:[{id:'a',name:'Nama Sama',gender:'L'},{id:'b',name:'Nama Sama',gender:'P'},{id:'c',name:'Belum diketahui'}],staff:[{id:'t',name:'Guru Lintas Unit'},{id:'u',name:'Guru Putra'}],classes:[],groups:[]};
 const result=buildLiveUnits({master,sources:{},year:'Y',scheduledTeachers:[{id:'t',units:['putra','putri'],startMinute:0},{id:'t',units:['putri'],startMinute:60},{id:'u',units:['putra'],startMinute:0}]});
 assert.equal(result.putra.students.total,1);assert.equal(result.putri.students.total,1);assert.equal(result.gabungan.students.total,3);assert.equal(result.gabungan.teachers.total,2);assert.equal(result.putri.teachers.total,1);assert.equal(result.putra.unit,'putra');
 assert(!JSON.stringify(result).includes('"gender"'));assert(!JSON.stringify(result).includes('"id"'));
});
test('teachers follow the students in their actual teaching targets, including mixed formal classes',()=>{
 const now=new Date('2026-11-12T01:00:00Z'),master={students:[{id:'a',gender:'L'},{id:'b',gender:'P'}],staff:[{id:'t',name:'Guru'}],users:[{id:'u',staffId:'t',role:'guru_mapel',classIds:['c']}],classes:[{id:'c',unitId:'UNIT-SMK'}],subjects:[],groups:[],classAssignments:{a:{classId:'c'},b:{classId:'c'}},academicSchedules:[{id:'s',staffId:'t',classId:'c',subjectId:'m',day:'Kamis',startTime:'08:00',endTime:'09:00',academicYearId:'Y'}]};
 const schedules=scheduledLiveTeachers(master,{},'Y',now);assert.equal(schedules.length,1);assert.deepEqual(schedules[0].units,['putra','putri']);
});
test('scheduled publisher fails closed on missing sources and writes only three public snapshots',async()=>{
 const source={students:{a:{name:'Contoh',gender:'L',nisn:'PRIVATE'}},staff:{t:{name:'Guru'}},classes:{c:{name:'Kelas'}},'settings/currentAcademicYearId':'Y'};
 let broken=false;const writes=[],reads=[];
 const fetcher=async(url,options)=>{
  const path=new URL(url).pathname.replace(/^\//,'').replace(/\.json$/,'');
  if(options.method==='PATCH'){writes.push({path,value:JSON.parse(options.body)});return {ok:true,json:async()=>null};}
  reads.push(path);return broken&&path.includes('/academic/quran_records/')?{ok:false,status:403}:{ok:true,json:async()=>source[path.replace(/^madani_app\//,'')]||null};
 };
 await publishLive({token:'mock',fetcher});assert.equal(writes.length,1);assert.equal(writes[0].path,'madani_live');assert.deepEqual(Object.keys(writes[0].value),['putra','putri','gabungan']);assert(!JSON.stringify(writes).includes('PRIVATE'));assert(!reads.some(p=>p.includes('finance')));
 broken=true;await assert.rejects(publishLive({token:'mock',fetcher}),/gagal/);assert.equal(writes.length,1);
});
test('rules isolate the three allowed public paths and all frontend screens remain anonymous',()=>{
 const rules=unitLiveRules();for(const unit of ['putra','putri','gabungan']){assert.match(rules[unit]['.read'],/expiresAt/);assert.equal(rules[unit].unit['.validate'],`newData.val() === '${unit}'`);}
 assert.equal(rules.$other['.read'],false);
 const source=readFileSync(new URL('../live/tv.js',import.meta.url),'utf8');assert(!source.includes('/madani_app/'));assert(!source.includes('getIdToken'));assert(!source.includes('localStorage'));
});
