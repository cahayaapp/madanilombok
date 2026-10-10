// Run with MADANI_JSDOM_MODULE pointing to an installed jsdom entry if jsdom is not local.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const base=new URL('../',import.meta.url);
const source=f=>readFileSync(new URL(f,base),'utf8');
const master={students:[{id:'s1',name:'Santri Putra',gender:'L',unitId:'u1',boardingStatus:'boarding'},{id:'s2',name:'Santri Putri',gender:'P',unitId:'u1',boardingStatus:'boarding'}],staff:[],classes:[{id:'c1',name:'Kelas Uji'}],subjects:[{id:'sub1',name:'Mapel Uji'}],groups:[],programs:[],academicSchedules:[],dailySchedules:[],classAssignments:{s1:{classId:'c1'},s2:{classId:'c1'}},roomAssignments:{},groupAssignments:{},rooms:[],units:[]};
const dom=new JSDOM('<main id="content"></main><div id="toastHost"></div>',{url:'http://localhost/app/index.html'});
const win=dom.window;
const database=new Map([['users',{teacher:{name:'Guru Uji',role:'guru_mapel',active:true},reviewer:{name:'Pimpinan Uji',role:'director',active:true}}]]);
let writes=[],nextId=1;
const repository={
 getNode:async path=>database.get(path)||null,
 listNode:async path=>Object.entries(database.get(path)||{}).map(([id,data])=>({id,...data})),
 createWorkspaceRecord:async(path,data,actor)=>{const id=`r${nextId++}`,payload={...data,createdBy:actor,updatedBy:actor,createdAt:Date.now()};database.set(path,{...database.get(path),[id]:payload});database.set(`${path}/${id}`,payload);writes.push({path,id,data:payload});return {id,...payload};},
 saveWorkspaceRecord:async(path,id,data,actor)=>{database.set(`${path}/${id}`,{...data,createdBy:actor});writes.push({path,id,data});},
 commitCaseOperation:async()=>{throw Error("Use counselor-model tests for mutations");},
 transitionWorkspaceRecord:async(path,id,fn,actor)=>{const current=database.get(`${path}/${id}`);if(!current)throw Error('Missing record');const updated=fn(current);database.set(`${path}/${id}`,updated);database.set(path,{...database.get(path),[id]:updated});writes.push({path,id,data:updated,actor});return updated;},
 getCurrentAcademicYearId:async()=> 'year',
};
const exports=[...source('assets/js/repository.js').matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
for(const name of exports)if(!repository[name])repository[name]=async()=>{throw Error(`Unexpected repository write ${name}`);};
const context=vm.createContext({console,document:win.document,window:win,sessionStorage:win.sessionStorage,localStorage:win.localStorage,FormData:win.FormData,Event:win.Event,CustomEvent:win.CustomEvent,crypto:webcrypto,Intl,Date,URL,URLSearchParams,setTimeout:(f)=>0,clearTimeout:()=>{},requestAnimationFrame:f=>f(),TextEncoder,Uint8Array});
const cache=new Map();
const mock=new vm.SyntheticModule(exports,function(){for(const name of exports)this.setExport(name,repository[name]);},{context});
function getModule(url){
 if(url.endsWith('/repository.js'))return mock;
 if(!cache.has(url))cache.set(url,new vm.SourceTextModule(readFileSync(fileURLToPath(url),'utf8'),{context,identifier:url}));
 return cache.get(url);
}
async function load(url){const mod=getModule(url);if(mod.status==='unlinked')await mod.link((specifier,parent)=>getModule(new URL(specifier,parent.identifier).href));return mod;}
const work=await load(new URL('assets/js/modules/workspaces.js',base).href);await work.evaluate();
const extras=await load(new URL('assets/js/modules/parent-extras.js',base).href);await extras.evaluate();
const homes=await load(new URL('assets/js/modules/role-home.js',base).href);await homes.evaluate();
const permissions=await load(new URL('assets/js/permissions.js',base).href);await permissions.evaluate();
const {ROLE_LABELS,MENU_GROUPS,canAccess}=permissions.namespace;
const routes={...work.namespace.WORKSPACE_ROUTES,...extras.namespace.PARENT_EXTRA_ROUTES};
function ctxFor(role){return {session:{activeRole:role,roles:[role],user:{uid:'teacher',email:'test@example.invalid'},profile:{name:'Pengguna Uji',staffId:'staff1',studentIds:['s1'],classIds:['c1'],menteeStudentIds:['s1'],scopeGender:role==='head_girls_dorm'?'P':role==='head_boys_dorm'?'L':undefined}},master,yearId:'year',year:{name:'Tahun Uji'},root:win.document.getElementById('content'),roleName:ROLE_LABELS[role],navigate:()=>{},rerender:async()=>{}};}
async function settle(){for(let i=0;i<15;i++)await Promise.resolve();}
function submit(form){form.dispatchEvent(new win.Event('submit',{cancelable:true,bubbles:true}));}
test('every permitted new workspace renders for each assigned role using an isolated fake repository',async()=>{
 let count=0;
 for(const role of Object.keys(ROLE_LABELS))for(const [id,handler] of Object.entries(routes))if(canAccess(`workspace.${id}`,[role])){
 const ctx=ctxFor(role);ctx.root.innerHTML='';await handler(ctx);assert.ok(ctx.root.textContent.trim(),`${role}/${id} empty`);assert.equal(ctx.root.querySelectorAll('script').length,0);count++;
 }
 assert.ok(count>100);console.log(`Rendered ${count} role/workspace combinations without Firebase.`);
});
test('all 15 homes render and non-finance roles do not request finance collections',async()=>{
 for(const role of Object.keys(ROLE_LABELS)){
 const reads=[];const original=repository.getNode;repository.getNode=async p=>{reads.push(p);return original(p)};
 // Synthetic exports are stable; reset an instrumented export for this test.
 mock.setExport('getNode',repository.getNode);
 const ctx=ctxFor(role);ctx.root.innerHTML='';const items=MENU_GROUPS.flatMap(g=>g.items).filter(i=>canAccess(i.feature||'dashboard',[role]));await homes.namespace.renderRoleHome(ctx,items);
 assert.ok(ctx.root.querySelector('.home-role-button'),role);
 if(process.env.MADANI_HOME_PREVIEW){mkdirSync('outputs/home-preview',{recursive:true});const shell=source('app/index.html');const css=[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0].replaceAll('../assets/','/assets/')).join('');const nav=shell.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/)[0];writeFileSync(`outputs/home-preview/${role}.html`,`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="app-body portal-body" data-home="true"><main class="main-area"><section class="content-area portal-content"><div class="${ctx.root.className}">${ctx.root.innerHTML.replaceAll('../assets/','/assets/')}</div></section></main>${nav}</body></html>`);}
 assert.ok(ctx.root.textContent.trim(),role);if(!['kasir','wali_santri'].includes(role))assert.ok(reads.every(p=>!p.startsWith('finance/')),role);
 repository.getNode=original;mock.setExport('getNode',original);
 }
});
test('academic follow-up persists student ID and can update the same record',async()=>{
 const ctx=ctxFor('guru_mapel');await routes['academic-followup'](ctx);const form=ctx.root.querySelector('#followupForm');
 for(const [k,v] of Object.entries({studentId:'s1',dueDate:'2026-10-12',evidence:'Nilai belum tuntas',target:'Menguasai bab 1',strategy:'Latihan terbimbing'}))form.elements[k].value=v;
 writes=[];submit(form);await settle();assert.equal(writes.length,1);const record=writes[0];assert.equal(record.data.studentId,'s1');
 await routes['academic-followup'](ctx);const progress=ctx.root.querySelector('[data-followup]');progress.elements.result.value='Latihan tuntas';progress.elements.status.value='Selesai';submit(progress);await settle();assert.equal(writes.at(-1).id,record.id);assert.equal(writes.at(-1).data.status,'Selesai');
});
test('case report joins the existing counselor inbox, not a duplicate data source',async()=>{
 const ctx=ctxFor('guru_mapel');await routes['teacher-case'](ctx);const form=ctx.root.querySelector('#teacherCaseForm');
 for(const [k,v] of Object.entries({studentId:'s1',date:'2026-10-02',category:'Laporan',description:'Fakta uji',evidence:'Saksi uji'}))form.elements[k].value=v;
 writes=[];submit(form);await settle();assert.equal(writes[0].path,'boarding/cases/year');assert.equal(writes[0].data.status,'menunggu_konselor');assert.equal(writes[0].data.parentVisible,false);
});
test('guardian deposit page has no status mutation form',async()=>{const ctx=ctxFor('wali_santri');await routes['parent-deposits'](ctx);assert.equal(ctx.root.querySelectorAll('form').length,0);});

