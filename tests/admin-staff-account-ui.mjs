import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
import {staffAccountCell,staffAccountAction,renderStaffAccountPrompt} from '../assets/js/staff-account-link.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
const source=readFileSync(new URL('../assets/js/admin.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
test('adding SDM saves only staff then offers account; editing does not prompt for a new account',async()=>{
 for(const id of [null,'s-existing']){
 const dom=new JSDOM('<h2 id="modalTitle"></h2><div id="modalBackdrop"><form id="entityForm"><input name="name" value="SDM Baru"></form></div>');const writes=[];
 const context=vm.createContext({FormData:dom.window.FormData,editState:{section:'staff',id},entityConfig:{staff:{prefix:'SDM',fields:[{name:'name'}]}},cache:{staff:[]},pathMap:{staff:'staff'},session:{user:{uid:'admin'}},makeId:()=> 's-new',getNode:async()=>null,saveRecord:async(...args)=>writes.push(args),normalizeAdminRecord:(_s,data)=>data,toast:()=>{},closeForm:()=>dom.window.document.querySelector('#modalBackdrop').classList.add('hidden'),reloadAndRender:async()=>{},renderStaffAccountPrompt,$:s=>dom.window.document.querySelector(s)});
 vm.runInContext(extract('async function submitForm(', '\nfunction exportSection('),context);
 await context.submitForm({preventDefault(){},currentTarget:dom.window.document.querySelector('form')});
 assert.equal(writes.length,1);assert.equal(writes[0][0],'staff');assert.equal(writes[0][1],id||'s-new');
 const link=dom.window.document.querySelector('a');assert.equal(!!link,!id);if(!id){assert.equal(link.getAttribute('href'),'./accounts.html?staffId=s-new');assert.equal(dom.window.document.querySelector('#modalBackdrop').classList.contains('hidden'),false);}
 }
});
test('SDM table renders account state and create/manage action beside the right person',()=>{
 const context=vm.createContext({entityConfig:{staff:{columns:[['name','Nama'],['accountStatus','Akun Aplikasi']]}},staffAccountProfiles:[{id:'u',staffId:'s2',email:'dua@example.test',active:false}],staffAccountCell,staffAccountAction,escapeHtml:s=>String(s),formatCell:(_s,_f,v)=>v});
 vm.runInContext(extract('function rowsMarkup(', '\nfunction formatCell('),context);
 const dom=new JSDOM('<table>'+context.rowsMarkup('staff',[{id:'s1',name:'Satu'},{id:'s2',name:'Dua'}])+'</table>');
 const rows=dom.window.document.querySelectorAll('tr');assert.match(rows[0].textContent,/Belum punya akun/);assert.match(rows[0].textContent,/Buat akun/);assert.match(rows[1].textContent,/Akun nonaktif/);assert.match(rows[1].textContent,/dua@example.test/);assert.match(rows[1].textContent,/Kelola akun/);
});
