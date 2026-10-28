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
const dom=new JSDOM('<main id="content"><div id="routeMount"></div></main><div id="toastHost"></div>',{url:'http://localhost/app/index.html'});
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
function ctxFor(role){return {session:{activeRole:role,roles:[role],user:{uid:'teacher',email:'test@example.invalid'},profile:{name:'Pengguna Uji',staffId:'staff1',studentIds:['s1'],classIds:['c1'],menteeStudentIds:['s1'],scopeGender:role==='head_girls_dorm'?'P':role==='head_boys_dorm'?'L':undefined}},master,yearId:'year',year:{name:'Tahun Uji'},root:win.document.getElementById('routeMount'),roleName:ROLE_LABELS[role],navigate:()=>{},rerender:async()=>{}};}
async function settle(){for(let i=0;i<15;i++)await Promise.resolve();}
function submit(form){form.dispatchEvent(new win.Event('submit',{cancelable:true,bubbles:true}));}
// Opt-in visual fixtures use the same real renderers and never connect to Firebase.
function exportVisual(ctx,role,route){
 const dir=process.env.MADANI_VISUAL_DIR;if(!dir)return;mkdirSync(dir,{recursive:true});
 const shell=source('app/index.html'),css=[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0].replaceAll('../assets/','/assets/')).join('');
 const nav=shell.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/)[0];
 writeFileSync(`${dir}/${role}--${route}.html`,`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}<title>${role} · ${route}</title></head><body class="app-body portal-body" data-home="${route==='home'}" data-active-role="${role}"><main class="main-area"><section class="content-area portal-content"><div id="content" class="${ctx.root.className}">${ctx.root.innerHTML.replaceAll('../assets/','/assets/')}</div></section></main>${nav}<script type="module">import {fitHomeViewport} from "/assets/js/home-viewport.js";fitHomeViewport(document.querySelector(".premium-home"));</script></body></html>`);
}
test('every permitted new workspace renders for each assigned role using an isolated fake repository',async()=>{
 let count=0;
 for(const role of Object.keys(ROLE_LABELS))for(const [id,handler] of Object.entries(routes))if(canAccess(`workspace.${id}`,[role])){
 const ctx=ctxFor(role);ctx.root.innerHTML='';await handler(ctx);assert.ok(ctx.root.textContent.trim(),`${role}/${id} empty`);assert.equal(ctx.root.querySelectorAll('script').length,0);exportVisual(ctx,role,id);count++;
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
 assert.ok(ctx.root.querySelector('.premium-home'),role);
 assert.ok(ctx.root.querySelector('.desktop-home-menu[aria-controls="sidebar"]'),role);
 assert.ok(ctx.root.querySelector('.desktop-home-account'),role);
 assert.ok(ctx.root.querySelector('.official-greeting').nextElementSibling.matches('.official-date'),role+' date follows greeting');
 assert.ok(ctx.root.querySelectorAll('.premium-quick').length<=4,role);
 assert.ok(ctx.root.querySelectorAll('.premium-menu-grid>.premium-menu').length>0,role);
 assert.ok(ctx.root.querySelectorAll('.premium-menu-grid>.premium-menu').length<=6,role+' secondary limit');
 const quickLabels=new Set([...ctx.root.querySelectorAll('.premium-quick>b')].map(b=>b.textContent));
 assert.ok([...ctx.root.querySelectorAll('.premium-menu-grid>.premium-menu>b')].every(b=>!quickLabels.has(b.textContent)),role);
 exportVisual(ctx,role,'home');
 if(role==='naqib'){assert.ok(ctx.root.querySelectorAll('.naqib-workspace-menu [data-home-route]').length<=6);const quick=new Set([...ctx.root.querySelectorAll('.hub-quick-card')].map(b=>b.dataset.homeRoute));assert.ok([...ctx.root.querySelectorAll('.naqib-workspace-menu [data-home-route]')].every(b=>!quick.has(b.dataset.homeRoute)));}
 if(process.env.MADANI_HOME_PREVIEW){mkdirSync('outputs/home-preview',{recursive:true});const shell=source('app/index.html');const css=[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0].replaceAll('../assets/','/assets/')).join('');const nav=shell.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/)[0];writeFileSync(`outputs/home-preview/${role}.html`,`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="app-body portal-body" data-home="true"><main class="main-area"><section id="content" class="content-area portal-content"><div class="${ctx.root.className}">${ctx.root.innerHTML.replaceAll('../assets/','/assets/')}</div></section></main>${nav}<script type="module">import {fitHomeViewport} from "/assets/js/home-viewport.js";fitHomeViewport(document.querySelector(".premium-home"));</script></body></html>`);}
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
  assert.equal(typeof handler,'function',id);const ctx=ctxFor(role);ctx.root.innerHTML='';await handler(ctx);assert.ok(ctx.root.textContent.trim(),`${role}/${id}`);exportVisual(ctx,role,id);count++;
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
 prepareDuty(ctx);await boarding.namespace.renderNaqibPrograms(ctx);const filter=ctx.root.querySelector('#dailyAudience');filter.value='boarding_gema';filter.onchange({target:filter});assert.equal(ctx.root.querySelectorAll('[data-daily-scope]:not([hidden])').length,1);
 prepareDuty(ctx);await boarding.namespace.renderNaqibAttendance(ctx);ctx.root.querySelector('[data-pick="u"]').click();await settle();ctx.root.querySelector('[data-scope=""]').click();await settle();
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
 prepareDuty(ctx);await boarding.namespace.renderNaqibAttendance(ctx);assert.equal(ctx.root.querySelector('[data-pick="m"]'),null);
 await boarding.namespace.renderNaqibReport(ctx);assert.equal(ctx.root.querySelector('[data-pick="m"]'),null);
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
  assert.ok(canAccess('workspace.teacher-case',[role]));await routes['teacher-case'](ctx);
  assert.ok(ctx.root.querySelector('[data-student="other-unit"]'));assert.equal(ctx.root.querySelector('[data-student="archived"]'),null);
  assert.ok(ctx.root.querySelector('#reportPhoto'));assert.ok(ctx.root.querySelector('#reportCritical'));assert.equal(ctx.root.querySelector('#teacherCaseForm'),null);
  ctx.root.querySelector('[data-student="other-unit"]').checked=true;
  ctx.root.querySelector('#reportSource').value='langsung';ctx.root.querySelector('#reportCategory').value='Kedisiplinan';ctx.root.querySelector('#reportDescription').value='Kejadian uji lintas unit';
  let captured;mock.setExport('patchNode',async(path,patch)=>captured=patch);
  try{ctx.root.querySelector('#sendReport').click();await settle();const record=Object.entries(captured).find(([p])=>p.startsWith('boarding/cases/year/'))[1];assert.equal(record.studentId,'other-unit');assert.equal(record.reporterRole,role);assert.equal(record.status,'menunggu_konselor');assert.equal(record.parentVisible,false);}finally{mock.setExport('patchNode',repository.patchNode);}

 }
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);await boarding.evaluate();const ctx=ctxFor('naqib');ctx.master={...master,students:[{id:'other-unit',name:'Lintas Unit',unitId:'u2',gender:'P',status:'active'}]};ctx.session.profile={unitIds:['u1'],scopeGender:'L'};await boarding.namespace.renderNaqibCase(ctx);ctx.root.querySelector('[data-source-mode="santri"]').click();const reporter=ctx.root.querySelector('#reporterSearch');reporter.value='Lintas';reporter.dispatchEvent(new win.Event('input'));assert.ok(ctx.root.querySelector('[data-reporter="other-unit"]'));assert.ok(ctx.root.querySelector('[data-student="other-unit"]'));assert.ok(ctx.root.querySelector('#reportPhoto'));assert.ok(ctx.root.querySelector('#reportCritical'));assert.equal(ctx.root.querySelector('[name=severity]'),null);
});

