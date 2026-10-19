import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
import {ADMIN_WORKSPACES,workspaceFor,normalizeAdminRecord} from '../assets/js/admin-workspaces.js';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('admin uses existing records, opens seven workspaces, preserves metadata on edits and opens class roster',async()=>{
 const dom=new JSDOM(fs.readFileSync('admin/index.html','utf8'),{url:'http://localhost/admin/index.html'}),w=dom.window;
 const records={staff:[{id:'t',name:'Pembina',gender:'L',status:'active',appRoles:['naqib'],roleScopes:{naqib:{genderScope:'L'}}}],students:[{id:'s',name:'Santri',unitId:'u',status:'active'}],units:[{id:'u',name:'SMP',type:'SMP'}],classes:[{id:'c',name:'7 Putra',unitId:'u'}],academic_years:[{id:'y',name:'2026/2027'}]};let saved;
 let source=fs.readFileSync('assets/js/admin.js','utf8');const names=[];source=source.replace(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"];?/g,(_,s)=>{names.push(...s.split(',').map(s=>s.trim()));return '';});
 const scope={document:w.document,window:w,location:w.location,FormData:w.FormData,console,Set,Date,ADMIN_WORKSPACES,workspaceFor,normalizeAdminRecord};for(const name of names)if(!(name in scope))scope[name]=async()=>{};
 Object.assign(scope,{$:s=>w.document.querySelector(s),$$:s=>[...w.document.querySelectorAll(s)],escapeHtml:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),requireAdmin:async()=>({user:{uid:'admin'},profile:{name:'Admin'}}),listNode:async p=>records[p]||[],getCurrentAcademicYearId:async()=> 'y',getNode:async p=>p==='staff/t'?records.staff[0]:null,getClassAssignments:async()=>({s:{studentId:'s',classId:'c'}}),saveRecord:async(path,id,data)=>{saved={path,id,data};},toast:()=>{}});
 const context=vm.createContext(scope);vm.runInContext(source+'\nglobalThis.api={navigate,openForm,submitForm};',context);
 await new Promise(r=>setTimeout(r,10));assert.equal(w.document.querySelectorAll('[data-workspace]').length,6);assert.ok(w.document.querySelector('a[href="./accounts.html"]'));assert.ok(w.document.querySelector('#addButton'));assert.equal(w.document.querySelector('#adminImport'),null);await scope.api.navigate('import');assert.equal(w.document.querySelector('#pageTitle').textContent,'Data Santri');if(process.env.ADMIN_PREVIEW){w.document.querySelectorAll('script').forEach(n=>n.remove());w.document.querySelectorAll('[href]').forEach(n=>{if(n.getAttribute('href').startsWith('../'))n.setAttribute('href','file://'+process.cwd()+'/'+n.getAttribute('href').slice(3));});fs.writeFileSync(process.env.ADMIN_PREVIEW,dom.serialize());}
 await scope.api.navigate('classes');w.document.querySelector('[data-members]').click();await new Promise(r=>setTimeout(r,10));assert.equal(w.document.querySelector('#placementTarget').value,'c');assert.equal(w.document.querySelector('[data-student="s"]').checked,true);
 await scope.api.navigate('staff');scope.api.openForm('staff','t');w.document.querySelector('[name="name"]').value='Pembina Updated';await scope.api.submitForm({preventDefault(){},currentTarget:w.document.querySelector('#entityForm')});assert.equal(saved.data.name,'Pembina Updated');assert.deepEqual(saved.data.appRoles,['naqib']);assert.equal(saved.data.roleScopes.naqib.genderScope,'L');
 await scope.api.navigate('quran-schedules');w.document.querySelector('#addButton').click();assert.ok(w.document.querySelector('[name="targetId"]'));
});

test('legacy admin editor redirects and account navigation uses the same seven areas',()=>{
 const legacy=fs.readFileSync('admin/validation.html','utf8');
 assert.match(legacy,/url=\.\/index.html#students/);
 assert.doesNotMatch(legacy,/validation\.js|validationTable/);
 const page=new JSDOM(fs.readFileSync('admin/accounts.html','utf8'));
 const labels=[...page.window.document.querySelectorAll('.nav-menu a')].map(a=>a.textContent.trim());
 assert.deepEqual(labels,['Beranda',...Object.values(ADMIN_WORKSPACES).map(w=>w.title)]);
 assert.doesNotMatch(fs.readFileSync('admin/index.html','utf8'),/Validasi Data|Import Data|Admin Master Data/);
});