test('legacy role pages still render through the same registered handlers',async()=>{
 const handlers={};
 for(const name of ['academic','boarding','parent','finance']){
  const mod=await load(new URL(`assets/js/modules/${name}.js`,base).href);await mod.evaluate();Object.assign(handlers,mod.namespace);
 }
 const mentor=await load(new URL('assets/js/mentoring.js',base).href);await mentor.evaluate();Object.assign(handlers,mentor.namespace);
 const leave=await load(new URL('assets/js/teacher/leave.js',base).href);await leave.evaluate();Object.assign(handlers,leave.namespace);
 const permits=await load(new URL('assets/js/student-permits.js',base).href);await permits.evaluate();Object.assign(handlers,permits.namespace);
 const registry=source('assets/js/app.js').split('export const routes = {')[1].split('\n};')[0];
 const mapped=[...registry.matchAll(/^\s*(?:"([\w-]+)"|(\w+)):\s*(render\w+)/gm)].map(m=>[m[1]||m[2],handlers[m[3]]]);
 let count=0;
 for(const role of Object.keys(ROLE_LABELS))for(const [id,handler] of mapped){
  const menu=MENU_GROUPS.flatMap(g=>g.items).find(i=>i.id===id);
  if(!menu||!canAccess(menu.feature,[role]))continue;
  assert.equal(typeof handler,'function',id);const ctx=ctxFor(role);ctx.root.innerHTML='';await handler(ctx);assert.ok(ctx.root.textContent.trim(),`${role}/${id}`);count++;
 }
 console.log(`Rendered ${count} legacy role/page combinations without Firebase.`);
});
test('KPI workspace is inaccessible even by direct invocation',async()=>{await assert.rejects(routes['teacher-kpi'](ctxFor('guru_mapel')),/Akses role/);});

