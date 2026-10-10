import test from 'node:test';
import assert from 'node:assert/strict';
import {NAQIB_SLOTS} from '../assets/js/naqib-program-model.js';
import {dutyWindow,assertDutyProgram} from '../assets/js/naqib-duty.js';
test('every approved program is assigned to exactly one latest shift; Isya belongs to Rokyal shift III',()=>{
 const expected={makan_pagi:1,makan_siang:2,makan_malam:3,pengecekan_tidur:3,tahajjud:1,subuh:1,apel_pagi:1,senam:1,apel_transisi:1,zuhur:2,ashar:2,magrib:3,isya:3};
 for(const [kind,,startTime,endTime,day]of NAQIB_SLOTS){const date=day==='Senin'?'2026-10-12':'2026-10-10',now=Date.parse(`${date}T${startTime}:00+08:00`);const owners=[];
 for(let n=1;n<=3;n++){const config={staff:{rokyal:{gender:'P',shiftId:'shift'+n,startMinute:(n-1)*480,endMinute:n*480}}};try{assertDutyProgram({config,staffId:'rokyal',schedule:{id:kind,academicYearId:'year',startTime,endTime,day,genderScope:'mixed'},date,yearId:'year',now});owners.push(n);}catch{}}
 assert.deepEqual(owners,[expected[kind]],kind);
 }
 assert.deepEqual(NAQIB_SLOTS.find(s=>s[0]==='isya').slice(2,4),['20:00','20:30']);
});

test('canonical import retires duplicate entry points without deleting timetables, attendance or changing access',async()=>{
 const {naqibProgramPatch}=await import('../assets/js/naqib-program-model.js');
 const patch=naqibProgramPatch('year',{old:{academicYearId:'year',programId:'old',startTime:'18:00'},clean:{academicYearId:'year',programId:'clean',naqibProgramKind:'kebersihan'}},{old:{name:'Sholat magrib'}});
 assert.equal(patch['schedules/daily/old/naqibAttendance'],false);assert.equal(patch['schedules/daily/clean/naqibAttendance'],false);
 assert.equal(Object.keys(patch).filter(k=>k.startsWith('programs/')).length,13);
 assert.ok(Object.keys(patch).every(k=>!k.startsWith('boarding/')&&!k.startsWith('users/')&&!k.startsWith('finance/')&&!k.startsWith('settings/naqibDuty/staff')));
 assert.equal(patch['schedules/daily/DS-NAQIB-year-isya'].participantScope,'all_boarding');
 assert.deepEqual(patch['schedules/daily/DS-NAQIB-year-apel_transisi'].targetUnitIds,['UNIT-SMP','UNIT-SMK']);
});