test('Naqib prayer finalization requires late explanation and preserves initial attendance',async()=>{
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);if(boarding.status!=='evaluated')await boarding.evaluate();const ctx=ctxFor('naqib');ctx.session.profile.scopeGender='L';ctx.master={...master,students:[{id:'s1',name:'Santri',gender:'L',boardingStatus:'boarding'}],roomAssignments:{s1:{roomId:'ROOM-PTR-C1'}},programs:[{id:'prayer',name:'Sholat zuhur'}],dailySchedules:[{programId:'prayer',naqibProgramKind:'zuhur',genderScope:'L',participantScope:'boarding_general'}]};prepareDuty(ctx);
 const path='boarding/program_attendance/year/2026-10-06/prayer';database.set(path,{});mock.setExport('patchNode',async(p,records)=>database.set(p,{...database.get(p),...records}));
 await boarding.namespace.renderNaqibAttendance(ctx);ctx.root.querySelector('[data-pick="prayer"]').click();await settle();ctx.root.querySelector('[data-scope=""]').click();await settle();ctx.root.querySelector('input[value=Hadir]').checked=true;ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.equal(database.get(path).s1.stage,'AWAL');ctx.root.querySelector('[data-scope=""]').click();await settle();assert.equal(ctx.root.querySelector('input[value=Terlambat]').disabled,false);
 for(const status of ['Hadir','Terlambat','Sakit','Izin','Alfa']){const radio=ctx.root.querySelector(`input[value=${status}]`);assert.equal(radio.disabled,false);radio.click();assert.equal(radio.checked,true);}
 ctx.root.querySelector('input[value=Terlambat]').click();
 ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.equal(database.get(path).s1.stage,'AWAL');ctx.root.querySelector('.pnote').value='Terlambat dari kamar';ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.equal(database.get(path).s1.stage,'FINAL');assert.equal(database.get(path).s1.status,'Terlambat');assert.equal(database.get(path).s1.initialAttendance.status,'Hadir');assert.equal(database.get(path).s1.initialAttendance.note,'');ctx.root.querySelector('[data-scope=""]').click();await settle();assert.equal(ctx.root.querySelector('input[value=Hadir]').disabled,true);assert.equal(ctx.root.querySelector('#saveProgramAtt').disabled,true);mock.setExport('patchNode',repository.patchNode);
});

