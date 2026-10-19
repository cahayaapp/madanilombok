import {isSdStudent} from './school-case-routing.js';
export function attendanceReferrals({master,gender,boarding={},learning={},from,to}){
 if(!['L','P'].includes(gender))return [];
 const allowed=new Map((master.students||[]).filter(s=>s.gender===gender&&!s.mergedInto&&s.status!=='inactive'&&!isSdStudent(master,s.id)).map(s=>[s.id,s]));
 const out=[];
 const add=(path,date,id,r,context,stage)=>{
  if(!allowed.has(id)||date<from||date>to||r.attendanceManagedBy==='GEMA'||stage!=='FINAL'||!['Alfa','Terlambat'].includes(r.status))return;
  const sourceId='att-'+Array.from(path).map(c=>c.charCodeAt(0).toString(16)).join('-');
  out.push({id:sourceId,studentId:id,date,status:r.status,context,sourcePath:path,note:r.note||'',sourceId});
 };
 for(const [date,programs]of Object.entries(boarding||{}))for(const [program,rows]of Object.entries(programs||{}))for(const [id,r]of Object.entries(rows||{}))add('boarding/'+date+'/'+program+'/'+id,date,id,r,(master.programs||[]).find(p=>p.id===program)?.name||program,r.stage);
 for(const [staff,dates]of Object.entries(learning||{}))for(const [date,sessions]of Object.entries(dates||{}))for(const [session,r]of Object.entries(sessions||{}))for(const [id,student]of Object.entries(r.students||{}))add('learning/'+staff+'/'+date+'/'+session+'/'+id,date,id,student,(master.subjects||[]).find(s=>s.id===r.subjectId)?.name||'Pembelajaran',r.stage);
 return out.sort((a,b)=>b.date.localeCompare(a.date));
}
