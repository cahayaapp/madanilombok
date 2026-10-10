import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {dutyWindow,dutyProgramDate,assertDutyProgram} from '../assets/js/naqib-duty.js';
const cfg={staff:{a:{shiftId:'shift1',gender:'L'},b:{shiftId:'shift2',gender:'P'},c:{shiftId:'shift3',gender:'L'}}};
const at=t=>Date.parse('2026-10-06T'+t+':00+08:00');
test('only one shift owns each exact boundary, including midnight',()=>{
 for(const [time,id]of [['03:59','c'],['04:00','a'],['11:59','a'],['12:00','b'],['19:59','b'],['20:00','c'],['00:00','c']])for(const staff of ['a','b','c'])assert.equal(dutyWindow(cfg,staff,at(time)).activeNow,id===staff);
});
test('night program retains previous date after midnight; rejects wrong date, future and wrong gender',()=>{
 const schedule={id:'n',programId:'p',academicYearId:'y',startTime:'21:00',day:'Setiap Hari',genderScope:'L'};const now=at('01:00'),w=dutyWindow(cfg,'c',now);assert.equal(dutyProgramDate(schedule,w),'2026-10-05');
 const args={config:cfg,staffId:'c',schedule,date:'2026-10-05',yearId:'y',now};assert.ok(assertDutyProgram(args));
 assert.throws(()=>assertDutyProgram({...args,date:'2026-10-06'}));assert.throws(()=>assertDutyProgram({...args,schedule:{...schedule,genderScope:'P'}}));assert.throws(()=>assertDutyProgram({...args,schedule:{...schedule,startTime:'03:00'},date:'2026-10-06'}));assert.throws(()=>assertDutyProgram({...args,now:at('04:00')}));
});
test('approved roster has exactly one male and two females per shift',()=>{
 const pkg=JSON.parse(fs.readFileSync(new URL('../seed/imports/naqib-duty.json',import.meta.url)));for(const shiftId of ['shift1','shift2','shift3'])for(const [gender,count]of [['L',1],['P',2]])assert.equal(Object.values(pkg.staff).filter(s=>s.shiftId===shiftId&&s.gender===gender).length,count);
});
const rules=JSON.parse(fs.readFileSync(new URL('../database.rules.json',import.meta.url))).rules.madani_app;
const snap=v=>({val:()=>v??null,exists:()=>v!=null,child:p=>snap(p.split('/').reduce((a,k)=>a?.[k],v))});
test('server expressions reject forged shift, outside duty time and cross-gender attendance',()=>{
 const now=at('09:00'),schedule={id:'s',programId:'p',academicYearId:'y',startTime:'08:00',day:'Setiap Hari',genderScope:'mixed',status:'active'};
 const record={...assertDutyProgram({config:cfg,staffId:'a',schedule,date:'2026-10-06',yearId:'y',now}),date:'2026-10-06',programId:'p',studentId:'student',recordedBy:'u',status:'Hadir'};
 const data={madani_app:{users:{u:{staffId:'a',role:'naqib',active:true}},settings:{naqibDuty:{staff:{a:{...cfg.staff.a,active:true}},programs:{s:{shiftId:'shift1',startTime:'08:00',startMinute:480}}}},schedules:{daily:{s:schedule}},students:{student:{gender:'L'}}}};
 const expr=rules.boarding.program_attendance.$year.$date.$program.$student['.write'];
 const run=(r,t=now)=>Function('auth','root','data','newData','now','$year','$date','$program','$student',`return ${expr}`)({uid:'u'},snap(data),snap(null),snap(r),t,'y','2026-10-06','p','student');
 assert.equal(run(record),true);assert.equal(run(record,at('12:00')),false);assert.equal(run({...record,dutyShiftId:'shift2'}),false);assert.equal(run({...record,genderScope:'P'}),false);assert.equal(run(null),false);
 const report=rules.boarding.program_reports.$year.$report['.write'];const rr=(t)=>Function('auth','root','newData','now','$year',`return ${report}`)({uid:'u'},snap(data),snap({...record,naqibUid:'u'}),t,'y');assert.equal(rr(now),true);assert.equal(rr(at('12:00')),false);
 // New configuration overrides the old global shift times on the server as well.
 data.madani_app.settings.naqibDuty.staff.a={shiftId:'shift3',gender:'L',active:true,startMinute:1020,endMinute:1500};
 data.madani_app.schedules.daily.s.startTime='23:00';data.madani_app.settings.naqibDuty.programs.s={shiftId:'shift1',startTime:'23:00',startMinute:1380};
 const updated={...record,...assertDutyProgram({config:{staff:{a:data.madani_app.settings.naqibDuty.staff.a}},staffId:'a',schedule:{...schedule,startTime:'23:00'},date:'2026-10-05',yearId:'y',now:at('00:30')})};
 assert.equal(run(updated,at('00:30')),true);assert.equal(run(updated,at('01:00')),false);
 assert.equal(rules.boarding['.write'],undefined);
});
test('roster update preserves unrelated roles and retires duplicate Naqib-only access',async()=>{
 const vm=await import('node:vm');const ctx=vm.createContext({});
 const repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',()=>{});this.setExport('bulkPatchRoot',()=>{});},{context:ctx});
 const model=new vm.SyntheticModule(['minutes'],function(){this.setExport('minutes',v=>{const [h,m]=v.split(':').map(Number);return h*60+m;});},{context:ctx});
 const policy=new vm.SourceTextModule(fs.readFileSync(new URL('../assets/js/naqib-program-policy.js',import.meta.url),'utf8'),{context:ctx});
 const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../assets/js/naqib-duty-update.js',import.meta.url),'utf8'),{context:ctx});await mod.link(s=>s.includes('repository')?repo:s.includes('naqib-program-policy')?policy:model);await mod.evaluate();
 const pkg=JSON.parse(fs.readFileSync(new URL('../seed/imports/naqib-duty.json',import.meta.url)));
 const staff=Object.fromEntries(Object.entries(pkg.staff).filter(([id])=>id!=='AMD-SDM-WANDA').map(([id,a])=>[id,{name:a.name,appRoles:['guru_mapel']}]));staff.old={appRoles:['naqib','guru_mapel']};
 const patch=mod.namespace.dutyUpdatePatch(pkg,staff,{old:{staffId:'old',role:'naqib',roles:['naqib','guru_mapel']},pilot:{staffId:'old',role:'naqib'}},{allowed:{programId:'prayer',startTime:'12:00',day:'Setiap Hari',academicYearId:'y'},excluded:{programId:'arabic',startTime:'05:40',day:'Setiap Hari',academicYearId:'y'}},{prayer:{name:'Sholat zuhur'},arabic:{name:'Bahasa Arab'}});
 assert.deepEqual(Object.keys(patch['settings/naqibDuty'].programs),['allowed']);
 assert.equal(patch['users/old/role'],'guru_mapel');assert.equal(patch['users/pilot/active'],false);assert.equal(patch['users/old/roleFlags/naqib'],false);assert.equal(patch['staff/AMD-SDM-WANDA'].name,'Wanda Saputri');assert.ok(!Object.keys(patch).some(k=>k.startsWith('finance/')));
});


