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
test('TV viewer renders named pages safely, rotates scenes and discards yesterday on midnight rollover',async()=>{
 const env=await environment('live/index.html','https://app.almadanilombok.com/live/?scene=1');let requests=0;
 const data=feed();data.quran.rows[0].name='Santri <img onerror="bad()">';
 env.w.fetch=async(url,options)=>{requests++;assert(url.includes('/madani_live/current.json'));assert.equal(options.credentials,'omit');return {ok:true,json:async()=>data};};
 await env.run('assets/js/live.js');const d=env.w.document;
 assert.match(d.querySelector('#sceneContent').textContent,/Tumbuh bersama/);assert.equal(d.querySelectorAll('.status-card').length,2);assert(d.querySelectorAll('.person-row').length<=8);assert.equal(d.querySelectorAll('img[onerror]').length,0);assert.match(d.querySelector('#clock').textContent,/09:00/);
 d.querySelector('[data-scene="3"]').click();await settle();assert.match(d.querySelector('#sceneContent h1').textContent,/Setiap santri/);assert.equal(d.querySelectorAll('.status-card').length,4);
 assert(d.querySelector('.person-row').textContent.includes('Santri Contoh'));
 d.querySelector('#nextScene').click();await settle();assert.match(d.querySelector('#sceneContent h1').textContent,/Hafalan tumbuh/,'quotes must advance after the last scene wraps to inspiration');d.querySelector('[data-scene="3"]').click();await settle();
 env.advance(Date.parse('2026-11-12T16:01:00Z'));env.intervals[0]();await settle();assert(!d.querySelector('#sceneContent').textContent.includes('Santri Contoh'));assert.match(d.querySelector('#sceneContent').textContent,/Menunggu/);assert(requests>=2);env.dom.window.close();
});
test('public permission denial clears old named data instead of silently retaining it',async()=>{
 const env=await environment('live/index.html','https://app.almadanilombok.com/live/?scene=1');let allowed=true;
 env.w.fetch=async()=>allowed?{ok:true,json:async()=>feed()}:{ok:false,status:403};await env.run('assets/js/live.js');assert(env.w.document.querySelector('.person-row'));allowed=false;env.intervals[1]();await settle();assert.equal(env.w.document.querySelectorAll('.person-row').length,0);env.dom.window.close();
});
test('studio stays read-only until explicit name consent and start, publishes only the public projection and can stop',async()=>{
 const writes=[],updates=[],errors={},vals={
 'students':{s:{name:'Contoh Santri',status:'active',nisn:'PRIVATE'}},'staff':{t:{name:'Contoh Guru',status:'active'}},'users':{u:{name:'Contoh Guru',staffId:'t',role:'guru_mapel',roles:['guru_mapel']}},'classes':{c:{name:'Kelas Contoh'}},'groups':{g:{name:'Tahfiz',type:'Tahfiz',status:'active'}},'assignments/classes/Y':{s:{classId:'c'}},'assignments/groups/Y':{g:{s:true}}
 };
 const sdk='https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
 const overrides={
 [new URL('assets/js/auth.js',base).href]:{requireAdmin:async()=>({roles:['super_admin'],user:{uid:'admin'}})},
 [new URL('assets/js/repository.js',base).href]:{getNode:async path=>vals[path]||{},getCurrentAcademicYearId:async()=>'Y'},
 [new URL('assets/js/firebase.js',base).href]:{db:{}},
 [new URL('assets/js/teacher/model.js',base).href]:{calendarBreaks:()=>[],teacherSchedules:()=>[{day:'Kamis',startTime:'08:00',assignmentConfirmed:true,academicYearId:'Y'}]},
 [sdk]:{ref:(_,path)=>path,get:async()=>({val:()=>0}),onValue:(path,callback,error)=>{errors[path]=error;callback({val:()=>({})});return ()=>{};},set:async(path,value)=>writes.push({path,value}),update:async(path,value)=>updates.push({path,value})}
 };
 const env=await environment('admin/live.html','https://app.almadanilombok.com/admin/live.html',overrides);await env.run('assets/js/live-publisher.js');const d=env.w.document;
 assert.equal(writes.length,0);assert(d.querySelector('#startBroadcast').disabled);assert.match(d.querySelector('#studioStatus').textContent,/Pratinjau siap/);
 d.querySelector('#publishNames').checked=true;d.querySelector('#publishNames').dispatchEvent(new env.w.Event('change'));assert(!d.querySelector('#startBroadcast').disabled);
 d.querySelector('#startBroadcast').click();await settle();assert.equal(writes.length,1);assert.equal(writes[0].path,'madani_live/current');assert(!JSON.stringify(writes[0].value).includes('PRIVATE'));assert.match(d.querySelector('#studioStatus').textContent,/Siaran aktif/);
 errors['madani_app/academic/quran_records/Y'](new Error('source unavailable'));env.intervals[1]();await settle();assert.equal(writes.length,1,'incomplete source data must never overwrite a complete broadcast');
 d.querySelector('#stopBroadcast').click();await settle();assert.deepEqual(JSON.parse(JSON.stringify(updates[0])),{path:'madani_live/current',value:{enabled:false}});assert.match(d.querySelector('#studioStatus').textContent,/dihentikan/);env.dom.window.close();
});
