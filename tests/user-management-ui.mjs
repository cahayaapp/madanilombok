import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {mountUserManagement} from '../assets/js/user-management.js';import {ROLE_LABELS} from '../assets/js/permissions.js';
const require=createRequire(import.meta.url);const {JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const master={staff:[{id:'s1',name:'Pengajar'}],units:[{id:'smk',name:'SMK'}],classes:[{id:'c1',name:'Kelas X',unitId:'smk'}],groups:[],students:[{id:'child1',name:'Ananda'}],subjects:[]};
function setup(overrides={}){const dom=new JSDOM('<main></main>',{url:'http://localhost'});globalThis.window=dom.window;globalThis.document=dom.window.document;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};dom.window.confirm=()=>true;
 const profiles=[{id:'admin',name:'Admin',email:'admin@example.test',role:'admin'},{id:'teacher',name:'Guru Satu',email:'guru@example.test',role:'guru_mapel',staffId:'s1',roleScopes:{guru_mapel:{classIds:['c1']}}}];
 const events=[];const root=document.querySelector('main');const ui=mountUserManagement({root,getProfiles:()=>profiles,master,actorUid:'admin',save:async(p,d)=>{events.push(['save',p.id,structuredClone(d)]);Object.assign(p,d);},create:async(d,pw)=>events.push(['create',structuredClone(d),pw]),revoke:async p=>{events.push(['revoke',p.id]);p.accessRevoked=true;p.active=false;},reset:async p=>events.push(['reset',p.id]),reload:async()=>events.push(['reload']),...overrides});
 const change=(el)=>el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));return {dom,root,ui,profiles,events,change};}
const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
test('search and filters find users by staff link and role',()=>{const {root,dom}=setup();const input=root.querySelector('#userSearch');input.value='Pengajar';input.dispatchEvent(new dom.window.Event('input'));assert.match(root.querySelector('#userCount').textContent,/1 dari 2/);assert.match(root.querySelector('#managedUserRows').textContent,/Guru Satu/);assert.doesNotMatch(root.querySelector('#managedUserRows').textContent,/admin@example/);});
test('editor supports all roles, multiple selection, default role and preserves assignments',async()=>{const {root,ui,profiles,change,events,dom}=setup();ui.open(profiles[1]);assert.equal(root.querySelectorAll('[data-pick-role]').length,Object.keys(ROLE_LABELS).length);assert.equal(root.querySelector('#userEmailInput').disabled,true);
 const box=root.querySelector('[data-pick-role="director"]');box.checked=true;change(box);const main=root.querySelector('#userDefaultRole');main.value='director';change(main);
 root.querySelector('#userEditorForm').dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));await settle();assert.equal(events[0][0],'save');assert.deepEqual(events[0][2].roles,['guru_mapel','director']);assert.equal(events[0][2].defaultRole,'director');assert.deepEqual(events[0][2].roleScopes.guru_mapel.classIds,['c1']);assert.equal(root.querySelector('#userEditor').open,false);
});
test('add user invokes creation with selected roles and password; empty roles fail visibly',async()=>{const {root,ui,change,events,dom}=setup();ui.open();root.querySelector('#userNameInput').value='Guru Baru';root.querySelector('#userEmailInput').value='baru@example.test';root.querySelector('#userPasswordInput').value='ExampleOnly123!';
 const form=root.querySelector('#userEditorForm');form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();assert.equal(events.length,0);assert.match(root.querySelector('#userEditorError').textContent,/minimal satu role/);
 const box=root.querySelector('[data-pick-role="guru_mapel"]');box.checked=true;change(box);form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();assert.equal(events[0][0],'create');assert.equal(events[0][1].defaultRole,'guru_mapel');assert.equal(events[0][2],'ExampleOnly123!');
});
test('revoke is disabled for self and enables restoration through editor',async()=>{const {root,events}=setup();assert.equal(root.querySelector('[data-revoke="admin"]').disabled,true);root.querySelector('[data-revoke="teacher"]').click();await settle();assert.deepEqual(events[0],['revoke','teacher']);assert.match(root.querySelector('[data-edit="teacher"]').textContent,/Pulihkan/);assert.equal(root.querySelector('[data-revoke="teacher"]').disabled,true);});

