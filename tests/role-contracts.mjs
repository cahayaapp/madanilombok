import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROLE_LABELS,MENU_GROUPS,ROLE_FEATURES,canAccess} from '../assets/js/permissions.js';
import {ROLE_EXPERIENCE,sessionForRole,bottomRoutes,localDate,filterScopedStudents} from '../assets/js/role-experience.js';
import {validateTransition} from '../assets/js/workflow-model.js';
import {validateActivity,validateReport,HOLIDAY_ACTIVITIES,DEPOSIT_TRANSITIONS} from '../assets/js/holiday-model.js';
const all=MENU_GROUPS.flatMap(g=>g.items),ids=new Set(all.map(i=>i.id));
const session=(activeRole)=>({activeRole,roles:[activeRole],profile:{},user:{uid:'reviewer'}});
test('every assigned role has real schedule/KPI/message destinations',()=>{
 assert.equal(ids.size,all.length,'duplicate menu IDs');
 for(const role of Object.keys(ROLE_LABELS)){
  assert.ok(ROLE_EXPERIENCE[role]);
  const allowed=id=>ids.has(id)&&canAccess(all.find(i=>i.id===id)?.feature||'dashboard',[role]);
  for(const [key,id] of Object.entries(bottomRoutes(role,allowed)))assert.ok(allowed(id),`${role}: ${key} -> ${id}`);
  for(const id of ROLE_EXPERIENCE[role].quick)assert.ok(allowed(id),`${role}: quick ${id}`);
 }
});
test('unknown routes and unassigned roles fail closed',()=>{
 assert.equal(canAccess(undefined,['super_admin']),false);assert.equal(canAccess('dashboard',['unknown']),false);
 assert.throws(()=>sessionForRole({roles:['guru_mapel'],profile:{}},'director'));
 assert.equal(canAccess('workspace.management-findings',['wali_santri']),false);
 assert.equal(canAccess('workspace.deposit-admin',['wali_santri']),false);
});
test('management roles have their own workspace instead of routine personnel forms',()=>{
 for(const r of ['director','deputy_director','head_formal_school','head_boys_dorm','head_girls_dorm']){
  assert.equal(canAccess('workspace.management-control',[r]),true);
  assert.equal(canAccess('boarding.counselor.points',[r]),false);
  assert.equal(canAccess('academic.student_attendance',[r]),false);
 }
});
test('finance access is preserved for cashier and leadership',()=>{
 for(const r of ['kasir','director','deputy_director','admin','super_admin'])assert.ok(ROLE_FEATURES[r].includes('finance.cashier'));
 assert.equal(canAccess('finance.cashier',['wali_santri']),false);
 assert.equal(canAccess('parent.finance',['wali_santri']),true);
});
test('role scope does not mutate identity and enforces dorm gender',()=>{
 const original={roles:['head_boys_dorm','head_girls_dorm'],user:{uid:'same'},profile:{scopeGender:'L',roleScopes:{head_girls_dorm:{classIds:['female']}}}};
 const scoped=sessionForRole(original,'head_girls_dorm');assert.equal(scoped.user,original.user);assert.equal(scoped.profile.scopeGender,'P');assert.equal(original.profile.scopeGender,'L');
 assert.deepEqual(scoped.profile.classIds,['female']);
});
test('guardian and mentor rosters never default to all children',()=>{
 const master={students:[{id:'a',gender:'L'},{id:'b',gender:'P'}]};
 assert.deepEqual(filterScopedStudents(master,{studentIds:['b']},'wali_santri').map(s=>s.id),['b']);
 assert.deepEqual(filterScopedStudents(master,{},'guru_wali'),[]);
});
test('Makassar date does not shift to the prior UTC day',()=>assert.equal(localDate(new Date('2026-10-01T17:00:00Z')),'2026-10-02'));
test('finding transitions enforce stage, scope, escalation and independent evaluation',()=>{
 const r={status:'NEW',scope:'boarding-P',assigneeUid:'worker'};
 assert.throws(()=>validateTransition(r,'VERIFIED',session('head_boys_dorm'),'checked'));
 assert.throws(()=>validateTransition(r,'RESOLVED',session('director'),'checked'));
 assert.throws(()=>validateTransition(r,'VERIFIED',session('director'),''));
 assert.equal(validateTransition(r,'VERIFIED',session('director'),'evidence checked'),true);
 assert.throws(()=>validateTransition({...r,status:'ESCALATED'},'IN_PROGRESS',session('head_girls_dorm'),'action'));
 assert.throws(()=>validateTransition({...r,status:'EVALUATION',assigneeUid:'reviewer'},'RESOLVED',session('director'),'done'));
});
test('holiday forms require complete activity and submitted report answers',()=>{
 assert.throws(()=>validateActivity({}));assert.equal(validateActivity(Object.fromEntries(HOLIDAY_ACTIVITIES.map((_,i)=>[`activity_${i}`,'TERLAKSANA']))),true);
 assert.equal(validateReport({status:'DRAF'}),true);assert.throws(()=>validateReport({status:'TERKIRIM'}));assert.deepEqual(DEPOSIT_TRANSITIONS.SUDAH_DISERAHKAN,[]);
});
test('brand remains BSI tosca and all menus have registered handlers',()=>{
 assert.match(readFileSync(new URL('../assets/css/brand-theme.css',import.meta.url),'utf8'),/#00a39d/i);
 const source=['app.js','modules/workspaces.js','modules/parent-extras.js'].map(f=>readFileSync(new URL(`../assets/js/${f}`,import.meta.url),'utf8')).join('\n');
 for(const id of ids)if(id!=='dashboard')assert.ok(source.includes(`"${id}"`)||source.includes(`'${id}'`)||source.includes(`${id}:`),`route ${id} missing`);
});

test('holiday journal and monitoring are disabled for every role without deleting records',()=>{
 for(const role of Object.keys(ROLE_LABELS))for(const route of ['parent-holiday','holiday-monitor']){
  assert.equal(canAccess(`workspace.${route}`,[role]),false,`${role}/${route}`);
  assert.equal(ids.has(route),false);
 }
 const rules=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url),'utf8'));
 for(const name of ['holiday_daily','holiday_reports'])assert.equal(rules.rules.madani_app.workspaces.$yearId[name].$studentId.$recordId['.write'],false);
});