test('Naqib scope cards show names per room or entire gender unit, include GEMA and save only chosen room',async()=>{
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);const ctx=ctxFor('naqib');
 ctx.master={...master,students:[{id:'a',name:'Alfa Putri',gender:'P'},{id:'b',name:'Beta GEMA',gender:'P'},{id:'c',name:'Putra',gender:'L'}],rooms:[{id:'r',name:'Makkah 1'},{id:'ROOM-PTRI-GEMA',name:'GEMA Putri'}],roomAssignments:{a:{roomId:'r'},b:{roomId:'ROOM-PTRI-GEMA'},c:{roomId:'r'}},programs:[{id:'isya',name:'Sholat Isya'}],dailySchedules:[{programId:'isya',startTime:'20:00',endTime:'20:30',naqibProgramKind:'isya',participantScope:'all_boarding',genderScope:'mixed'}]};prepareDuty(ctx);
 context.Date=class extends Date{static now(){return Date.parse('2026-10-10T20:10:00+08:00')}};database.set('settings/naqibDuty',{staff:{staff1:{shiftId:'shift3',gender:'P',startMinute:960,endMinute:1440}}});
 const path='boarding/program_attendance/year/2026-10-10/isya';database.set(path,{});mock.setExport('patchNode',async(p,records)=>database.set(p,{...database.get(p),...records}));
 await boarding.namespace.renderNaqibAttendance(ctx);ctx.root.querySelector('[data-pick=isya]').click();await settle();assert.match(ctx.root.textContent,/Seluruh Asrama/);ctx.root.querySelector('[data-scope=r]').click();await settle();assert.deepEqual([...ctx.root.querySelectorAll('[data-student]')].map(x=>x.dataset.student),['a']);ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.deepEqual(Object.keys(database.get(path)),['a']);
 ctx.root.querySelector('[data-scope=""]').click();await settle();assert.deepEqual([...ctx.root.querySelectorAll('[data-student]')].map(x=>x.dataset.student),['a','b']);ctx.root.querySelector('#studentSearch').value='beta';ctx.root.querySelector('#studentSearch').dispatchEvent(new win.Event('input'));assert.equal(ctx.root.querySelector('[data-student=a]').hidden,true);assert.equal(ctx.root.querySelector('[data-student=b]').hidden,false);
 ctx.root.querySelector('#saveProgramAtt').click();await settle();assert.equal(database.get(path).a.stage,'FINAL');assert.equal(database.get(path).b.stage,'AWAL');mock.setExport('patchNode',repository.patchNode);
});

test.after(()=>{if(process.env.MADANI_NAQIB_PREVIEW){writeFileSync('/tmp/madani-naqib-preview.html',`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${source('assets/css/app.css')}${source('assets/css/portal.css')}${source('assets/css/brand-theme.css')}body{margin:0;padding:18px;font-family:system-ui;background:#fffdf6}main{max-width:900px;margin:auto}</style></head><body><main>${win.document.getElementById('routeMount').innerHTML}</main></body></html>`);}});

test('leadership report visual summary preserves counts, scope, and period filter',async()=>{
 const module=await load(new URL('assets/js/leadership-monitor.js',base).href);if(module.status!=='evaluated')await module.evaluate();
 const ctx=ctxFor('head_formal_school');ctx.session.profile.unitIds=['u1'];
 ctx.master={...master,classes:[{id:'c1',name:'Kelas Uji',unitId:'u1'}],staff:[{id:'staff1',name:'Guru Contoh'}]};
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const path='academic/teaching_attendance/year',before=database.get(path);
 database.set(path,{one:{staffId:'staff1',scheduleId:'one',classId:'c1',date,status:'Hadir'},two:{staffId:'staff1',scheduleId:'two',classId:'c1',date,status:'TERLAMBAT',lateMinutes:12},outside:{staffId:'other',scheduleId:'other',classId:'outside',date,status:'Alfa'}});
 try{
  await module.namespace.renderLeadershipMonitor(ctx,'school-teacher-attendance');
  assert.match(ctx.root.querySelector('.monitor-ring').getAttribute('aria-label'),/100 persen/);
  assert.equal(ctx.root.querySelectorAll('.monitor-stats .portal-metric').length,4);
  assert.equal(ctx.root.querySelector('.monitor-stats .portal-metric strong').textContent,'2');
  assert.equal(ctx.root.querySelectorAll('.monitor-person').length,0);
  ctx.root.querySelector('[data-period=week]').click();assert.ok(ctx.root.querySelector('[name=from]').value<date);
  ctx.root.querySelector('[data-monitor-view=punctuality]').click();
  assert.match(ctx.root.querySelector('.monitor-ring').getAttribute('aria-label'),/50 persen/);
  assert.equal(ctx.root.querySelectorAll('.monitor-person').length,1);
  assert.equal(ctx.root.querySelector('[name=from]').value<date,true);
  ctx.root.querySelector('[data-monitor-view=attendance]').click();
  assert.match(ctx.root.querySelector('.monitor-ring').getAttribute('aria-label'),/100 persen/);
  exportVisual(ctx,'head_formal_school','report-populated');
  await module.namespace.renderLeadershipMonitor(ctx,'school-teacher-punctuality');
  assert.match(ctx.root.querySelector('.monitor-ring').getAttribute('aria-label'),/50 persen/);
  assert.equal(ctx.root.querySelectorAll('.monitor-person').length,1);
  assert.match(ctx.root.querySelector('.monitor-person').textContent,/Guru Contoh/);
 }finally{before===undefined?database.delete(path):database.set(path,before);}
});

