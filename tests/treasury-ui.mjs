import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const win=new JSDOM('<main id="root"></main>',{url:'http://localhost/'}).window;
const context=vm.createContext({document:win.document,window:win,sessionStorage:win.sessionStorage,FormData:win.FormData,crypto:webcrypto,Intl,Date,console});
const cache=new Map(),repo=new vm.SyntheticModule(['getNode','listNode','getCurrentAcademicYearId'],function(){for(const key of ['getNode','listNode','getCurrentAcademicYearId'])this.setExport(key,async()=>null);},{context});
function module(url){if(url.endsWith('/repository.js'))return repo;if(!cache.has(url))cache.set(url,new vm.SourceTextModule(readFileSync(fileURLToPath(url),'utf8'),{context,identifier:url}));return cache.get(url);}
const ui=module(new URL('../assets/js/treasury/ui.js',import.meta.url).href);await ui.link((s,p)=>module(new URL(s,p.identifier).href));await ui.evaluate();
const el=s=>win.document.querySelector(s);
async function setup(execute=async op=>({reference:`TU-${op.id}`})){
 win.sessionStorage.clear();const calls=[];const ctx={root:el('#root'),session:{user:{uid:'b'}},navigate:()=>{},minimartAPI:{treasury:async()=>({students:[{id:'s1',name:'Ali',nis:'123'},{id:'s2',name:'Budi',nis:'456'}],wallets:{s1:{spending:100000}},bills:{s1:{b1:{period:'2026-11',amount:50000,paidAmount:10000}}},topups:[],payments:[]}),execute:async op=>{calls.push(structuredClone(op));return execute(op);}}};await ui.namespace.renderTreasuryTopup(ctx);return {ctx,calls};
}
async function choose(){el('#trStudent').value='s1';await el('#trStudent').onchange();}
async function fill(){await choose();const f=el('[data-op=topup]');f.elements.amount.value='25000';f.elements.note.value='Setoran wali';return f;}
test('search resolves canonical student, topup sends integer and confirms receipt',async()=>{
 const {calls}=await setup();el('#trSearch').value='123';el('#trSearch').oninput();assert.equal(el('#trStudent').options.length,2);const form=await fill();await form.onsubmit({preventDefault(){}});assert.equal(calls[0].studentId,'s1');assert.equal(calls[0].amount,25000);assert.equal(calls[0].type,'treasury:topup');assert.match(el('#trNotice').textContent,/Tersimpan/);assert.equal(win.sessionStorage.length,0);
});
test('lost response locks new deposits and reload retries original ID',async()=>{
 let tries=0;const {ctx,calls}=await setup(async op=>{if(!tries++)throw Error('Network lost');return {id:op.id};});await (await fill()).onsubmit({preventDefault(){}});assert.ok(el('#trRetry'));assert.ok(el('[data-op=topup] button').disabled);await ui.namespace.renderTreasuryTopup(ctx);await el('#trRetry').onclick();assert.equal(calls[0].id,calls[1].id);assert.equal(win.sessionStorage.length,0);
});
test('SPP uses existing outstanding bills and a separate operation type',async()=>{
 const {ctx,calls}=await setup();await ui.namespace.renderTreasurySPP(ctx);await choose();const f=el('[data-op=bill-pay]');assert.match(f.textContent,/40.000/);f.elements.billId.value='b1';f.elements.amount.value='20000';await f.onsubmit({preventDefault(){}});assert.equal(calls[0].type,'treasury:bill-pay');assert.equal(calls[0].billId,'b1');
});
