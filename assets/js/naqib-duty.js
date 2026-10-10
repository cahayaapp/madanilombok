import {localClock,minutes} from './teacher/model.js';
export const DUTY_SHIFTS={shift1:{label:'Shift 1',start:240,end:720,time:'04.00–12.00'},shift2:{label:'Shift 2',start:720,end:1200,time:'12.00–20.00'},shift3:{label:'Shift 3',start:1200,end:1680,time:'20.00–04.00'}};
export function dutyWindow(config,staffId,now=Date.now()){
 const assignment=config?.staff?.[staffId],legacy=DUTY_SHIFTS[assignment?.shiftId],shift=assignment?.startMinute!=null?{label:legacy?.label,start:assignment.startMinute,end:assignment.endMinute,time:[assignment.startMinute,assignment.endMinute].map(m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}.${String(m%60).padStart(2,'0')}`).join('–')}:legacy;
 if(!assignment||assignment.active===false||!shift||!['L','P'].includes(assignment.gender))throw Error('Jadwal piket Anda belum ditetapkan. Hubungi administrator.');
 const dayStart=Math.floor((now+28800000)/86400000)*86400000-28800000;
 let start=dayStart+shift.start*60000,end=dayStart+shift.end*60000;
 if(shift.end>1440&&now<dayStart+(shift.end%1440)*60000){start-=86400000;end-=86400000;}
 return {...assignment,...shift,startAt:start,endAt:end,activeNow:now>=start&&now<end};
}
export function dutyProgramDate(schedule,window){return new Date(window.startAt+(minutes(schedule.startTime)<window.start?86400000:0)+28800000).toISOString().slice(0,10);}
export function assertDutyProgram({config,staffId,schedule,date,yearId,now=Date.now()}){
 const duty=dutyWindow(config,staffId,now);
 if(!duty.activeNow)throw Error(`Di luar jam piket Anda (${duty.time} WITA).`);
 if(!schedule||schedule.status==='inactive'||schedule.academicYearId!==yearId||!['mixed',duty.gender,undefined,''].includes(schedule.genderScope))throw Error('Program tidak termasuk jadwal asrama Anda.');
 const start=minutes(schedule.startTime),end=duty.end%1440;
 const belongs=duty.end>1440?(start>=duty.start||start<end):start>=duty.start&&start<end;
 if(!belongs)throw Error('Program ini di luar shift piket Anda.');
 if(date!==dutyProgramDate(schedule,duty))throw Error('Tanggal program tidak sesuai shift piket yang sedang berjalan.');
 const programAt=Date.parse(`${date}T00:00:00+08:00`)+start*60000;
 const day=localClock(new Date(programAt)).day;
 if(schedule.day!=='Setiap Hari'&&(schedule.day==='Ahad'?'Minggu':schedule.day)!==day)throw Error('Program tidak dijadwalkan pada hari ini.');
 if(programAt>now)throw Error('Program belum dimulai.');
 return {dutyShiftId:duty.shiftId,dutyStartAt:duty.startAt,dutyEndAt:duty.endAt,genderScope:duty.gender,staffId,dailyScheduleId:schedule.id,programStartAt:programAt};
}