test('management finding keeps evidence and appends its complete evaluation history',async()=>{
 const ctx=ctxFor('director');await routes['management-findings'](ctx);
 const form=ctx.root.querySelector('#findingForm');
 for(const [k,v] of Object.entries({title:'Tindak lanjut observasi',scope:'education',evidence:'Bukti uji',standard:'Standar uji',assigneeUid:'reviewer',dueDate:'2026-10-12'}))form.elements[k].value=v;
 writes=[];submit(form);await settle();assert.equal(writes.length,1);const initial=writes[0];
 for(const status of ['VERIFIED','IN_PROGRESS','EVALUATION','RESOLVED']){
  await routes['management-findings'](ctx);const transition=ctx.root.querySelector('[data-transition]');
  transition.elements.status.value=status;transition.elements.note.value=`Evidence ${status}`;submit(transition);await settle();assert.equal(writes.at(-1).data.status,status);
 }
 const record=database.get(`${initial.path}/${initial.id}`);assert.equal(record.evidence,'Bukti uji');assert.equal(Object.keys(record.history).length,4);
 await routes['management-findings'](ctx);assert.equal(ctx.root.querySelectorAll('[data-transition]').length,0);
});
test('deposit receipt reaches handover on one record and becomes visible to guardian',async()=>{
 const ctx=ctxFor('admin');await routes['deposit-admin'](ctx);const select=ctx.root.querySelector('#depositStudent');select.value='s1';await select.onchange({target:select});
 const form=ctx.root.querySelector('#depositForm');form.elements.title.value='Buku uji';form.elements.quantity.value='2';form.elements.description.value='Baik';writes=[];submit(form);await settle();assert.equal(writes.length,1);const initial=writes[0];
 for(const status of ['DIPROSES','SIAP_DISERAHKAN','SUDAH_DISERAHKAN']){
  const transition=ctx.root.querySelector('[data-deposit]');transition.elements.status.value=status;transition.elements.receiver.value='Penerima uji';transition.elements.note.value='Bukti serah terima';submit(transition);await settle();assert.equal(writes.at(-1).data.status,status);
 }
 assert.equal(writes.at(-1).id,initial.id);assert.equal(Object.keys(writes.at(-1).data.history).length,3);
 await routes['parent-deposits'](ctxFor('wali_santri'));assert.match(ctx.root.textContent,/Buku uji/);assert.match(ctx.root.textContent,/SUDAH_DISERAHKAN/);assert.equal(ctx.root.querySelectorAll('form').length,0);
});

