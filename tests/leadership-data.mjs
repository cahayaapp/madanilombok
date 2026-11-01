import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {dataScope,inDataScope,validateMaster,placementChange} from '../assets/js/leadership-data-model.js';
const rules=JSON.parse(fs.readFileSync('database.rules.json')).rules.madani_app;
const actor={role:'head_formal_school',roleFlags:{head_formal_school:true},active:true,roleScopes:{head_formal_school:{unitIds:['SD']}}};
const session={activeRole:actor.role,roles:[actor.role],profile:actor,user:{uid:'a'}},scope=dataScope(session);
const master={units:[{id:'SD',code:'SD'},{id:'SMP',code:'SMP'}],students:[{id:'s',name:'Satu',unitId:'SD',gender:'P',boardingStatus:'boarding',nisn:'001',status:'active'}],staff:[{id:'t',name:'Guru',unitIds:['SD'],gender:'P',status:'active'}],dormitories:[{id:'p',gender:'P'},{id:'l',gender:'L'}]};
function snap(value,parent=null){const obj={val:()=>value??null,exists:()=>value!=null,numChildren:()=>Object.keys(value||{}).length,isString:()=>typeof value==='string',hasChildren:keys=>keys?keys.every(k=>value?.[k]!=null):Object.keys(value||{}).length>0,parent:()=>parent,child(path){let cur=obj;for(const key of path.split('/'))cur=snap(cur.val()?.[key],cur);return cur;}};return obj;}
function run(expression,{profile=actor,old=null,next=null,root={},vars={}}={}){return Function('auth','root','data','newData','$uid','$recordId','$yearId','$studentId','$groupId','$role','$index','$field',`return ${expression}`)({uid:'a'},snap({madani_app:{users:{a:profile},settings:{currentAcademicYearId:'y'},students:{s:master.students[0]},staff:{t:master.staff[0]},classes:{c:{unitId:'SD'},other:{unitId:'SMP'}},dormitories:{p:{gender:'P'},l:{gender:'L'}},...root}}),snap(old),snap(next),vars.uid||'target','record','y','s',vars.groupId||'g',vars.role||'guru_mapel','0',vars.field||'unitIds');}
test('scope is closed for unknown roles, missing units and other units/gender',()=>{
 assert.throws(()=>dataScope({...session,roles:[]}));assert.equal(inDataScope('students',master.students[0],{...scope,units:[]}),false);assert.equal(inDataScope('students',{unitId:'SMP'},scope),false);
 const dorm={...scope,school:false,gender:'L'};assert.equal(inDataScope('students',master.students[0],dorm),false);assert.equal(inDataScope('rooms',{dormitoryId:'p'},dorm,master),false);
});
test('identity and placements reject duplicate NISN, wrong class and SD mentor override',()=>{
 assert.throws(()=>validateMaster('students',{...master.students[0],id:'new'},null,scope,master),/sudah dipakai/);
 assert.throws(()=>placementChange({kind:'classes',student:master.students[0],target:{id:'c',unitId:'SMP'},scope,master,yearId:'y'}));
 assert.throws(()=>placementChange({kind:'mentors',student:master.students[0],target:master.staff[0],scope,master,yearId:'y'}),/SD/);
});
test('legacy school child condition stays scoped; admin parent grant is tested separately',()=>{
 const rule=rules.students.$recordId['.write'];const s=master.students[0];assert.equal(run(rule,{next:s}),true);assert.equal(run(rule,{old:s,next:{...s,unitId:'SMP'}}),false);assert.equal(run(rule,{old:{...s,unitId:'SMP'},next:s}),false);assert.equal(run(rule,{old:s,next:null}),false);assert.equal(run(rule,{profile:{...actor,active:false},next:s}),false);
});
test('legacy dorm child condition stays scoped under new admin parent grant',()=>{
 const profile={role:'head_girls_dorm',active:true};assert.equal(run(rules.rooms.$recordId['.write'],{profile,next:{name:'Kamar',dormitoryId:'p'}}),true);assert.equal(run(rules.rooms.$recordId['.write'],{profile,next:{name:'Kamar',dormitoryId:'l'}}),false);assert.equal(run(rules.groups.$recordId['.write'],{profile,old:{name:'Halaqah',gender:'P'},next:{name:'Baru',genderScope:'P'}}),true);
});
test('legacy placement child validation is retained under new admin parent grant',()=>{
 const rule=rules.assignments.classes.$yearId.$studentId['.write'];const next={studentId:'s',academicYearId:'y',classId:'c',status:'active'};assert.equal(run(rule,{next}),true);assert.equal(run(rule,{next:{...next,classId:'other'}}),false);assert.equal(run(rule,{old:next,next:null}),true);
});
test('approved unit administrators can manage existing accounts, privileged roles and scope',()=>{
 const p={managementOwnerUid:'a',managementUnitId:'SD',managementGender:'',staffId:'t',role:'guru_mapel',defaultRole:'guru_mapel',roles:['guru_mapel'],roleFlags:{guru_mapel:true},roleScopes:{guru_mapel:{unitIds:['SD']}}};
 assert.equal(run(rules.users.$uid['.write'],{next:p}),true);assert.equal(run(rules.users.$uid['.write'],{old:{managementOwnerUid:'other'},next:p}),true);
 assert.equal(run(rules.users.$uid['.validate'],{next:{...p,role:'admin',defaultRole:'admin'}}),true);
 assert.equal(run(rules.users.$uid.roleFlags.$role['.validate'],{next:true,vars:{role:'admin'}}),true);
 assert.equal(run(rules.users.$uid.roles.$index['.validate'],{next:'admin'}),true);
 assert.equal(run(rules.users.$uid.$other['.validate'],{next:{admin:true}}),true);
});

