import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const seed=JSON.parse(fs.readFileSync('seed/master-data.json')),pack=JSON.parse(fs.readFileSync('seed/imports/daily-2026-update.json'));
const mod=new vm.SourceTextModule(fs.readFileSync('assets/js/daily-schedules.js','utf8'));await mod.link(()=>{});await mod.evaluate();const {dailyForStudent,programStudents,dailyForStaff}=mod.namespace;
const rows=Object.values(seed.schedules.daily).filter(s=>s.importId===pack.id);
test('both source schedules cover exactly 24 hours including overnight sleep',()=>{
 for(const [scope,count]of [['boarding_general',14],['boarding_gema',17]]){
  const a=rows.filter(s=>s.participantScope===scope).sort((a,b)=>a.order-b.order);assert.equal(a.length,count);
  const minutes=t=>t.split(':').reduce((h,m)=>Number(h)*60+Number(m));
  assert.equal(a.reduce((n,s)=>n+(minutes(s.endTime)-minutes(s.startTime)+1440)%1440,0),1440);
  a.forEach((s,i)=>assert.equal(s.endTime,a[(i+1)%a.length].startTime));assert.equal(a.at(-1).endsNextDay,true);
 }
 assert.equal(Object.values(seed.schedules.daily).filter(s=>s.supersededBy===pack.id).length,50);
 assert.ok(Object.keys(pack.changes).every(p=>p.startsWith('programs/')||p.startsWith('schedules/daily/')));
});
test('GEMA and general rosters are disjoint, use existing IDs, exclude unassigned rooms and nonboarding',()=>{
 const students=[{id:'g',gender:'L'},{id:'p',gender:'P'},{id:'u',gender:'L'},{id:'day',gender:'P'},{id:'unknown',boardingStatus:'boarding'}];
 const master={students,roomAssignments:{g:{roomId:'ROOM-PTR-GEMA'},p:{roomId:'ROOM-PTRI-GEMA'},u:{roomId:'ROOM-PTR-C1'}},dailySchedules:rows};
 const gema=rows.find(s=>s.participantScope==='boarding_gema'),general=rows.find(s=>s.participantScope==='boarding_general');
 assert.deepEqual([...programStudents(gema.programId,master)].map(s=>s.id),['g','p']);
 assert.deepEqual([...programStudents(general.programId,master)].map(s=>s.id),['u']);
 assert.equal(dailyForStudent({...gema,status:'inactive'},students[0],master),false);
 assert.equal(dailyForStaff(gema,{scopeGender:'P'},gema.academicYearId),true);
 assert.equal(dailyForStaff(gema,{},'different-year'),false);
});
test('legacy TK audience stays separate from boarding and class/group scopes are honored',()=>{
 const s={id:'s',unitId:'UNIT-TK',gender:'P'},master={classAssignments:{s:{classId:'c'}},groupAssignments:{g:{s:true}}};
 assert.equal(dailyForStudent({audience:'TK IT Al-Madani',genderScope:'mixed'},s,master),true);
 assert.equal(dailyForStaff({audience:'TK IT Al-Madani'},{},''),false);
 assert.equal(dailyForStudent({participantScope:'class',targetId:'other'},s,master),false);
 assert.equal(dailyForStudent({participantScope:'group',targetId:'g'},s,master),true);
});