function prepareDuty(ctx){
 context.Date=class extends Date {static now(){return Date.parse('2026-10-06T10:00:00+08:00')}};
 database.set('settings/naqibDuty',{staff:{staff1:{shiftId:'shift1',gender:'L',active:true}}});
 ctx.master.dailySchedules=ctx.master.dailySchedules.map((s,i)=>({id:'daily'+i,academicYearId:ctx.yearId,day:'Setiap Hari',startTime:'08:00',...s}));
 database.set('programs',Object.fromEntries(ctx.master.programs.map(p=>[p.id,p])));
 database.set('schedules/daily',Object.fromEntries(ctx.master.dailySchedules.map(s=>[s.id,s])));
}
test('Naqib excludes GEMA students and saves only general boarding roster without replacing other attendance',async()=>{
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);if(boarding.status!=='evaluated')await boarding.evaluate();
 const ctx=ctxFor('naqib');ctx.session.profile.scopeGender='L';
 ctx.master={...master,students:[...master.students,{id:'s3',name:'Umum',gender:'L'}],roomAssignments:{s1:{roomId:'ROOM-PTR-GEMA'},s2:{roomId:'ROOM-PTRI-GEMA'},s3:{roomId:'ROOM-PTR-C1'}},programs:[{id:'g',name:'GEMA',genderScope:'mixed'},{id:'u',name:'Umum',genderScope:'mixed'}],dailySchedules:[{naqibProgramKind:'subuh',programId:'g',participantScope:'boarding_gema',audience:'Asrama GEMA',genderScope:'mixed'},{naqibProgramKind:'subuh',programId:'u',participantScope:'boarding_general',audience:'Asrama Umum',genderScope:'mixed'}]};
 await boarding.namespace.renderNaqibPrograms(ctx);const filter=ctx.root.querySelector('#dailyAudience');filter.value='boarding_gema';filter.onchange({target:filter});assert.equal(ctx.root.querySelectorAll('[data-daily-scope]:not([hidden])').length,1);
 prepareDuty(ctx);await boarding.namespace.renderNaqibAttendance(ctx);ctx.root.querySelector('#programPick').value='u';ctx.root.querySelector('#loadProgramAtt').click();await settle();
 assert.deepEqual([...ctx.root.querySelectorAll('[data-student]')].map(x=>x.dataset.student),['s3']);
 let patch;mock.setExport('patchNode',async(path,data)=>{patch={path,data}});
 ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.deepEqual(Object.keys(patch.data),['s3']);assert.match(patch.path,/\/u$/);
 patch=null;const liveSchedules=database.get('schedules/daily');const originalKind=liveSchedules.daily1.naqibProgramKind;liveSchedules.daily1.naqibProgramKind='arabic';ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.equal(patch,null,'program removed from permitted list must not save from an open form');liveSchedules.daily1.naqibProgramKind=originalKind;
 patch=null;context.Date=class extends Date {static now(){return Date.parse('2026-10-06T12:00:00+08:00')}};ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.equal(patch,null,'form opened earlier must not save after shift ends');
 mock.setExport('patchNode',repository.patchNode);
 const parent=await load(new URL('assets/js/modules/parent.js',base).href);if(parent.status!=='evaluated')await parent.evaluate();ctx.session.profile.studentIds=['s1'];await parent.namespace.renderParentPrograms(ctx);assert.match(ctx.root.textContent,/GEMA/);assert.doesNotMatch(ctx.root.textContent,/Umum/);
});

test('morning Arabic is excluded from Naqib attendance while parent still sees child group',async()=>{
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);if(boarding.status!=='evaluated')await boarding.evaluate();
 const ctx=ctxFor('naqib');ctx.master={...master,students:[...master.students,{id:'s3',name:'Other boy',gender:'L'}],roomAssignments:{s1:{roomId:'ROOM-PTR-C2'},s3:{roomId:'ROOM-PTR-C3'}},programs:[{id:'m',name:'Mufrodat',genderScope:'mixed'}],dailySchedules:[{programId:'m',participantScope:'boarding_general',startTime:'05:40',genderScope:'mixed'}],groups:[{id:'a',name:'Arab Cordova 2',programType:'arabic',gender:'L'},{id:'b',name:'Arab Cordova 3',programType:'arabic',gender:'L'}],groupAssignments:{a:{s1:{studentId:'s1'}},b:{s3:{studentId:'s3'}}}};
 prepareDuty(ctx);await boarding.namespace.renderNaqibAttendance(ctx);assert.equal(ctx.root.querySelector('option[value="m"]'),null);
 await boarding.namespace.renderNaqibReport(ctx);assert.equal(ctx.root.querySelector('option[value="m"]'),null);
 const parent=await load(new URL('assets/js/modules/parent.js',base).href);if(parent.status!=='evaluated')await parent.evaluate();await parent.namespace.renderParentPrograms(ctx);assert.match(ctx.root.textContent,/Arab Cordova 2/);assert.doesNotMatch(ctx.root.textContent,/Arab Cordova 3|Other boy/);
});

