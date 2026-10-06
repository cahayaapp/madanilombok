import {getNode} from './repository.js';
import {dutyWindow,assertDutyProgram,dutyProgramDate} from './naqib-duty.js';
export async function loadDuty(ctx){
 const config=await getNode('settings/naqibDuty'),staffId=ctx.session.profile.staffId,now=Date.now();
 const duty=dutyWindow(config,staffId,now);
 if(!duty.activeNow)throw Error(`Di luar jam piket Anda: ${duty.label}, ${duty.time} WITA.`);
 const schedules=(ctx.master.dailySchedules||[]).filter(s=>{try{assertDutyProgram({config,staffId,schedule:s,date:dutyProgramDate(s,duty),yearId:ctx.yearId,now});return true;}catch{return false;}});
 return {config,staffId,duty,schedules};
}
export async function checkDutyWrite(ctx,programId,date){
 // Re-read assignment and schedule when saving, so an open form cannot extend a shift.
 const config=await getNode('settings/naqibDuty'),staffId=ctx.session.profile.staffId;
 const schedules=await getNode('schedules/daily')||{};
 for(const [id,s]of Object.entries(schedules))if(s.programId===programId){try{return assertDutyProgram({config,staffId,schedule:{id,...s},date,yearId:ctx.yearId});}catch{}}
 throw Error('Presensi/laporan ditolak: program, tanggal, atau waktu tidak sesuai piket aktif Anda. Muat ulang jadwal piket.');
}