test('dorm daily Quran card reads saved portions and filters gender and dates',async()=>{
 const module=await load(new URL('assets/js/leadership-monitor.js',base).href);if(module.status!=='evaluated')await module.evaluate();
 const ctx=ctxFor('head_girls_dorm');ctx.master={...master,staff:[{id:'mentor',name:'Pembina Uji'}],groups:[{id:'g',name:'GEMA Putri'}]};
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const path='academic/quran_records/year',before=database.get(path),writeCount=writes.length;
 database.set(path,{g:{s2:{a:{studentId:'s2',groupId:'g',staffId:'mentor',date,type:'Tahfiz',activity:'Ziyadah',portion:'Al-Baqarah 1–5',quality:'Lancar',note:'Lanjutkan'},b:{studentId:'s2',date:'2020-01-01',type:'Murojaah',portion:'LAMA'}},s1:{c:{studentId:'s1',date,type:'Tahfiz',portion:'PUTRA'}}}});
 try{
  await module.namespace.renderLeadershipMonitor(ctx,'dorm-quran-daily');
  assert.equal(ctx.root.querySelectorAll('.monitor-person').length,1);
  assert.match(ctx.root.textContent,/Al-Baqarah 1–5/);assert.match(ctx.root.textContent,/Pembina Uji/);assert.match(ctx.root.textContent,/Lancar/);
  assert.doesNotMatch(ctx.root.textContent,/PUTRA|LAMA/);assert.equal(writes.length,writeCount);
  ctx.root.querySelector('[name=from]').value='2020-01-01';ctx.root.querySelector('[name=to]').value='2020-01-01';ctx.root.querySelector('[name=from]').onchange();assert.match(ctx.root.textContent,/LAMA/);assert.doesNotMatch(ctx.root.textContent,/Al-Baqarah/);
  const items=MENU_GROUPS.flatMap(g=>g.items).filter(i=>canAccess(i.feature||'dashboard',['head_girls_dorm']));await homes.namespace.renderRoleHome(ctx,items);assert.ok(ctx.root.querySelector('.premium-quick-grid [data-home-route="dorm-quran-daily"]'));
 }finally{before===undefined?database.delete(path):database.set(path,before);}
});


test('unit leadership homes expose all daily monitors as quick cards',async()=>{
 for(const role of ['head_formal_school','head_boys_dorm','head_girls_dorm']){
  const ctx=ctxFor(role),items=MENU_GROUPS.flatMap(g=>g.items).filter(i=>canAccess(i.feature||'dashboard',[role]));
  await homes.namespace.renderRoleHome(ctx,items);
  assert.equal(ctx.root.querySelector('.premium-section-head h2').textContent,'Pantau Operasional Harian');
  assert.ok(ctx.root.querySelector('.premium-monitor-home'));
  const expected=role==='head_formal_school'?['school-quality','school-teacher-attendance','school-student-attendance','school-mentoring']:['dorm-student-attendance','dorm-teacher-attendance','dorm-quran-daily','dorm-counselor'];
  assert.deepEqual([...ctx.root.querySelectorAll('.premium-quick')].map(b=>b.dataset.homeRoute),expected);
  if(role!=='head_formal_school')assert.ok(ctx.root.querySelector('.premium-menu-grid [data-home-route="management-worship"]'));
  for(const id of expected){const b=ctx.root.querySelector(`.premium-quick-grid [data-home-route="${id}"]`);assert.ok(b.querySelector('small').textContent);assert.equal(ctx.root.querySelector(`.premium-menu-grid [data-home-route="${id}"]`),null);}
 }
 const ctx=ctxFor('admin'),items=MENU_GROUPS.flatMap(g=>g.items).filter(i=>canAccess(i.feature||'dashboard',['admin']));await homes.namespace.renderRoleHome(ctx,items);
 assert.equal(ctx.root.querySelector('.premium-section-head h2').textContent,'Menu Utama');
 assert.equal(ctx.root.querySelectorAll('.premium-quick').length,4);
});

