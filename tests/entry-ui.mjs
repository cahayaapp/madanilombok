import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../assets/js/entry.js',import.meta.url),'utf8').split('// Load authentication')[0];
function page({standalone=false,ios=false,secure=true,online=true}={}){
 const dom=new JSDOM(html,{url:'https://madani.example/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w,'isSecureContext',{value:secure});
 Object.defineProperty(w.navigator,'onLine',{value:online});
 Object.defineProperty(w.navigator,'standalone',{value:ios&&standalone});
 if(ios)Object.defineProperty(w.navigator,'userAgent',{value:'iPhone'});
 w.matchMedia=query=>({matches:standalone&&query.includes('standalone'),addEventListener(){}});
 w.eval(source);return w;
}
test('installed launches go directly to login without browser or install navigation',()=>{
 for(const ios of [false,true]){const w=page({standalone:true,ios});assert.equal(w.document.querySelector('#loginScene').classList.contains('hidden'),false);for(const id of ['continueWebBtn','backInstallBtn','installMainBtn'])assert.equal(w.document.getElementById(id).hidden,true);w.close();}
});
test('install prompt is single-use, dismissal supports retry and installation opens login',async()=>{
 const w=page(),b=w.document.getElementById('installMainBtn');let calls=0,resolveChoice;
 const ev=new w.Event('beforeinstallprompt',{cancelable:true});ev.prompt=async()=>{calls++;};ev.userChoice=new Promise(r=>resolveChoice=r);w.dispatchEvent(ev);assert.ok(ev.defaultPrevented);
 const pending=b.onclick();await b.onclick();assert.equal(calls,1);assert.ok(b.disabled);resolveChoice({outcome:'dismissed'});await pending;assert.equal(b.disabled,false);assert.match(w.document.getElementById('installHint').textContent,/dibatalkan/);
 await b.onclick();assert.equal(calls,1);
 const retry=new w.Event('beforeinstallprompt',{cancelable:true});retry.prompt=async()=>{calls++;};retry.userChoice=Promise.resolve({outcome:'accepted'});w.dispatchEvent(retry);await b.onclick();assert.equal(calls,2);
 w.dispatchEvent(new w.Event('appinstalled'));assert.equal(w.document.getElementById('loginScene').classList.contains('hidden'),false);w.close();
});
test('unsupported, insecure, offline and failed prompts provide actionable guidance',async()=>{
 for(const [opts,pattern] of [[{ios:true},/Bagikan/],[{secure:false},/Pasang MadaniApp/],[{online:false},/internet/],[{},/menu browser/]]){const w=page(opts);await w.document.getElementById('installMainBtn').onclick();assert.match(w.document.getElementById('installHint').textContent,pattern);w.close();}
 const w=page(),ev=new w.Event('beforeinstallprompt');ev.prompt=async()=>{throw Error('unavailable');};w.dispatchEvent(ev);await w.document.getElementById('installMainBtn').onclick();assert.equal(w.document.getElementById('installMainBtn').disabled,false);assert.match(w.document.getElementById('installHint').textContent,/menu browser/);w.close();
});
