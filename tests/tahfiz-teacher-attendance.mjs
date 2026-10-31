import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const base=new URL('../',import.meta.url);

test('both teaching roles open daily attendance directly and save their own teaching target',async()=>{
 for(const role of ['guru_mapel','mentor_tahsin_tahfiz']){
  const win=new JSDOM('<main></main>',{url:'http://localhost/app/'}).window;
  win.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new win.Event('close'));};
  const records={},writes=[];
  let gpsFails=false;
  const repoNames=[...readFileSync(new URL('assets/js/repository.js',base),'utf8').matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
  const repo={getNode:async p=>p==='settings/teacherAttendance'?{locations:{test:{latitude:0,longitude:0,radiusMeter:100}}}:records,
   saveTeacherSession:async(path,data,options)=>{writes.push({path,data,options});records[data.scheduleId]=data;return data;}};
  const context=vm.createContext({console,document:win.document,window:win,sessionStorage:win.sessionStorage,localStorage:win.localStorage,Intl,Date,URL,setTimeout,clearTimeout});
  const repoMock=new vm.SyntheticModule(repoNames,function(){for(const n of repoNames)this.setExport(n,repo[n]||(()=>{throw Error(`Unexpected repository call: ${n}`);}));},{context});
  const gpsMock=new vm.SyntheticModule(['attendanceCoordinates'],function(){this.setExport('attendanceCoordinates',async()=>{if(gpsFails)throw Error('Lokasi ditolak');return {latitude:0,longitude:0,accuracy:10};});},{context});
  const cache=new Map();
  function load(url){
   if(url.endsWith('/repository.js'))return repoMock;
   if(url.endsWith('/geolocation.js'))return gpsMock;
   if(!cache.has(url))cache.set(url,new vm.SourceTextModule(readFileSync(fileURLToPath(url),'utf8'),{context,identifier:url}));
   return cache.get(url);
  }
  const routes=load(new URL('assets/js/teacher/routes.js',base).href);
  await routes.link((s,m)=>load(new URL(s,m.identifier).href));await routes.evaluate();
  const model=load(new URL('assets/js/teacher/model.js',base).href);
  const now=model.namespace.localClock();
  const ctx={root:win.document.querySelector('main'),navigate:()=>{},yearId:'year',session:{activeRole:role,user:{uid:'uid'},profile:{staffId:'staff'}},master:{
   classes:[{id:'class',name:'Kelas Uji',unitId:'unit'}],subjects:[{id:'subject',name:'Mapel Uji'}],students:[],
   groups:[{id:'group',name:'Halaqah Uji',mentorStaffId:'staff'},{id:'other',name:'Halaqah Lain',mentorStaffId:'other'}],
   academicSchedules:[{id:'formal',classId:'class',subjectId:'subject',staffId:'staff',academicYearId:'year',day:now.day,startTime:'00:00',endTime:'23:59'}],
   dailySchedules:[{id:'quran',quranAllGroups:true,academicYearId:'year',day:'Setiap Hari',startTime:'00:00',endTime:'23:59'}]
  }};
  const handler=routes.namespace.TEACHER_ROUTES['teacher-attendance'];
  assert.notEqual(handler,routes.namespace.TEACHER_ROUTES.schedule);
  await handler(ctx);
  const dialog=ctx.root.querySelector('dialog');assert.ok(dialog,role);
  assert.equal(dialog.querySelectorAll('[data-attend]').length,1,role);
  const button=dialog.querySelector('[data-attend]');assert.equal(button.textContent,'Absen');assert.equal(button.disabled,false);
  gpsFails=true;await button.onclick();assert.equal(writes.length,0);assert.equal(button.disabled,false);
  assert.match(dialog.textContent,/Lokasi ditolak/);
  gpsFails=false;await button.onclick();assert.equal(writes.length,1);
  const {path,data,options}=writes[0];
  assert.ok(path.startsWith(`academic/teaching_attendance/year/staff/${now.date}/`));
  assert.equal(data.teacherUid,'uid');assert.equal(options.createOnly,true);assert.equal(options.actorUid,'uid');
  assert.equal(role==='guru_mapel'?data.classId:data.groupId,role==='guru_mapel'?'class':'group');
  await handler(ctx);assert.equal(ctx.root.querySelectorAll('[data-attend]').length,0);
  assert.match(ctx.root.textContent,/Sudah Absen/);
  win.close();
 }
});
