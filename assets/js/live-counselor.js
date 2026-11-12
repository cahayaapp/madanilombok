// Read-only projection of today's existing counselor inbox, never case writes.
import {attendanceReferrals,attendanceCase,unrepresentedAttendance} from './attendance-referrals.js';
import {routeCounselorCase} from './counselor-model.js';
import {isSdStudent} from './school-case-routing.js';
import {campusClock} from './live-prayer.js';
import {liveRow} from './live-model.js';

export function buildLiveCounselor(master,sources,now=new Date()){
 const date=campusClock(now).date,start=new Date(Date.parse(date+'T12:00:00Z')-2*86400000).toISOString().slice(0,10);
 const students=new Map((master.students||[]).filter(s=>s.active!==false&&(!s.status||s.status==='active')&&!s.mergedInto&&!s.deletedAt&&!isSdStudent(master,s.id)).map(s=>[s.id,s]));
 const cases=Object.entries(sources.cases||{}).filter(([,c])=>c&&students.has(c.studentId)&&!c.deletedAt&&c.handlingRole!=='wali_kelas').map(([id,c])=>({...c,id}));
 const boarding=sources.counselorBoarding||{[date]:sources.boarding||{}};
 const candidates=['L','P'].flatMap(gender=>attendanceReferrals({master,gender,boarding,learning:sources.learning||{},from:start,to:date})).map(attendanceCase);
 // A saved source remains authoritative even when closed or found unproven.
 const history=[...cases,...unrepresentedAttendance(candidates,cases)],calls=new Map();
 for(const c of history){
  if(c.date!==date||!students.has(c.studentId)||c.deletedAt||c.higherEscalation||c.tabayyun?.conclusion==='TIDAK TERBUKTI'||!['menunggu_konselor','ditangani','tabayyun','konseling','eskalasi_diperlukan','dieskalasi'].includes(c.status))continue;
  const level=routeCounselorCase(c,history).level==='MADYA'?'madya':'pemula';
  if(!calls.has(c.studentId)||level==='madya')calls.set(c.studentId,level);
 }
 const classes=new Map((master.classes||[]).map(c=>[c.id,c]));
 const rows=[...calls].map(([id,status])=>liveRow(students.get(id),classes.get(master.classAssignments?.[id]?.classId)?.name||'',status)).sort((a,b)=>a.name.localeCompare(b.name,'id'));
 return {total:rows.length,rows};
}
