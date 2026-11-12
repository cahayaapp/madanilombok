import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const base=new URL('../',import.meta.url),TIME=Date.parse('2026-11-12T01:00:00Z');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function environment(file,url,overrides={}){
 const dom=new JSDOM(readFileSync(new URL(file,base),'utf8'),{url,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,intervals=[];let at=TIME;
 const RealDate=w.Date;w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[at]));}static now(){return at;}};
 w.matchMedia=()=>({matches:false});w.setTimeout=fn=>{queueMicrotask(fn);return 1;};w.clearTimeout=()=>{};w.setInterval=fn=>{intervals.push(fn);return intervals.length;};w.clearInterval=()=>{};
 const context=dom.getInternalVMContext(),cache=new Map();
 function synthetic(id,exports){const mod=new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v);},{context,identifier:id});cache.set(id,mod);return mod;}
 async function load(id){if(cache.has(id))return cache.get(id);if(overrides[id])return synthetic(id,overrides[id]);const source=readFileSync(new URL(id),'utf8'),m=new vm.SourceTextModule(source,{context,identifier:id});cache.set(id,m);await m.link((specifier,referer)=>load(new URL(specifier,referer.identifier).href));return m;}
 return {dom,w,intervals,advance:value=>{at=value;},run:async path=>{const m=await load(new URL(path,base).href);await m.evaluate();await settle();}};
}
function feed(){const section=(status,count)=>({total:count,rows:Array.from({length:count},(_,i)=>({name:'Santri Contoh '+i,label:'Kelas Uji',status}))});return {version:1,enabled:true,date:'2026-11-12',updatedAt:TIME,expiresAt:Date.parse('2026-11-12T16:00:00Z'),quran:section('submitted',9),teachers:section('present',2),students:section('present',12)};}
test('selector links to the three public unit screens',()=>{
 const dom=new JSDOM(readFileSync(new URL('live/index.html',base),'utf8'));
 assert.deepEqual([...dom.window.document.querySelectorAll('nav a')].map(a=>a.getAttribute('href')),['/live/putra/','/live/putri/','/live/gabungan/']);dom.window.close();
});
test('TV paginates names safely, selects channels, pauses and clears yesterday',async()=>{
 const env=await environment('live/putra/index.html','https://app.almadanilombok.com/live/putra/');let requests=0;
 env.w.matchMedia=()=>({matches:false,addEventListener:()=>{}});const data={...feed(),unit:'putra'};data.quran.rows[0].name='Santri <img onerror="bad()">';
 env.w.fetch=async(url,options)=>{requests++;assert(url.endsWith('/madani_live/putra.json'));assert.equal(options.credentials,'omit');return {ok:true,json:async()=>data};};
 await env.run('live/tv.js');const d=env.w.document;
 d.querySelectorAll('#channels button')[2].click();assert.match(d.querySelector('#stage h1').textContent,/Sudah setoran/);assert.equal(d.querySelectorAll('.person').length,9);assert.equal(d.querySelectorAll('img[onerror]').length,0);assert.match(d.querySelector('#clock').textContent,/09:00/);
 d.querySelector('#pause').click();assert(d.body.classList.contains('paused'));env.advance(TIME+60000);env.intervals[0]();assert.match(d.querySelector('#stage h1').textContent,/Sudah setoran/);
 d.querySelector('#next').click();assert.match(d.querySelector('#stage h1').textContent,/Belum tercatat/);
 env.advance(Date.parse('2026-11-12T16:01:00Z'));env.intervals[0]();await settle();d.querySelectorAll('#channels button')[2].click();assert(!d.querySelector('#stage').textContent.includes('Santri Contoh'));assert.match(d.querySelector('#stage').textContent,/belum tersedia|Menunggu/);assert(requests>=2);env.dom.window.close();
});
test('public permission denial clears names and wrong-unit snapshots are rejected',async()=>{
 const env=await environment('live/putra/index.html','https://app.almadanilombok.com/live/putra/');env.w.matchMedia=()=>({matches:false,addEventListener:()=>{}});let mode='wrong';
 env.w.fetch=async()=>mode==='deny'?{ok:false,status:403}:{ok:true,json:async()=>({...feed(),unit:mode==='wrong'?'putri':'putra'})};await env.run('live/tv.js');const d=env.w.document;d.querySelectorAll('#channels button')[2].click();assert.equal(d.querySelectorAll('.person').length,0);
 mode='ok';env.intervals[1]();await settle();d.querySelectorAll('#channels button')[2].click();assert(d.querySelector('.person'));mode='deny';env.intervals[1]();await settle();assert.equal(d.querySelectorAll('.person').length,0);env.dom.window.close();
});
