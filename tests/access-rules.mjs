// Unit checks of RTDB rule expressions; not a Firebase Emulator integration test.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const rules=JSON.parse(fs.readFileSync(new URL('../database.rules.json',import.meta.url))).rules.madani_app;
function snapshot(value){return {val:()=>value??null,exists:()=>value!==null&&value!==undefined,child:path=>snapshot(path.split('/').reduce((v,k)=>v?.[k],value)),hasChildren:keys=>keys.every(k=>value?.[k]!==undefined),isNumber:()=>typeof value==='number',isString:()=>typeof value==='string',isBoolean:()=>typeof value==='boolean'};}
function check(expression,profiles,current={},next={},uid='actor',target='target'){
 if(typeof expression==='boolean')return expression;
 return Function('auth','root','data','newData','$uid','$yearId','$studentId','$recordId',`return (${expression})`)({uid},snapshot({madani_app:{users:profiles}}),snapshot(current),snapshot(next),target,'year','student','record');
}
const admin={role:'admin',roleFlags:{admin:true},active:true};
test('revoked and inactive users cannot read operational data or write any branch',()=>{
 const writes=[];const walk=o=>{for(const [k,v]of Object.entries(o)){if(k==='.write')writes.push(v);else if(v&&typeof v==='object')walk(v)}};walk(rules);
 for(const actor of [{...admin,active:false},{...admin,accessRevoked:true}]){
  assert.equal(check(rules['.read'],{actor}),false);
  for(const expression of writes)assert.equal(check(expression,{actor},{},{role:'admin',active:true}),false);
 }
});
test('active finance roles retain their existing write eligibility',()=>{
 assert.equal(check(rules.finance['.write'],{actor:{role:'kasir',active:true}}),true);
 assert.equal(check(rules.finance['.write'],{actor:{role:'wali_santri',active:true}}),false);
});
test('admin can revoke others but cannot remove their own final admin access',()=>{
 const rule=rules.users.$uid['.write'];
 assert.equal(check(rule,{actor:admin},admin,{...admin,active:false},'actor','other'),true);
 assert.equal(check(rule,{actor:admin},admin,{...admin,active:false},'actor','actor'),false);
 assert.equal(check(rule,{actor:admin},admin,{role:'guru_mapel',active:true},'actor','actor'),false);
 assert.equal(check(rule,{actor:admin},admin,null,'actor','other'),false);
});
test('initial bootstrap remains possible and disabled users can read only their own profile rule',()=>{
 assert.equal(check(rules.users.$uid['.write'],undefined,null,{role:'super_admin'},'first','first'),true);
 assert.equal(check(rules.users.$uid['.read'],{},null,null,'first','first'),true);
 assert.equal(check(rules.users.$uid['.read'],{},null,null,'first','other'),false);
});