test('dorm duty, resident settings and worship include all three assigned male naqibs',async()=>{
 const ctx=ctxFor('head_boys_dorm');ctx.master={...master,staff:[{id:'dai',name:'Dai'},{id:'novan',name:'Novan'},{id:'yusuf',name:'Yusuf',gender:'L'},{id:'alfi',name:'Alfi',gender:'P'}]};
 const beforeUsers=database.get('users'),beforeDuty=database.get('settings/naqibDuty/staff');
 database.set('users',{a:{staffId:'dai',roles:{naqib:true},roleScopes:{naqib:{scopeGender:'L'}}},b:{staffId:'novan',roleFlags:{naqib:true}},c:{staffId:'yusuf',role:'naqib'},d:{staffId:'alfi',role:'naqib'}});
 database.set('settings/naqibDuty/staff',{novan:{active:true,gender:'L',shiftId:'shift2'}});
 try{
  for(const [route,selector]of [['management-duty','[data-staff]'],['management-residents','[data-resident]'],['management-worship','[data-person]']]){
   await routes[route](ctx);assert.equal(ctx.root.querySelectorAll(selector).length,3,route);assert.match(ctx.root.textContent,/Dai/);assert.match(ctx.root.textContent,/Novan/);assert.match(ctx.root.textContent,/Yusuf/);assert.doesNotMatch(ctx.root.textContent,/Alfi/);
  }
 }finally{database.set('users',beforeUsers);beforeDuty===undefined?database.delete('settings/naqibDuty/staff'):database.set('settings/naqibDuty/staff',beforeDuty);}
});

test('both admin homes show four primary workspaces and retain other administration routes',async()=>{
 const expected=['Data Santri','Data SDM','Data Sekolah','Data Asrama','Jadwal Pelajaran','Jadwal Program Keasramaan','Manajemen Fitur','Manajemen User'];
 for(const role of ['admin','super_admin']){
  const ctx=ctxFor(role),clicked=[];ctx.navigate=id=>clicked.push(id);
  const items=MENU_GROUPS.flatMap(g=>g.items).filter(i=>canAccess(i.feature||'dashboard',[role]));
  await homes.namespace.renderRoleHome(ctx,items);
  const cards=[...ctx.root.querySelectorAll('.premium-quick')];
  assert.deepEqual(cards.map(c=>c.querySelector('b').textContent),expected.slice(0,4));
  for(const card of cards){assert.ok(card.querySelector('small').textContent);card.click();}
  assert.deepEqual(clicked,cards.map(c=>c.dataset.homeRoute));
  assert.equal(ctx.root.querySelector('[data-home-route="deposit-admin"]'),null);
 }
});

test('feature manager loads role flags and saves a role-scoped patch',async()=>{
 const mod=await load(new URL('assets/js/feature-management.js',base).href);await mod.evaluate();
 const oldPatch=repository.patchNode;let captured;
 mock.setExport('patchNode',async(path,patch)=>{captured={path,patch};});
 try{
 const ctx=ctxFor('admin');await mod.namespace.renderFeatureManagement({root:ctx.root,uid:'admin'});
 assert.equal(ctx.root.querySelector('#featureForm').hidden,true);
 const role=ctx.root.querySelector('#featureRole');role.value='naqib';role.dispatchEvent(new win.Event('change'));
 assert.equal(ctx.root.querySelectorAll('[data-bottom]').length,3);
 assert.equal(ctx.root.querySelectorAll('.feature-bottom-slot').length,5);
 assert.match(ctx.root.querySelectorAll('.feature-bottom-slot')[2].textContent,/Posisi 3.*Beranda/);
 assert.equal(ctx.root.querySelectorAll('.feature-bottom-slot')[2].querySelector('select').disabled,true);
 assert.match(ctx.root.querySelectorAll('.feature-bottom-slot')[4].textContent,/Posisi 5.*Lainnya/);
 ctx.root.querySelector('[data-menu=quick][data-route=naqib-report]').checked=false;
 const checkbox=ctx.root.querySelector('[data-feature="boarding.naqib.attendance"]');assert.equal(checkbox.checked,true);checkbox.checked=false;
 submit(ctx.root.querySelector('#featureForm'));await new Promise(r=>setTimeout(r,0));
 assert.equal(captured.patch['settings/featureSwitches/naqib/_menus'].quick['naqib-report'],false);
 assert.equal(captured.path,'');assert.equal(captured.patch['settings/featureSwitches/naqib/boarding~naqib~attendance'],false);
 assert.ok(Object.keys(captured.patch).every(k=>k.startsWith('settings/featureSwitches/naqib/')||k==='settings/featureSwitchAudit/naqib'));
 assert.equal(ctx.root.querySelector('[data-feature="dashboard"]').disabled,true);
 }finally{mock.setExport('patchNode',oldPatch);const switches=await load(new URL('assets/js/feature-switches.js',base).href);switches.namespace.setFeatureSwitches({});}
});