test('home role button switches only among assigned roles through the shared picker',async()=>{
 win.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};win.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new win.Event('close'));};
 const picker=win.document.createElement('select');picker.id='rolePicker';picker.innerHTML='<option value="guru_mapel">Guru</option><option value="guru_wali">Wali</option>';win.document.body.append(picker);let changed=0;picker.onchange=()=>changed++;
 const ctx=ctxFor('guru_mapel');ctx.session.roles=['guru_mapel','guru_wali'];await homes.namespace.renderRoleHome(ctx,[]);ctx.root.querySelector('.home-role-button').click();assert.equal(ctx.root.querySelectorAll('[data-role-choice]').length,2);ctx.root.querySelector('[data-role-choice="guru_wali"]').click();assert.equal(picker.value,'guru_wali');assert.equal(changed,1);picker.remove();
});
test('profile saves only presentation fields and preserves canonical identity and access',async()=>{
 const ctx=ctxFor('guru_mapel');let saved;mock.setExport('patchNode',async(path,changes)=>{saved={path,changes};});await routes['work-profile'](ctx);
 if(process.env.MADANI_HOME_PREVIEW){const shell=source('app/index.html');const css=[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0].replaceAll('../assets/','/assets/')).join('');writeFileSync('outputs/home-preview/profile.html',`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body><main class="content-area">${ctx.root.innerHTML}</main></body></html>`);}
 const form=ctx.root.querySelector('#profileForm');form.elements.displayName.value='Ustadz Madani';submit(form);await settle();assert.equal(saved.path,'users/teacher');assert.deepEqual(Object.keys(saved.changes).sort(),['displayName','photoURL']);assert.equal(saved.changes.displayName,'Ustadz Madani');assert.equal(ctx.session.profile.name,'Pengguna Uji');assert.equal(ctx.session.profile.displayName,'Ustadz Madani');
 const profile=getModule(new URL('assets/js/profile.js',base).href).namespace;
 assert.throws(()=>profile.profileDraft(' ',''));assert.throws(()=>profile.profileDraft('Nama','javascript:alert(1)'));assert.throws(()=>profile.validatePassword('old','short','short'));assert.throws(()=>profile.validatePassword('old-password','new-password','different'));assert.doesNotThrow(()=>profile.validatePassword('old-password','new-password','new-password'));
});

test('every internal reporting role can submit an active student outside its unit, class and gender scope',async()=>{
 for(const role of Object.keys(ROLE_LABELS).filter(r=>!['wali_santri','naqib'].includes(r))){
  const ctx=ctxFor(role);ctx.session.profile={...ctx.session.profile,unitIds:['u1'],scopeGender:'L',menteeStudentIds:['s1']};ctx.master={...master,students:[...master.students,{id:'other-unit',name:'Santri Lintas Unit',unitId:'u2',gender:'P',status:'active'},{id:'archived',name:'Duplikat',mergedInto:'other-unit',status:'inactive'}]};
  assert.ok(canAccess('workspace.teacher-case',[role]));await routes['teacher-case'](ctx);const form=ctx.root.querySelector('#teacherCaseForm');assert.ok(form.elements.studentId.querySelector('option[value="other-unit"]'));assert.equal(form.elements.studentId.querySelector('option[value="archived"]'),null);
  for(const [k,v]of Object.entries({studentId:'other-unit',date:'2026-10-06',category:'Kedisiplinan',description:'Kejadian uji lintas unit',evidence:'Saksi'}))form.elements[k].value=v;
  writes=[];submit(form);await settle();assert.equal(writes.length,1);assert.equal(writes[0].data.studentId,'other-unit');assert.equal(writes[0].data.reporterRole,role);assert.equal(writes[0].data.status,'menunggu_konselor');
 }
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);await boarding.evaluate();const ctx=ctxFor('naqib');ctx.master={...master,students:[{id:'other-unit',name:'Lintas Unit',unitId:'u2',gender:'P',status:'active'}]};ctx.session.profile={unitIds:['u1'],scopeGender:'L'};await boarding.namespace.renderNaqibCase(ctx);assert.ok(ctx.root.querySelector('option[value="other-unit"]'));
});
