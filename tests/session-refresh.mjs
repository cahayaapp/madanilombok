import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshRoleSession} from '../assets/js/session-refresh.js';
import {sessionForRole} from '../assets/js/role-experience.js';
import {counselorLevel,routeCounselorCase} from '../assets/js/counselor-model.js';
const old=()=>({user:{uid:'muhasim-test'},roles:['konselor'],profile:{roles:['konselor'],counselorLevel:'PEMULA',scopeGender:'P'}});
test('saved Madya scope replaces stale session before moral case filtering',async()=>{
 const session=old();let path;
 await refreshRoleSession(session,'konselor',async p=>{path=p;return {roles:['konselor'],active:true,roleScopes:{konselor:{counselorLevel:'MADYA',scopeGender:'L'}}};});
 assert.equal(path,'users/muhasim-test');
 const scoped=sessionForRole(session,'konselor');
 assert.equal(counselorLevel(scoped.profile),routeCounselorCase({category:'Moral/Etika'}).level);
 assert.equal(scoped.profile.scopeGender,'L');
 assert.equal(session.profile.counselorLevel,undefined);
});
test('missing, revoked, removed role or unreadable profile cannot reuse stale access',async()=>{
 for(const value of [null,{active:false,roles:['konselor']},{accessRevoked:true,roles:['konselor']},{roles:['guru_mapel']}])await assert.rejects(refreshRoleSession(old(),'konselor',async()=>value));
 await assert.rejects(refreshRoleSession(old(),'konselor',async()=>{throw Error('offline');}),/offline/);
});

test('role normalization ignores numeric keys and unknown roles from legacy profiles',async()=>{
 const {roleIds}=await import('../assets/js/user-access-model.js');
 const valid=['head_boys_dorm','guru_mapel','konselor','mentor_tahsin_tahfiz'];
 const numeric=Object.fromEntries(Array.from({length:35},(_,i)=>[String(i),true]));
 for(const profile of [
  {role:valid[0],roles:valid,roleFlags:{...numeric,konselor:true}},
  {roles:{...numeric,...Object.fromEntries(valid.map(r=>[r,true])),admin:false,unknown:true}},
  {roles:[...valid,'0','34','unknown'],roleFlags:numeric}
 ])assert.deepEqual(roleIds(profile),valid);
 const session=old();
 await refreshRoleSession(session,'konselor',async()=>({roles:valid,roleFlags:numeric}));
 assert.deepEqual(session.roles,valid);
});
