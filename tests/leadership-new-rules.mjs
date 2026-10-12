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