test('new male and female shifts cover every minute exactly once with correct midnight dates',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../seed/imports/naqib-duty.json',import.meta.url)));
 for(const gender of ['L','P'])for(let m=0;m<1440;m++){
  const now=at('00:00')+m*60000,active=Object.keys(config.staff).filter(id=>config.staff[id].gender===gender&&dutyWindow(config,id,now).activeNow);
  assert.equal(active.length,gender==='L'?1:2,`${gender} ${m}`);
 }
 for(const [id,time,program,date] of [['AMD-SDM-0084','23:59','23:00','2026-10-06'],['AMD-SDM-FITRAH','16:00','16:00','2026-10-06'],['AMD-SDM-0016','00:00','00:00','2026-10-06']]){
  const schedule={id:'s',academicYearId:'y',day:'Setiap Hari',startTime:program,genderScope:config.staff[id].gender};
  assert.ok(assertDutyProgram({config,staffId:id,schedule,date,yearId:'y',now:at(time)}));
 }
});


test('latest shifts own 00:00, 08:00, 16:00 boundaries and close at midnight',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../seed/imports/naqib-duty.json',import.meta.url)));
 for(const [time,shiftId] of [['00:00','shift1'],['07:59','shift1'],['08:00','shift2'],['15:59','shift2'],['16:00','shift3'],['23:59','shift3']]){
  for(const [id,a] of Object.entries(config.staff)){
   assert.equal(dutyWindow(config,id,at(time)).activeNow,a.shiftId===shiftId);
   const args={config,staffId:id,schedule:{id:'s',academicYearId:'y',startTime:time,day:'Setiap Hari',genderScope:a.gender},date:'2026-10-06',yearId:'y',now:at(time)};
   if(a.shiftId===shiftId)assert.ok(assertDutyProgram(args));else assert.throws(()=>assertDutyProgram(args));
  }
 }
 assert.equal(dutyWindow(config,'AMD-SDM-0084',at('23:59')).time,'16.00–24.00');
});
