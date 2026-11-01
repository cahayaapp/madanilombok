import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {UNIT_ADMIN_ROLES,ADMIN_ACCESS_ROLES,hasAdminAccess,openAdminData,ADMIN_DATA_HREF} from '../assets/js/admin-access.js';
import {roleIds,applyUserDraft} from '../assets/js/user-access-model.js';
import {canAccess} from '../assets/js/permissions.js';
import {prepareUnitAdminRules,ADMIN_DATA_BRANCHES} from '../scripts/prepare-unit-admin-rules.mjs';
const rules=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url))).rules.madani_app;
function snapshot(v){return {val:()=>v??null,exists:()=>v!=null,child:p=>snapshot(String(p).split('/').reduce((o,k)=>o?.[k],v)),hasChildren:keys=>keys.every(k=>v?.[k]!=null)};}
function check(expr,profile,next={},old=null,target='other'){
 return Function('auth','root','data','newData','$uid',`return (${expr});`)({uid:'actor'},snapshot({madani_app:{users:{actor:profile}}}),snapshot(old),snapshot(next),target);
}
const profiles=role=>[{role,active:true},{role:'guru_mapel',roleFlags:{[role]:true},active:true},{roles:{[role]:true},active:true},{roles:['guru_mapel',role],active:true}];
test('all three unit leaders enter the admin document from Manajemen Data and retain their role',()=>{
 for(const role of UNIT_ADMIN_ROLES){const session={activeRole:role,roles:[role],profile:{active:true}},original=JSON.stringify(session),root={innerHTML:''};let href;
 openAdminData({session,root,openPage:url=>{href=url;}});assert.equal(href,ADMIN_DATA_HREF);assert.match(root.innerHTML,/Buka halaman Admin/);assert.equal(JSON.stringify(session),original);
 for(const route of ['students','staff','school','boarding','lessons','programs','features','accounts'])assert.equal(canAccess('workspace.admin-'+route,[role]),true);
 }
 assert.throws(()=>openAdminData({session:{activeRole:'guru_mapel',roles:['guru_mapel'],profile:{}}}),/tidak tersedia/);
});
test('real requireAdmin guard admits assigned leaders and rejects unassigned or revoked sessions',async()=>{
 for(const role of [...ADMIN_ACCESS_ROLES,'guru_mapel','wali_santri'])for(const profile of profiles(role)){
 const window={location:{href:'',reload(){}}},context=vm.createContext({window,sessionStorage:{removeItem(){}},JSON});
 const values={hasAdminAccess,roleIds,auth:{},getNode:async()=>profile,watchUserProfile:()=>()=>{},onAuthStateChanged:(_auth,ready)=>{queueMicrotask(()=>ready({uid:'actor'}));return()=>{};},signOut:async()=>{},signInWithEmailAndPassword:async()=>{}};
 const module=new vm.SourceTextModule(readFileSync(new URL('../assets/js/auth.js',import.meta.url),'utf8'),{context});
 await module.link(spec=>{const keys=spec.includes('admin-access')?['hasAdminAccess']:spec.includes('user-access-model')?['roleIds']:spec.includes('repository')?['getNode','watchUserProfile']:spec.startsWith('https:')?['onAuthStateChanged','signInWithEmailAndPassword','signOut']:['auth'];return new vm.SyntheticModule(keys,function(){for(const k of keys)this.setExport(k,values[k]);},{context});});await module.evaluate();
 if(ADMIN_ACCESS_ROLES.includes(role)){const session=await module.namespace.requireAdmin();assert.ok(session.roles.includes(role));}
 else await assert.rejects(module.namespace.requireAdmin(),/admin tidak tersedia/);
 profile.accessRevoked=true;await assert.rejects(module.namespace.requireAdmin(),/belum aktif/);
 }
});
test('unit leaders can write every administrative branch cross-unit but revoked/ordinary roles cannot gain this grant',()=>{
 for(const role of UNIT_ADMIN_ROLES)for(const profile of profiles(role))for(const branch of [...ADMIN_DATA_BRANCHES,'academic/quran_placements']){
 const node=branch.split('/').reduce((n,k)=>n[k],rules),next={unitId:'OTHER-UNIT',gender:'P'};
 assert.equal(check(node['.write'],profile,next),true,`${role}/${branch}`);
 assert.equal(check(node['.write'],{...profile,accessRevoked:true},next),false,`${role}/${branch} revoked`);
 assert.equal(check(node['.write'],{...profile,active:false},next),false,`${role}/${branch} inactive`);
 assert.equal(check(node['.write'],{role:'guru_mapel',active:true},next),false,`${branch} teacher`);
 }
});
test('unit leaders create and change any user role, preserve self admin authority, and cannot delete profiles',()=>{
 const node=rules.users.$uid;
 for(const role of UNIT_ADMIN_ROLES)for(const profile of profiles(role)){
 const next={role:'super_admin',active:true};
 assert.equal(check(node['.write'],profile,next),true);assert.equal(check(node['.validate'],profile,next),true);
 assert.equal(check(node['.write'],profile,null),false);
 assert.equal(check(node['.write'],profile,{role,active:true},profile,'actor'),true);
 assert.equal(check(node['.write'],profile,{role:'guru_mapel',active:true},profile,'actor'),false);
 assert.equal(check(node['.write'],profile,{role,active:false},profile,'actor'),false);
 assert.equal(check(node['.write'],{...profile,accessRevoked:true},next),false);
 }
 const d={name:'Kepala',roles:['head_boys_dorm'],defaultRole:'head_boys_dorm',roleScopes:{},active:true};
 assert.doesNotThrow(()=>applyUserDraft({},d,{},'actor','actor','e'));
 assert.throws(()=>applyUserDraft({},{...d,roles:['guru_mapel'],defaultRole:'guru_mapel'}, {},'actor','actor','e'),/sendiri/);
});
test('production patch preserves all operational domains and existing rules; repeat is idempotent',()=>{
 const before={rules:{madani_app:{finance:{'.write':'finance'},boarding:{'.write':'boarding'},parent:{'.write':'parent'},health:{'.write':'health'},users:{$uid:{'.write':'old-user-write','.validate':'old-user-validation',displayName:{'.write':'self-name'}}},settings:{'.write':'old-settings'},academic:{'.write':'academic',quran_records:{'.write':'quran'}},workspaces:{holiday_daily:{'.write':false}}}}};
 const {rules:after,changes}=prepareUnitAdminRules(before);
 assert.equal(changes.length,18);
 for(const key of ['finance','boarding','parent','health','workspaces'])assert.deepEqual(after.rules.madani_app[key],before.rules.madani_app[key]);
 assert.deepEqual(after.rules.madani_app.users.$uid.displayName,before.rules.madani_app.users.$uid.displayName);
 assert.equal(after.rules.madani_app.academic['.write'],'academic');assert.deepEqual(after.rules.madani_app.academic.quran_records,before.rules.madani_app.academic.quran_records);
 assert.equal(prepareUnitAdminRules(after).changes.length,0);
});

test('nested user validators accept administrator roles and cross-unit scopes for unit heads',()=>{
 const actor="root.child('madani_app/users').child(auth.uid)";
 function visit(node){for(const [key,value] of Object.entries(node)){
  if(key==='.validate'&&typeof value==='string'&&value.includes('roleFlags/admin')){
   for(const role of UNIT_ADMIN_ROLES)for(const profile of profiles(role))assert.equal(check(value,profile,{admin:true,unitIds:['OTHER']}),true);
  }else if(value&&typeof value==='object')visit(value);
 }}visit(rules.users.$uid);
});
