// Expression/contract tests only: no production records and no Firebase SDK.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canAccess,ROLE_LABELS} from '../assets/js/permissions.js';
const rules=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url))).rules.madani_app;
function snap(value,parent=null){const s={val:()=>value??null,exists:()=>value!=null,child:path=>path.split('/').reduce((s,k)=>snap(s.val()?.[k],s),s),parent:()=>parent,hasChild:path=>s.child(path).exists(),hasChildren:keys=>keys.every(k=>s.child(k).exists()),isString:()=>typeof value==='string',isNumber:()=>typeof value==='number',isBoolean:()=>typeof value==='boolean'};return s;}
function evaluate(expr,profile,next,old=null,extra={},vars={}){
 const args={auth:{uid:'actor'},root:snap({madani_app:{users:{actor:profile,recipient:{role:'director',active:true}},staff:{staff1:{name:'SDM'}},...extra}}),data:snap(old),newData:snap(next),$yearId:'year',$staffId:'staff1',$recordId:'record',$uid:'actor',...vars};
 return typeof expr==='boolean'?expr:Function(...Object.keys(args),`return (${expr});`)(...Object.values(args));
}
const representations=role=>[{role,active:true,staffId:'staff1'},{role:'wali_santri',roleFlags:{[role]:true},active:true,staffId:'staff1'},{roles:{[role]:true},active:true,staffId:'staff1'}];
const base={academicYearId:'year',createdBy:'actor',updatedBy:'actor',createdAt:1,updatedAt:1};
const collections={schedules:'work-schedule',messages:'work-messages',writings:'teacher-writing',teacher_assessments:'teacher-assessment',academic_followups:'academic-followup',findings:'management-findings',observations:'management-observation',coaching:'management-coaching',standards:'management-standards',targets:'management-targets',systemic:'management-systemic',changes:'management-changes'};
for(const [collection,route] of Object.entries(collections))test(`input permission contract: ${route} for every granted role`,()=>{
 const node=rules.workspaces.$yearId[collection].$recordId;
 for(const role of Object.keys(ROLE_LABELS).filter(r=>canAccess(`workspace.${route}`,[r]))){
  const scope=role==='head_boys_dorm'?'boarding-L':role==='head_girls_dorm'?'boarding-P':role==='head_formal_school'?'education':'all';
  const next={...base,scope,status:'NEW',senderUid:'actor',recipientUid:'recipient'};
  for(const profile of representations(role)){
   assert.equal(evaluate(node['.write'],profile,next),true,`${route}/${role}/${JSON.stringify(profile)}`);
   assert.equal(evaluate(node['.validate'],profile,next),true,`${route}/${role} payload`);
   for(const denied of [{...profile,active:false},{...profile,accessRevoked:true}])assert.equal(evaluate(node['.write'],denied,next),false,`${route} revoked/inactive`);
  }
 }
});
test('Tahfiz check-in and student attendance have own-staff write grants, without opening grades',()=>{
 for(const collection of ['teaching_attendance','learning_sessions']){
  const node=rules.academic[collection].$yearId.$staffId;
  for(const profile of representations('mentor_tahsin_tahfiz')){
   assert.equal(evaluate(node['.write'],profile,{}),true,collection);
   assert.equal(evaluate(node['.write'],{...profile,staffId:'other'},{}),false);
   assert.equal(evaluate(node['.write'],{...profile,accessRevoked:true},{}),false);
   assert.equal(evaluate(rules.academic.exam_sessions.$yearId.$staffId['.write'],profile,{}),false);
  }
 }
});
test('UKS stock/exam transaction and leadership permit decision recognize supported role maps',()=>{
 for(const profile of representations('kesehatan'))assert.equal(evaluate(rules.health.$yearId['.write'],profile,{}),true);
 for(const role of ['director','deputy_director'])for(const profile of representations(role)){
  assert.equal(evaluate(rules.health.$yearId.permits.$examId['.write'],profile,{}),true);
  assert.equal(evaluate(rules.health.$yearId['.write'],profile,{}),false);
 }
});
test('management scope and ownership boundaries remain enforced on form writes',()=>{
 for(const collection of ['findings','observations','coaching']){
  const expr=rules.workspaces.$yearId[collection].$recordId['.write'];
  assert.equal(evaluate(expr,{role:'head_boys_dorm',active:true},{...base,scope:'boarding-P'}),false);
  assert.equal(evaluate(expr,{role:'guru_mapel',active:true},{...base,scope:'education'}),false);
 }
 const node=rules.workspaces.$yearId.schedules.$recordId;
 assert.equal(evaluate(node['.write'],{role:'kesehatan',active:true},{...base,createdBy:'other'},{...base,createdBy:'other'}),false);
});