test('counselor attendance review creates shared clarification cases and rejects corrected records',async()=>{
 const mod=await load(new URL('assets/js/counselor-attendance.js',base).href);await mod.evaluate();
 const ctx=ctxFor('konselor');ctx.session.profile.scopeGender='L';ctx.root.innerHTML='';
 const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Makassar'});
 const record={stage:'FINAL',status:'Alfa'};
 database.set('boarding/program_attendance/year',{[day]:{p:{s1:record,s2:record}}});
 database.set('boarding/program_attendance/year/'+day+'/p/s1',record);
 const original=repository.saveTeacherSession;let created=[];
 mock.setExport('saveTeacherSession',async(path,payload,options)=>{created.push({path,payload,options});return payload;});
 try{
 mod.namespace.mountAttendanceReferrals(ctx,[]);
 ctx.root.querySelector('#loadReferrals').click();await settle();
 assert.equal(ctx.root.querySelectorAll('[data-referral]').length,1);
 ctx.root.querySelector('[data-referral]').click();await settle();
 assert.equal(created.length,1);assert.ok(created[0].path.startsWith('boarding/cases/year/'));assert.equal(created[0].payload.status,'menunggu_konselor');assert.equal(created[0].options.createOnly,true);assert.equal(created[0].payload.finalPoints,undefined);
 ctx.root.querySelector('#loadReferrals').click();await settle();
 database.set('boarding/program_attendance/year/'+day+'/p/s1',{...record,status:'Hadir'});
 ctx.root.querySelector('[data-referral]').click();await settle();
 assert.equal(created.length,1);assert.match(ctx.root.textContent,/Presensi sudah berubah/);
 }finally{mock.setExport('saveTeacherSession',original);database.delete('boarding/program_attendance/year');database.delete('boarding/program_attendance/year/'+day+'/p/s1');}
});

test('quality cards load only selected sources and reuse them across filters and indicators',async()=>{
 const ctx=ctxFor('head_formal_school');ctx.session.profile.unitIds=['u1'];ctx.master={...master,classes:[{id:'c1',unitId:'u1',name:'Kelas Uji'}]};ctx.root.innerHTML='';
 const reads=[],original=repository.getNode;mock.setExport('getNode',async p=>{reads.push(p);return original(p);});
 const click=async selector=>{ctx.root.querySelector(selector).click();await settle();};
 try{
 await routes['school-quality'](ctx);assert.equal(reads.length,0);assert.equal(ctx.root.querySelectorAll('[data-quality-group]').length,8);
 exportVisual(ctx,'head_formal_school','school-quality');
 await click('[data-quality-group="students"]');assert.equal(reads.length,0);
 await click('[data-quality-indicator="student-exams"]');assert.deepEqual(reads,['academic/exam_sessions/year']);assert.match(ctx.root.textContent,/Memenuhi KKM/);
 ctx.root.querySelector('[name=qualityGender]').value='P';ctx.root.querySelector('[name=qualityGender]').onchange();await settle();assert.equal(reads.length,1);
 await click('#qualityBack');await click('[data-quality-indicator="student-exams"]');assert.equal(reads.length,1);
 await click('#qualityReload');assert.equal(reads.length,2);
 await click('#qualityBack');await click('[data-quality-indicator="student-character"]');assert.equal(reads.at(-1),'boarding/mentoring/year');assert.equal(reads.length,3);
 await click('#qualityBack');await click('#qualityBack');await click('[data-quality-group="finance"]');await click('[data-quality-indicator="finance-status"]');assert.equal(reads.length,3);
 assert.equal(canAccess('workspace.school-quality',['naqib']),false);assert.equal(canAccess('workspace.school-quality',['head_formal_school']),true);
 }finally{mock.setExport('getNode',original);}
});

test('quality request failures retry and late results cannot replace cards after back navigation',async()=>{
 const ctx=ctxFor('head_formal_school');ctx.session.profile.unitIds=['u1'];ctx.root.innerHTML='';const original=repository.getNode;let resolve,attempts=0;
 mock.setExport('getNode',()=>{attempts++;return attempts===1?Promise.reject(Error('Connection failed')):new Promise(r=>{resolve=r;});});
 try{await routes['school-quality'](ctx);ctx.root.querySelector('[data-quality-group="students"]').click();ctx.root.querySelector('[data-quality-indicator="student-exams"]').click();await settle();assert.match(ctx.root.textContent,/Connection failed/);
 ctx.root.querySelector('#qualityRetry').click();await settle();assert.equal(attempts,2);ctx.root.querySelector('#qualityBack').click();resolve(null);await settle();assert.equal(ctx.root.querySelectorAll('[data-quality-indicator]').length,7);assert.equal(ctx.root.querySelector('#qualityRetry'),null);
 }finally{mock.setExport('getNode',original);}
});
test('resident and worship writes include the academic year required by database validation',async()=>{
 const ctx=ctxFor('head_boys_dorm');ctx.master={...master,staff:[{id:'resident-test',name:'Petugas Uji',gender:'L'}]};const previous=database.get('users');database.set('users',{test:{staffId:'resident-test',role:'naqib',active:true}});
 const start=writes.length;try{
 await routes['management-residents'](ctx);ctx.root.querySelector('[data-resident]').checked=true;ctx.root.querySelector('#saveResidents').click();await settle();
 const resident=writes.slice(start).find(w=>w.path.endsWith('/resident_staff'));assert.equal(resident.data.academicYearId,'year');assert.equal(resident.data.scope,'boarding-L');assert.equal(resident.data.staffId,'resident-test');
 await routes['management-worship'](ctx);ctx.root.querySelector('[data-person]').value='Hadir';ctx.root.querySelector('#saveWorship').click();await settle();
 const worship=writes.slice(start).find(w=>w.path.endsWith('/staff_worship'));assert.equal(worship.data.academicYearId,'year');assert.equal(worship.data.attendance['resident-test'],'Hadir');
 }finally{database.set('users',previous);database.delete('workspaces/year/resident_staff/resident-test');}
});