test('approved unit administrators can configure role scopes across units',()=>{
 const profile={managementUnitId:'SD',managementGender:'',roleScopes:{guru_mapel:{unitIds:['SD'],scopeGender:'',genderScope:''}}};
 function at(expression,path,role='guru_mapel',field='unitIds') {return Function('auth','root','newData','$uid','$role','$field','$index',`return ${expression}`)({uid:'a'},snap({madani_app:{users:{a:actor}}}),snap(profile).child(path),'target',role,field,'0');}
 const rule=rules.users.$uid.roleScopes.$role['.validate'];
 assert.equal(at(rule,'roleScopes/guru_mapel'),true);
 profile.roleScopes.guru_mapel.unitIds=['SMP'];assert.equal(at(rule,'roleScopes/guru_mapel'),true);
 profile.roleScopes.guru_mapel.unitIds=['SD'];profile.roleScopes.guru_mapel.classIds=['foreign'];assert.equal(at(rule,'roleScopes/guru_mapel'),true); // Unit administrators may assign references across units.
 assert.equal(run(rules.users.$uid.roleScopes.$role.classIds.$index['.validate'],{old:'existing',next:'foreign'}),true);
 assert.equal(run(rules.users.$uid.roleScopes.$role.classIds.$index['.validate'],{old:'existing',next:'existing'}),true);
 assert.equal(at(rules.users.$uid.roleScopes.$role.$field['.validate'],'roleScopes/guru_mapel','guru_mapel','studentAccess'),true);
});

test('approved unit administrators can change linked SDM and leadership accounts',()=>{const p={managementOwnerUid:'a',managementUnitId:'SD',managementGender:'',staffId:'t',email:'t@example.test',role:'guru_mapel',roleFlags:{guru_mapel:true},roles:['guru_mapel']}; const rule=rules.users.$uid['.write']; assert.equal(run(rule,{old:{...p,managementOwnerUid:'admin'},next:p}),true);assert.equal(run(rule,{old:{...p,staffId:'foreign'},next:p}),true);assert.equal(run(rule,{old:{...p,role:'director',roleFlags:{director:true}},next:p}),true);});
