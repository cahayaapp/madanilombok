import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {buildStaffAccountPlan} from '../assets/js/staff-account-plan.js';
const context=vm.createContext({}),mock=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',()=>{});this.setExport('bulkPatchRoot',()=>{});},{context});
const m=new vm.SourceTextModule(fs.readFileSync(new URL('../assets/js/sd-mentor-update.js',import.meta.url),'utf8'),{context});await m.link(()=>mock);await m.evaluate();
test('SD homeroom activation preserves other roles and does not grant TK or inactive accounts',()=>{
 const classes={sd:{unitId:'UNIT-SD',homeroomStaffId:'teacher'},tk:{unitId:'UNIT-TK',homeroomStaffId:'tk'}};
 const {patch,teachers,accounts}=m.namespace.sdMentorRolePatch(classes,{teacher:{appRoles:['guru_mapel']},tk:{}},{a:{staffId:'teacher',role:'guru_mapel',roleFlags:{kasir:true}},inactive:{staffId:'teacher',active:false},b:{staffId:'tk',role:'guru_mapel'}});
 assert.equal(teachers,1);assert.equal(accounts,1);assert.ok(patch['users/a/roles'].includes('kasir'));assert.ok(patch['users/a/roles'].includes('guru_wali'));assert.ok(!Object.keys(patch).some(k=>k.startsWith('users/b/')||k.startsWith('users/inactive/')||k.startsWith('finance/')));
 const rows=buildStaffAccountPlan([{id:'teacher',name:'Guru SD',appRoles:['guru_mapel']},{id:'tk',name:'Guru TK',appRoles:['guru_mapel']}],[],Object.entries(classes).map(([id,c])=>({id,...c})));
 assert.ok(rows.find(r=>r.staffId==='teacher').roles.includes('guru_wali'));assert.ok(!rows.find(r=>r.staffId==='tk').roles.includes('guru_wali'));
});
