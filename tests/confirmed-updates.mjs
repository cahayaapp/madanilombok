import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {gemaLessonStudents,quranLessonWindows} from '../assets/js/gema-lessons.js';
import {groupLessonSchedules} from '../assets/js/teacher/group-schedules.js';
const m=JSON.parse(fs.readFileSync('seed/master-data.json')),pack=JSON.parse(fs.readFileSync('seed/imports/student-class-corrections.json')),rows=o=>Object.entries(o).map(([id,r])=>({id,...r}));
test('confirmed teachers receive exact GEMA lesson days and times',()=>{
 const master={groups:rows(m.groups),subjects:rows(m.subjects),dailySchedules:rows(m.schedules.daily)};
 for(const [id,count]of [['AMD-SDM-0089',1],['AMD-SDM-0009',1],['AMD-SDM-0012',2]]){
 const a=groupLessonSchedules({yearId:pack.academicYearId,session:{activeRole:'guru_mapel',profile:{staffId:id}},master}).filter(s=>s.groupId.startsWith('GRP-GEMA-LESSON'));assert.equal(a.length,count);assert.ok(a.every(s=>s.startTime===(id.endsWith('89')?'08:30':'14:00')));
 }
});
test('GEMA combined roster deduplicates Mutqin boys/girls and excludes Ziyadah and inactive placements',()=>{
 const master={groups:[{id:'a',name:'Mutqin Putra',gemaProgram:true},{id:'b',name:'Mutqin Putri',gemaProgram:true}],groupAssignments:{a:{p:true},b:{w:true,p:true}},students:[{id:'p',name:'Putra'},{id:'w',name:'Putri'},{id:'z',name:'Ziyadah'}],roomAssignments:{p:{roomId:'ROOM-PTR-GEMA'},w:{roomId:'ROOM-PTRI-GEMA'},z:{roomId:'ROOM-PTR-GEMA'}}};
 assert.equal(gemaLessonStudents({gemaAudience:'all'},master).length,3);assert.equal(gemaLessonStudents({gemaAudience:'mutqin'},master).length,2);master.roomAssignments.w.status='inactive';assert.equal(gemaLessonStudents({gemaAudience:'mutqin'},master).length,1);
});
test('kajian replaces overlapping Quran attendance while preserving the remainder',()=>{
 const master={groups:rows(m.groups),dailySchedules:rows(m.schedules.daily)},s={startTime:'09:00',endTime:'11:00',academicYearId:pack.academicYearId};
 assert.deepEqual(quranLessonWindows({gemaProgram:true,name:'Mutqin'},s,'Sabtu',master),[{startTime:'09:30',endTime:'11:00'}]);
 assert.deepEqual(quranLessonWindows({gemaProgram:true,name:'Mutqin'},{...s,startTime:'14:00',endTime:'15:30'},'Senin',master),[]);
});
test('student correction reuses existing identity by NISN and refuses ambiguous matches',async()=>{
 const c=vm.createContext({}),repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',()=>{});this.setExport('bulkPatchRoot',()=>{});},{context:c});const mod=new vm.SourceTextModule(fs.readFileSync('assets/js/confirmed-updates.js','utf8'),{context:c});await mod.link(()=>repo);await mod.evaluate();const fn=mod.namespace.studentClassPatch;
 const r=pack.students[0],p={...pack,students:[r]},students={existing:{name:r.name,nisn:r.nisn,unitId:r.unitId}};
 assert.ok(fn(p,students,m.classes)[`assignments/classes/${pack.academicYearId}/existing`]);assert.ok(!Object.keys(fn(p,students,m.classes)).includes('students/'+r.id));
 assert.throws(()=>fn(p,{...students,duplicate:students.existing},m.classes),/ganda/);
 assert.equal(pack.students.find(r=>r.name==='DINDA CAHYATI').existing,true);assert.equal(pack.students.find(r=>r.name==='MUHAMMAD AKBAR').existing,true);
});
