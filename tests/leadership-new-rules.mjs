import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const rules=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url))).rules.madani_app;
function snap(v,parent){const s={val:()=>v??null,exists:()=>v!=null,child:p=>p.split('/').reduce((s,k)=>snap(s.val()?.[k],s),s),parent:()=>parent,hasChildren:ks=>ks.every(k=>v?.[k]!=null),isString:()=>typeof v==='string',isBoolean:()=>typeof v==='boolean'};return s;}
function run(expression,{actor,old=null,next,gender='P',owner='petugas',root={}}){return Function('auth','root','data','newData','$gender','$owner','$year','$request','$staffId',`return (${expression});`)({uid:'actor'},snap({madani_app:{users:{actor},...root}}),snap(old),snap(next),gender,owner,'y','r','s');}
const request=rules.boarding.naqib_leaves.$year.$gender.$owner.$request;
test('server decision is one-time, own gender only, cannot self approve',()=>{
 const opts={actor:{role:'head_girls_dorm',active:true},next:{actorUid:'actor',status:'approved'},root:{boarding:{naqib_leaves:{y:{P:{petugas:{r:{ownerUid:'petugas'}}}}}}}};
 assert.equal(run(request.decision['.write'],opts),true);
 assert.equal(run(request.decision['.write'],{...opts,actor:{role:'head_boys_dorm'}}),false);
 assert.equal(run(request.decision['.write'],{...opts,old:{status:'rejected'}}),false);
 assert.equal(run(request.decision['.write'],{...opts,owner:'actor'}),false);
 assert.equal(run(request.decision['.write'],{...opts,actor:{role:'head_girls_dorm',accessRevoked:true}}),false);
});
test('server duty writes require canonical staff gender and own head role',()=>{
 const rule=rules.settings.naqibDuty.staff.$staffId['.write'],opts={actor:{role:'head_girls_dorm'},next:{gender:'P',updatedBy:'actor'},root:{staff:{s:{gender:'P'}}}};
 assert.equal(run(rule,opts),true);assert.equal(run(rule,{...opts,actor:{role:'head_boys_dorm'}}),false);
 assert.equal(run(rule,{...opts,root:{staff:{s:{gender:'L'}}}}),false);assert.equal(run(rule,{...opts,old:{gender:'L'}}),false);
});
test('resident and worship validation reject missing year and accept complete year metadata',()=>{
 for(const collection of ['resident_staff','staff_worship']){
 const expr=rules.workspaces.$yearId[collection].$recordId['.validate'];
 const check=next=>Function('auth','data','newData','$yearId',`return (${expr});`)({uid:'actor'},snap(null),snap(next),'y');
 const payload={createdBy:'actor',createdAt:1,updatedBy:'actor',updatedAt:1};assert.equal(check(payload),false);assert.equal(check({...payload,academicYearId:'y'}),true);assert.equal(check({...payload,academicYearId:'wrong'}),false);
 }
});

test('resident settings honor map-form leadership roles without crossing dorm boundaries',()=>{
 const expr=rules.workspaces.$yearId.resident_staff.$recordId['.write'];
 const check=(role,gender,scope,revoked=false)=>Function('auth','root','data','newData','$recordId',`return (${expr});`)({uid:'u'},snap({madani_app:{users:{u:{roles:{[role]:true},active:true,accessRevoked:revoked}},staff:{s:{gender}}}}),snap(null),snap({scope,updatedBy:'u'}),'s');
 assert.equal(check('head_boys_dorm','L','boarding-L'),true);
 assert.equal(check('head_girls_dorm','P','boarding-P'),true);
 assert.equal(check('head_boys_dorm','P','boarding-P'),false);
 assert.equal(check('head_boys_dorm','P','boarding-L'),false);
 assert.equal(check('head_boys_dorm','L','boarding-L',true),false);
});
