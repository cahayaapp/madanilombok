import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const m=await import('data:text/javascript;base64,'+Buffer.from(readFileSync('assets/js/teacher/leave-model.js','utf8')).toString('base64'));
const d={type:'Sakit',startDate:'2026-10-08',endDate:'2026-10-08',startTime:'08:00',endTime:'10:00',reason:'Perlu istirahat',handover:'Tugas halaman 12',contact:'Kontak guru'};
test('teacher leave validates range, reason and teaching handover',()=>{assert.equal(m.validateLeave(d).type,'Sakit');for(const patch of [{endTime:'07:59'},{startDate:'2026-02-30'},{handover:''},{reason:''},{contact:''},{type:'lain'},{endTime:'24:00'}])assert.throws(()=>m.validateLeave({...d,...patch}));});
test('affected lessons respect weekday and partial-day overlap',()=>{const rows=[{id:'yes',day:'Kamis',startTime:'09:00',endTime:'10:20'},{id:'before',day:'Kamis',startTime:'07:00',endTime:'08:00'},{id:'after',day:'Kamis',startTime:'10:00',endTime:'11:00'},{id:'other',day:'Jumat',startTime:'09:00',endTime:'10:00'}];assert.deepEqual(m.affectedLessons(d,rows).map(r=>r.scheduleId),['yes']);assert.equal(m.affectedLessons({...d,endDate:'2026-10-09'},rows).length,3);});
test('only reviewers decide, own requests cannot be approved, terminal decisions immutable',()=>{const r={teacherUid:'guru'},reviewer={uid:'admin',role:'admin'};assert.equal(m.leaveDecision(r,null,reviewer,'approved','Disetujui').status,'approved');assert.throws(()=>m.leaveDecision(r,null,{uid:'guru',role:'admin'},'approved','x'));assert.throws(()=>m.leaveDecision(r,{status:'cancelled'},reviewer,'approved','x'));assert.throws(()=>m.leaveDecision(r,null,{uid:'other',role:'guru_mapel'},'approved','x'));assert.equal(m.leaveDecision(r,null,{uid:'guru',role:'guru_mapel'},'cancelled','Batal').status,'cancelled');});

test('leave server write rules prevent impersonation, self approval and replacing a decision',async()=>{
 const {readFileSync}=await import('node:fs');const rule=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url))).rules.madani_app.academic.teacher_leaves.$yearId.$uid.$requestId;
 const snap=(v,parent)=>({val:()=>v??null,exists:()=>v!=null,child:p=>snap(p.split('/').reduce((o,k)=>o?.[k],v),v),parent:()=>snap(parent)});
 const check=(expr,role,uid,current,next,parent)=>Function('auth','root','data','newData','$uid',`return (${expr})`)({uid},snap({madani_app:{users:{[uid]:{role,active:true,staffId:'staff'}}}}),snap(current,parent),snap(next),'teacher');
 assert.equal(check(rule['.write'],'guru_mapel','teacher',null,{staffId:'staff'}),true);
 assert.equal(check(rule['.write'],'guru_mapel','other',null,{staffId:'staff'}),false);
 assert.equal(check(rule['.write'],'guru_mapel','teacher',{},{}),false);
 const decide=rule.decision['.write'];
 assert.equal(check(decide,'director','reviewer',null,{status:'approved'},{}),true);
 assert.equal(check(decide,'director','teacher',null,{status:'approved'},{}),false);
 assert.equal(check(decide,'guru_mapel','other',null,{status:'approved'},{}),false);
 assert.equal(check(decide,'guru_mapel','teacher',null,{status:'cancelled'},{}),true);
 assert.equal(check(decide,'director','reviewer',{status:'approved'},{status:'rejected'},{}),false);
});
