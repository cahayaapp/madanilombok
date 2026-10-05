import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildStaffAccountPlan,lastNameEmail,inferStaffRoles} from '../assets/js/staff-account-plan.js';
const seed=JSON.parse(fs.readFileSync(new URL('../seed/master-data.json',import.meta.url)));
const leadership=JSON.parse(fs.readFileSync(new URL('../seed/leadership-assignments.json',import.meta.url))).assignments;
const rows=node=>Object.entries(node).map(([id,r])=>({id,...r}));
test('last-name login removes titles and degree suffixes',()=>{
 assert.equal(lastNameEmail('ABD. HAYYI'),'hayyi@madaniapp');
 assert.equal(lastNameEmail('ABD. HAYYI','almadani.app'),'hayyi@almadani.app');
 assert.equal(lastNameEmail('Ustadzah Fathul Uyun, S.Pd.'),'uyun@madaniapp');
 assert.throws(()=>lastNameEmail(''));
});
test('duplicate last names produce stable unique logins and reruns reuse existing profiles',()=>{
 const staff=[{id:'a',name:'Ali Jannah',roles:'Guru'},{id:'b',name:'Siti Jannah',roles:'Guru'}];
 const plan=buildStaffAccountPlan(staff);assert.deepEqual(plan.map(r=>r.email),['jannah@madaniapp','jannah2@madaniapp']);
 const rerun=buildStaffAccountPlan(staff.slice().reverse(),[{id:'uid',staffId:'b',email:'jannah2@madaniapp',accountKind:'staff'}]);
 assert.equal(rerun.find(r=>r.staffId==='b').status,'existing');assert.equal(rerun.find(r=>r.staffId==='b').email,'jannah2@madaniapp');
});
test('confirmed leaders retain separate institutional and school scopes',()=>{
 const plan=buildStaffAccountPlan(rows(seed.staff),[],rows(seed.classes),[],leadership);
 const director=plan.find(r=>r.staffId==='AMD-SDM-0001');
 assert.ok(director.roles.includes('director'));assert.ok(director.roles.includes('head_formal_school'));
 assert.deepEqual(director.roleScopes.director.unitIds,[]);assert.deepEqual(director.roleScopes.head_formal_school.unitIds,['UNIT-SMK']);
 assert.ok(director.roleScopes.head_formal_school.classIds.every(id=>seed.classes[id].unitId==='UNIT-SMK'));
 const deputy=plan.find(r=>r.staffId==='AMD-SDM-0054');assert.deepEqual(deputy.roleScopes.head_formal_school.unitIds,['UNIT-SMP']);
});
test('ambiguous or unrelated staff never receive guessed admin or leadership privileges',()=>{
 assert.deepEqual(inferStaffRoles({name:'Rumiati',roles:'Tenaga Kependidikan; Tendik'}),[]);
 assert.deepEqual(inferStaffRoles({id:'x',name:'Fahri',roles:''},[{displayName:'Fahri H',suggestedRole:'konselor',staffCandidates:[{staffId:'x'}]}]),[]);
 const wrong=buildStaffAccountPlan([{id:'AMD-SDM-0001',name:'Orang Lain',roles:'Guru'}],[],[],[],leadership)[0];
 assert.equal(wrong.status,'identity_mismatch');assert.equal(wrong.roles.includes('director'),false);
});
test('staff data and operational student IDs remain intact during account planning',()=>{
 const before=JSON.stringify(seed);const plan=buildStaffAccountPlan(rows(seed.staff),[],rows(seed.classes),[],leadership);
 assert.equal(plan.length,Object.keys(seed.staff).length);assert.equal(new Set(plan.map(p=>p.email)).size,plan.length);assert.equal(JSON.stringify(seed),before);
});
