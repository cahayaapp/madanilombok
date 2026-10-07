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
 assert.equal(rules.boarding['.write'],undefined);
});
test('roster update preserves unrelated roles and retires duplicate Naqib-only access',async()=>{
 const vm=await import('node:vm');const ctx=vm.createContext({});
 const repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',()=>{});this.setExport('bulkPatchRoot',()=>{});},{context:ctx});
 const model=new vm.SyntheticModule(['minutes'],function(){this.setExport('minutes',v=>{const [h,m]=v.split(':').map(Number);return h*60+m;});},{context:ctx});
 const policy=new vm.SourceTextModule(fs.readFileSync(new URL('../assets/js/naqib-program-policy.js',import.meta.url),'utf8'),{context:ctx});
 const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../assets/js/naqib-duty-update.js',import.meta.url),'utf8'),{context:ctx});await mod.link(s=>s.includes('repository')?repo:s.includes('naqib-program-policy')?policy:model);await mod.evaluate();
 const pkg=JSON.parse(fs.readFileSync(new URL('../seed/imports/naqib-duty.json',import.meta.url)));
 const staff=Object.fromEntries(Object.entries(pkg.staff).filter(([id])=>id!=='AMD-SDM-0088').map(([id,a])=>[id,{name:a.name,appRoles:['guru_mapel']}]));staff.old={appRoles:['naqib','guru_mapel']};
 const patch=mod.namespace.dutyUpdatePatch(pkg,staff,{old:{staffId:'old',role:'naqib',roles:['naqib','guru_mapel']},pilot:{staffId:'old',role:'naqib'}},{allowed:{programId:'prayer',startTime:'12:00',day:'Setiap Hari',academicYearId:'y'},excluded:{programId:'arabic',startTime:'05:40',day:'Setiap Hari',academicYearId:'y'}},{prayer:{name:'Sholat zuhur'},arabic:{name:'Bahasa Arab'}});
 assert.deepEqual(Object.keys(patch['settings/naqibDuty'].programs),['allowed']);
 assert.equal(patch['users/old/role'],'guru_mapel');assert.equal(patch['users/pilot/active'],false);assert.equal(patch['users/old/roleFlags/naqib'],false);assert.equal(patch['staff/AMD-SDM-0088'].name,'Fitriani');assert.ok(!Object.keys(patch).some(k=>k.startsWith('finance/')));
});
