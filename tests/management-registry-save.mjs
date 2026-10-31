import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../assets/js/management-registry.js',import.meta.url),'utf8');
const rules=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url),'utf8')).rules.madani_app.workspaces.$yearId;
const registries={observation:'observations',coaching:'coaching',standards:'standards',targets:'targets',systemic:'systemic',changes:'changes'};
const snapshot=value=>({val:()=>value??null,exists:()=>value!=null,child:path=>snapshot(path.split('/').reduce((v,k)=>v?.[k],value)),hasChildren:keys=>keys.every(k=>value?.[k]!=null)});

for(const [route,collection] of Object.entries(registries))for(const editing of [false,true]){
 test(`${collection}: ${editing?'update':'create'} satisfies database validation`,async()=>{
  const data={title:'Example',date:'2026-10-31',scope:'all',personUid:'person',condition:'Observed',discussion:'Discussed',status:'OPEN',kind:'ARAH',result:'',reviewDate:'2026-11-01'};
  const old=editing?{id:'record',...data,academicYearId:'y',createdBy:'original',createdAt:1,updatedBy:'original',updatedAt:1,version:2,history:{original:{status:'OPEN'}}}:null;
  let save,written;
  const form={elements:[],querySelectorAll:()=>[{value:'education'}],reset(){}};
  const elements=new Map();
  const edit={dataset:{edit:'record'}};
  const root={querySelector(selector){if(selector==='#registryForm')return form;if(!elements.has(selector))elements.set(selector,{value:''});return elements.get(selector);},querySelectorAll:()=>editing?[edit]:[]};
  const noop=()=>'';
  const stubs={
   './boarding-personnel-scope.js':{dormPersonnel:()=>[]},
   './repository.js':{
    listNode:async path=>path==='users'?[{id:'person',name:'Person',active:true}]:path===`workspaces/y/${collection}`&&old?[old]:[],
    createWorkspaceRecord:async(path,payload,actor)=>{assert.equal(path,`workspaces/y/${collection}`);written={...payload,createdBy:actor,updatedBy:actor,createdAt:1,updatedAt:1};},
    transitionWorkspaceRecord:async(path,id,transition,actor)=>{assert.equal(path,`workspaces/y/${collection}`);assert.equal(id,'record');written={...transition(old),updatedBy:actor,updatedAt:2};},
    commitCaseOperation:noop
   },
   './permissions.js':{canAccess:()=>true,ROLE_LABELS:{}},
   './workflow-model.js':{managementScope:()=> 'all',canSeeManagement:()=>true},
   './role-experience.js':{localDate:()=> '2026-10-31',filterScopedStudents:()=>[]},
   './modules/common.js':Object.fromEntries(['pageHeader','panel','formRow','input','textarea','select','selectOptions','badge','empty'].map(k=>[k,noop]).concat([['escapeHtml',v=>String(v??'')],['attachAsync',(_form,handler)=>{save=handler;}]]))
  };
  const context=vm.createContext({crypto:webcrypto});
  const module=new vm.SourceTextModule(source,{context});
  await module.link(async specifier=>{const values=stubs[specifier];assert.ok(values,specifier);return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value] of Object.entries(values))this.setExport(key,value);},{context});});
  await module.evaluate();
  await module.namespace.renderRegistry({yearId:'y',session:{activeRole:'admin',user:{uid:'actor'},profile:{active:true}},master:{},root,rerender:async()=>{}},`management-${route}`);
  if(editing)edit.onclick();
  await save({...data});
  assert.equal(written.academicYearId,'y');
  assert.equal(written.version,editing?3:1);
  assert.equal(written.createdBy,editing?'original':'actor');
  if(editing)assert.ok(written.history.original);
  const validate=new Function('auth','data','newData','$yearId',`return (${rules[collection].$recordId['.validate']})`);
  const valid=record=>validate({uid:'actor'},snapshot(old),snapshot(record),'y');
  assert.equal(valid(written),true);
  assert.equal(valid({...written,academicYearId:undefined}),false);
  assert.equal(valid({...written,academicYearId:'other-year'}),false);
  if(editing)assert.equal(valid({...written,createdBy:'actor'}),false);
 });
}