test('SDM handoff prefills a new account without creating it or assigning roles',()=>{
 master.staff.push({id:'s2',name:'SDM Baru',email:'baru@example.test'});const {ui,root,events}=setup();
 try{ui.openForStaff('s2');assert.equal(root.querySelector('#userEditorTitle').textContent,'Tambah User');assert.equal(root.querySelector('#userStaffInput').value,'s2');assert.equal(root.querySelector('#userNameInput').value,'SDM Baru');assert.equal(root.querySelector('#userEmailInput').value,'baru@example.test');assert.equal(root.querySelectorAll('[data-pick-role]:checked').length,0);assert.equal(events.length,0);}
 finally{master.staff.pop();}
});
test('SDM handoff edits an existing inactive account and rejects unknown SDM',()=>{
 const {ui,root,profiles,events}=setup();profiles[1].active=false;ui.openForStaff('s1');assert.equal(root.querySelector('#userEditorTitle').textContent,'Edit User');assert.equal(root.querySelector('#userActiveInput').value,'false');assert.equal(root.querySelector('#userPasswordField').hidden,true);ui.openForStaff('missing');assert.match(root.querySelector('#userPageError').textContent,/SDM tidak ditemukan/);assert.equal(events.length,0);
});
test('manual account creation cannot duplicate an already linked SDM',async()=>{
 const {ui,root,change,dom,events}=setup();ui.open();root.querySelector('#userNameInput').value='Duplikat';root.querySelector('#userEmailInput').value='duplikat@example.test';root.querySelector('#userStaffInput').value='s1';const box=root.querySelector('[data-pick-role="guru_mapel"]');box.checked=true;change(box);root.querySelector('#userEditorForm').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();assert.equal(events.length,0);assert.match(root.querySelector('#userEditorError').textContent,/sudah terhubung/);
});

test('new account credentials download once, clear password input, and never appear for edits',async()=>{
 const downloads=[];const {root,ui,change,dom,profiles}=setup({downloadCredentials:account=>downloads.push({...account})});
 ui.open();root.querySelector('#userNameInput').value='Baru';root.querySelector('#userEmailInput').value='baru@example.test';root.querySelector('#userPasswordInput').value='Initial123!';
 const box=root.querySelector('[data-pick-role="admin"]');box.checked=true;change(box);
 root.querySelector('#userEditorForm').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();
 assert.equal(root.querySelector('#newUserCredentials').hidden,false);assert.equal(root.querySelector('#userPasswordInput').value,'');assert.ok(!root.querySelector('#newUserCredentials').innerHTML.includes('Initial123!'));
 root.querySelector('[data-download-credentials]').click();assert.deepEqual(downloads,[{email:'baru@example.test',password:'Initial123!'}]);assert.equal(root.querySelector('#newUserCredentials').hidden,true);
 ui.open(profiles[0]);root.querySelector('#userEditorForm').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();assert.equal(root.querySelector('#newUserCredentials').hidden,true);
});
test('failed creation never offers credentials',async()=>{
 const {root,ui,change,dom}=setup({create:async()=>{throw Error('Creation failed');}});ui.open();root.querySelector('#userNameInput').value='Baru';root.querySelector('#userEmailInput').value='baru@example.test';root.querySelector('#userPasswordInput').value='Initial123!';const box=root.querySelector('[data-pick-role="admin"]');box.checked=true;change(box);root.querySelector('#userEditorForm').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();assert.equal(root.querySelector('#newUserCredentials').hidden,true);assert.match(root.querySelector('#userEditorError').textContent,/Creation failed/);
});

test('assignment checklists save multiple units and classes and retain selections while toggling roles',async()=>{
 master.units.push({id:'smp',name:'SMP'});master.classes.push({id:'c2',name:'Kelas VII',unitId:'smp'});
 try{
 const {root,ui,profiles,change,events,dom}=setup();ui.open(profiles[1]);
 for(const key of ['unitIds','classIds'])for(const input of root.querySelectorAll(`[data-scope-role="guru_mapel"][data-scope-field="${key}"] input`))input.checked=true;
 const role=root.querySelector('[data-pick-role="guru_wali"]');role.checked=true;change(role);
 assert.equal(root.querySelectorAll('[data-scope-role="guru_mapel"][data-scope-field="classIds"] input:checked').length,2);
 root.querySelector('#userEditorForm').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(events[0][2].roleScopes.guru_mapel.unitIds,['smk','smp']);assert.deepEqual(events[0][2].roleScopes.guru_mapel.classIds,['c1','c2']);
 }finally{master.units.pop();master.classes.pop();}
});