test('resident preflight names incomplete canonical SDM and writes nothing',async()=>{
 const ctx=ctxFor('head_boys_dorm'),previous=database.get('users');ctx.master={...master,staff:[{id:'missing-gender',name:'Petugas Belum Lengkap'}]};database.set('users',{u:{staffId:'missing-gender',role:'naqib',scopeGender:'L',active:true}});
 try{await routes['management-residents'](ctx);const start=writes.length;ctx.root.querySelector('[data-resident]').checked=true;ctx.root.querySelector('#saveResidents').click();await settle();assert.equal(writes.length,start);assert.match(ctx.root.textContent,/Data SDM.*Petugas Belum Lengkap/);
 }finally{database.set('users',previous);}
});

test('Naqib shared report saves selected students as one incident with reporter identity',async()=>{
 const boarding=await load(new URL('assets/js/modules/boarding.js',base).href);if(boarding.status!=='evaluated')await boarding.evaluate();const ctx=ctxFor('naqib');let captured;const previous=repository.patchNode;
 mock.setExport('patchNode',async(path,patch)=>{captured=patch;});
 try{await boarding.namespace.renderNaqibCase(ctx);
 const search=ctx.root.querySelector('#reportSearch');assert.equal(ctx.root.querySelector('#reportStudentResults').hidden,true);assert.equal(ctx.root.querySelectorAll('[data-name]:not([hidden])').length,0);search.value='putri';search.dispatchEvent(new win.Event('input'));assert.equal(ctx.root.querySelectorAll('[data-name]:not([hidden])').length,1);
 search.value='no match';search.dispatchEvent(new win.Event('input'));assert.equal(ctx.root.querySelector('#reportNoResults').hidden,false);
 search.value='';search.dispatchEvent(new win.Event('input'));assert.equal(ctx.root.querySelector('#reportStudentResults').hidden,true);assert.equal(ctx.root.querySelector('#reportNoResults').hidden,true);assert.equal(ctx.root.querySelectorAll('[data-name]:not([hidden])').length,0);
 ctx.root.querySelector('[data-source-mode="langsung"]').click();assert.equal(ctx.root.querySelector('#reportSource').value,'langsung');
 ctx.root.querySelector('[data-source-mode="santri"]').click();assert.equal(ctx.root.querySelector('#reporterPicker').hidden,false);assert.equal(ctx.root.querySelector('#reportSource').value,'');assert.equal(ctx.root.querySelectorAll('[data-reporter]').length,0);
 const reporterSearch=ctx.root.querySelector('#reporterSearch');reporterSearch.value='putri';reporterSearch.dispatchEvent(new win.Event('input'));assert.equal(ctx.root.querySelectorAll('[data-reporter]').length,1);ctx.root.querySelector('[data-reporter="s2"]').click();assert.equal(ctx.root.querySelector('#reportSource').value,'s2');assert.match(ctx.root.querySelector('#reporterSelected').textContent,/Santri Putri/);
 ctx.root.querySelector('[data-source-mode="langsung"]').click();assert.equal(ctx.root.querySelector('#reporterPicker').hidden,true);assert.equal(ctx.root.querySelector('#reportSource').value,'langsung');
 ctx.root.querySelector('[data-source-mode="santri"]').click();reporterSearch.value='not found';reporterSearch.dispatchEvent(new win.Event('input'));assert.equal(ctx.root.querySelectorAll('[data-reporter]').length,0);assert.match(ctx.root.querySelector('#reporterHint').textContent,/tidak ditemukan/);
 reporterSearch.value='putri';reporterSearch.dispatchEvent(new win.Event('input'));ctx.root.querySelector('[data-reporter="s2"]').click();ctx.root.querySelector('#clearReporter').click();assert.equal(ctx.root.querySelector('#reportSource').value,'');reporterSearch.value='putri';reporterSearch.dispatchEvent(new win.Event('input'));ctx.root.querySelector('[data-reporter="s2"]').click();

 ctx.root.querySelector('[data-category="Moral/Etika"]').click();assert.equal(ctx.root.querySelector('#reportCategory').value,'Moral/Etika');assert.equal(ctx.root.querySelector('[data-category="Moral/Etika"]').getAttribute('aria-pressed'),'true');
 ctx.root.querySelectorAll('[data-student]').forEach(el=>{el.checked=true;el.dispatchEvent(new win.Event('change'));});assert.equal(ctx.root.querySelector('#reportSelectionCount').textContent,'2 dipilih');ctx.root.querySelector('#reportCategory').value='Kedisiplinan';ctx.root.querySelector('#reportDescription').value='Kejadian uji';ctx.root.querySelector('#reportCritical').checked=true;ctx.root.querySelector('#sendReport').click();await settle();const records=Object.entries(captured).filter(([p])=>p.startsWith('boarding/cases/')).map(([,v])=>v);assert.equal(records.length,2);assert.equal(new Set(records.map(r=>r.groupId)).size,1);for(const r of records){assert.equal(r.reportedBy,ctx.session.user.uid);assert.equal(r.reportedByRole,'naqib');assert.equal(r.sourceStudentId,'s2');assert.equal(r.critical,true);assert.equal(r.parentVisible,false);assert.equal(r.finalPoints,undefined);}
 }finally{mock.setExport('patchNode',previous);}
});

