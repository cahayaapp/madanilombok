import {naqibProgramKind} from './naqib-program-policy.js';
export const NAQIB_SLOTS=[
 ['tahajjud','Sholat Tahajjud','04:00','05:00','Setiap Hari'],
 ['subuh',"Shalat Subuh Berjama’ah",'05:00','05:40','Setiap Hari'],
 ['makan_pagi','Makan Pagi','06:10','07:00','Setiap Hari'],
 ['apel_pagi','Apel Pagi','07:00','07:50','Senin'],
 ['senam','Senam','07:00','07:50','Sabtu'],
 ['apel_transisi','Baris Transisi','07:50','08:00','Setiap Hari'],
 ['zuhur','Sholat Zuhur Berjama’ah','12:00','14:00','Setiap Hari'],
 ['makan_siang','Makan Siang','12:00','14:00','Setiap Hari'],
 ['ashar','Shalat Ashar Berjama’ah','15:30','16:30','Setiap Hari'],
 ['magrib','Shalat Maghrib Berjama’ah','18:00','20:00','Setiap Hari'],
 ['isya','Shalat Isya Berjama’ah','20:00','20:30','Setiap Hari'],
 ['makan_malam','Makan Malam','20:30','21:00','Setiap Hari'],
 ['pengecekan_tidur','Pengecekan Tidur','22:00','24:00','Setiap Hari']
];
export function naqibProgramPatch(yearId,schedules,programs){
 if(!yearId)throw Error('Tahun aktif belum tersedia.');
 const patch={};
 // Retain timetable and historical attendance; only retire duplicate Naqib entry points.
 for(const [id,s]of Object.entries(schedules||{}))if(s.academicYearId===yearId&&(naqibProgramKind(s,programs?.[s.programId])||s.naqibProgramKind==='kebersihan')&&(!id.startsWith('DS-NAQIB-')||s.naqibProgramKind==='kebersihan')){patch[`schedules/daily/${id}/naqibAttendance`]=false;patch[`settings/naqibDuty/programs/${id}`]=null;}
 for(const [kind,name,startTime,endTime,day]of NAQIB_SLOTS){
 const suffix=yearId+'-'+kind,id='DS-NAQIB-'+suffix,programId='PRG-NAQIB-'+suffix,startMinute=Number(startTime.slice(0,2))*60+Number(startTime.slice(3));
 patch['programs/'+programId]={name,status:'active',category:'Program Asrama',defaultPic:'Naqib',source:'naqib-program-20261010'};
 patch['schedules/daily/'+id]={programId,academicYearId:yearId,day,startTime,endTime,genderScope:'mixed',participantScope:kind==='apel_transisi'?'units':'all_boarding',...(kind==='apel_transisi'?{targetUnitIds:['UNIT-SMP','UNIT-SMK']}:{}),status:'active',naqibAttendance:true,naqibProgramKind:kind,source:'naqib-program-20261010'};
 patch['settings/naqibDuty/programs/'+id]={programId,academicYearId:yearId,day,startTime,startMinute,shiftId:startMinute<480?'shift1':startMinute<960?'shift2':'shift3'};
 }
 return patch;
}
