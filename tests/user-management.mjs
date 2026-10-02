import test from 'node:test';
import assert from 'node:assert/strict';
import {userDraft,applyUserDraft,revokeUserAccess,roleIds} from '../assets/js/user-access-model.js';
import {sessionForRole} from '../assets/js/role-experience.js';
const master={staff:[{id:'s1',name:'Direktur'}],units:[{id:'smk',name:'SMK'},{id:'smp',name:'SMP'}],classes:[{id:'c1',unitId:'smk'},{id:'c2',unitId:'smp'}],subjects:[],groups:[],students:[{id:'child1'},{id:'child2'}]};
const draft={name:'Abdul Hayyi',staffId:'s1',roles:['director','head_formal_school'],defaultRole:'director',roleScopes:{director:{unitIds:[]},head_formal_school:{unitIds:['smk'],classIds:['c1']}},active:true};
test('save preserves unrelated data and supports independent scopes per role',()=>{
 const old={email:'hayyi@example.test',createdAt:12,customNote:'retain',role:'guru_mapel',roles:['guru_mapel'],roleFlags:{guru_mapel:true},classIds:['c2']};
 const saved=applyUserDraft(old,draft,master,'admin','hayyi','event');
 assert.equal(saved.email,old.email);assert.equal(saved.createdAt,12);assert.equal(saved.customNote,'retain');assert.deepEqual(roleIds(saved),['director','head_formal_school']);assert.equal(saved.roleFlags.guru_mapel,undefined);assert.equal(saved.legacyRoleData.role,'guru_mapel');
 const session={profile:saved,roles:saved.roles};assert.deepEqual(sessionForRole(session,'director').profile.classIds,[]);assert.deepEqual(sessionForRole(session,'head_formal_school').profile.classIds,['c1']);
});
test('invalid main role and references are rejected before persistence',()=>{
 assert.throws(()=>applyUserDraft({}, {...draft,defaultRole:'super_admin'},master,'admin','user','e'),/Role utama/);
 assert.throws(()=>applyUserDraft({}, {...draft,roleScopes:{head_formal_school:{unitIds:['smk'],classIds:['c2']}}},master,'admin','user','e'),/luar unit/);
 assert.throws(()=>applyUserDraft({}, {...draft,staffId:'missing'},master,'admin','user','e'),/SDM/);
});
test('self-lockout is blocked but another user can be revoked and restored',()=>{
 assert.throws(()=>revokeUserAccess({},'admin','admin','e'),/sendiri/);
 assert.throws(()=>applyUserDraft({},draft,master,'admin','admin','e'),/sendiri/);
 const old={...applyUserDraft({},draft,master,'admin','user','e'),email:'x@example.test'};
 const removed=revokeUserAccess(old,'admin','user','r');assert.equal(removed.active,false);assert.equal(removed.accessRevoked,true);assert.equal(removed.email,old.email);assert.equal(Object.keys(removed.accessHistory).length,2);
 const restored=applyUserDraft(removed,{...draft,active:true},master,'admin','user','s');assert.equal(restored.accessRevoked,false);assert.equal(restored.active,true);assert.equal(Object.keys(restored.accessHistory).length,3);
});
test('guardian relinking clears old ownership and finance unit stays role-specific',()=>{
 const guardian={name:'Wali',roles:['wali_santri'],defaultRole:'wali_santri',roleScopes:{wali_santri:{studentIds:['child2']}},active:true};
 const next=applyUserDraft({studentIds:['child1'],studentId:'child1',studentAccess:{child1:true}},guardian,master,'admin','parent','e');assert.deepEqual(next.studentAccess,{child2:true});assert.equal(next.studentId,'child2');
 const cashier={name:'Kasir',roles:['kasir'],defaultRole:'kasir',roleScopes:{kasir:{financeUnit:'PUTRI'}},active:true};
 assert.deepEqual(applyUserDraft({},cashier,master,'admin','cashier','e').roleScopes.kasir.cashierUnits,['PUTRI']);
});
test('legacy profiles populate draft without discarding original role scopes',()=>{
 const p={name:'Guru',role:'guru_mapel',roles:{guru_wali:true},roleFlags:{konselor:false},classIds:['c1'],scopeGender:'L'};const before=JSON.stringify(p);const d=userDraft(p);assert.deepEqual(d.roles,['guru_mapel','guru_wali']);assert.deepEqual(d.roleScopes.guru_mapel.classIds,['c1']);assert.equal(JSON.stringify(p),before);
});