test('counseling report filters cached cases without exposing other dorm students',async()=>{
 const module=await load(new URL('assets/js/leadership-monitor.js',base).href);if(module.status!=='evaluated')await module.evaluate();
 const ctx=ctxFor('head_boys_dorm');
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const path='boarding/cases/year',before=database.get(path),writeCount=writes.length;
 database.set(path,{a:{studentId:'s1',date,status:'menunggu_konselor',category:'Kebersihan',description:'Kronologi uji'},b:{studentId:'s1',date,status:'selesai',category:'Kedisiplinan'},c:{studentId:'s2',date,status:'menunggu_konselor',category:'RAHASIA PUTRI'}});
 try{
  await module.namespace.renderLeadershipMonitor(ctx,'dorm-counselor');
  assert.equal(ctx.root.querySelectorAll('.case-progress-record').length,2);
  assert.doesNotMatch(ctx.root.textContent,/RAHASIA PUTRI/);
  const filter=ctx.root.querySelector('.case-status-filter select');filter.value='waiting';filter.dispatchEvent(new win.Event('change'));
  assert.equal(ctx.root.querySelectorAll('.case-progress-record').length,1);
  assert.match(ctx.root.querySelector('.case-record-detail').textContent,/Kronologi uji/);
  const search=ctx.root.querySelector('[type=search]');search.value='tidak cocok';search.dispatchEvent(new win.Event('input'));
  assert.equal(ctx.root.querySelectorAll('.case-progress-record').length,0);
  assert.equal(ctx.root.querySelector('.portal-metric strong').textContent,'2');
  ctx.root.querySelector('[data-period=month]').click();assert.ok(ctx.root.querySelector('[name=from]').value<date);
  assert.equal(writes.length,writeCount);
 }finally{before===undefined?database.delete(path):database.set(path,before);}
});

test('shared personnel record keeps identity, content, and status in separate cells',async()=>{
 const module=await load(new URL('assets/js/modules/common.js',base).href);if(module.status!=='evaluated')await module.evaluate();
 const root=win.document.createElement('div');
 root.innerHTML=module.namespace.recordCard('Wisnu <Nusantara>','<p>05:40–06:10 · Bahasa Arab Pagi</p><small>Verifikasi kehadiran atau izin.</small>','Belum presensi','waiting');
 assert.equal(root.querySelector('.record-avatar').textContent,'W');
 assert.equal(root.querySelector('.record-copy h3').textContent,'Wisnu <Nusantara>');
 assert.equal(root.querySelector('.record-status').textContent,'Belum presensi');
 assert.equal(root.querySelectorAll('nusantara').length,0);
 assert.match(root.querySelector('.record-copy').textContent,/05:40–06:10/);
});

test('workspace header reuses home identity and profile/message actions',async()=>{
 const module=await load(new URL('assets/js/home-role-switcher.js',base).href);if(module.status!=='evaluated')await module.evaluate();
 const top=win.document.createElement('header');top.className='portal-topbar';win.document.body.append(top);
 const ctx=ctxFor('head_boys_dorm'),visited=[];ctx.navigate=route=>visited.push(route);
 try{
  module.namespace.mountWorkspaceHeader(ctx);
  const expected=win.document.createElement('div');expected.innerHTML=module.namespace.homeHeader(ctx);assert.equal(top.querySelector('.official-home-header').outerHTML,expected.innerHTML);
  top.querySelector('.official-avatar').click();top.querySelector('.official-bell').click();
  assert.deepEqual(visited,['work-profile','work-messages']);
  module.namespace.mountWorkspaceHeader(ctx);assert.equal(top.querySelectorAll('.official-home-header').length,1);
 }finally{top.remove();}
});
