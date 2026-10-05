import fs from 'node:fs';
import assert from 'node:assert/strict';
const masterPath='seed/master-data.json',d=JSON.parse(fs.readFileSync(masterPath)),source=JSON.parse(fs.readFileSync('seed/imports/smp-2026-2027-source.json'));
const year='TA-2026-2027-GANJIL',scheduleFile='JADWAL SMP GANJIL 2026-2027 TERBARU.xlsx',mentorFile='GURU WALI SMP 2026-2027.xlsx',sheet='SMT GANJIL';
const rows=file=>source[file][sheet].rows;
const norm=s=>String(s||'').split(',')[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const issues=[],changes={},teachers={},subjects={},mentors={},homerooms={},schedules={};
const confirmations=JSON.parse(fs.readFileSync('seed/imports/smp-identity-confirmations.json'));
for(const [id,r] of Object.entries(confirmations.newStudents||{})){
 assert(!d.students[id]||norm(d.students[id].name)===norm(r.name),`Student ID conflict ${id}`);
 assert(!Object.entries(d.students).some(([key,s])=>key!==id&&norm(s.name)===norm(r.name)),`Student already exists ${r.name}`);
 d.students[id]={...r,...d.students[id]};changes[`students/${id}`]=d.students[id];
}
for(const [id,r] of Object.entries(confirmations.newStaff)){
 assert(!d.staff[id]||norm(d.staff[id].name)===norm(r.name),`Staff ID conflict ${id}`);
 d.staff[id]={...r,...d.staff[id]};changes[`staff/${id}`]=d.staff[id];
}
const provenance=(file,cell)=>({source:file,sourceSheet:sheet,sourceCell:cell,seeded:true});
function staff(name){
 const confirmed=Object.entries(confirmations.staffAliases).find(([alias])=>norm(alias)===norm(name));
 if(confirmed){assert(d.staff[confirmed[1]]);return confirmed[1];}
 let matches=Object.entries(d.staff).filter(([,r])=>norm(r.name)===norm(name));
 if(matches.length>1){const smp=matches.filter(([,r])=>r.unitIds?.includes('UNIT-SMP'));if(smp.length===1)matches=smp;}
 return matches.length===1?matches[0][0]:null;
}
for(const {row,cells:c} of rows(scheduleFile)){
 const teacher=String(c.J||'').match(/^(\d+)\.?$/),subject=String(c.J||'').match(/^([A-T])\.?$/);
 if(teacher&&c.K){const id=staff(c.K);teachers[teacher[1]]={name:c.K,staffId:id,...provenance(scheduleFile,`K${row}`)};if(!id)issues.push({type:'staff_identity',code:teacher[1],name:c.K,cell:`K${row}`});}
 if(subject&&c.K){const id=`MPL-SMP-${subject[1]}`;subjects[subject[1]]=id;changes[`subjects/${id}`]={name:c.K.trim(),code:subject[1],unitId:'UNIT-SMP',unitIds:['UNIT-SMP'],status:'active',...provenance(scheduleFile,`K${row}`)};}
}
const columns={D:'7-PUTRI',E:'7-PUTRA',F:'8-PUTRI',G:'8-PUTRA',H:'9-PUTRI',I:'9-PUTRA'};
let day='';
for(const {row,cells:c} of rows(scheduleFile)){
 if(['SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'].includes(c.A))day=c.A[0]+c.A.slice(1).toLowerCase();
 const time=String(c.C||'').match(/^(\d\d)[.:](\d\d)-(\d\d)[.:](\d\d)$/);if(!time)continue;
 for(const [col,suffix] of Object.entries(columns)){
  const code=String(c[col]||'').match(/^([A-T])\.(\d+)$/);if(!code)continue;
  assert(subjects[code[1]]&&teachers[code[2]],`Unknown code ${c[col]}`);
  const teacher=teachers[code[2]],id=`JSMP-2627G-${day.toUpperCase()}-${suffix}-${c.B}`;
  schedules[id]={academicYearId:year,semester:'1',unitId:'UNIT-SMP',classId:`CLS-SMP-${suffix}`,day,startTime:`${time[1]}:${time[2]}`,endTime:`${time[3]}:${time[4]}`,period:c.B,subjectId:subjects[code[1]],teacherStaffId:teacher.staffId||'',teacherName:teacher.name,teacherCode:code[2],subjectCode:code[1],teacherAssignmentStatus:teacher.staffId?'confirmed':'needs_review',status:'active',validationStatus:teacher.staffId?'Matched existing staff ID':'Teacher identity requires confirmation',...provenance(scheduleFile,`${col}${row}`)};
 }
 if(c.D&&!/^([A-T])\.(\d+)$/.test(c.D)){
  // School-wide activities and breaks have no teacher code; retain separately, never invent an attendance obligation.
  changes[`reference/smpCommonPeriods/${year}/${day}-${row}`]={day,startTime:`${time[1]}:${time[2]}`,endTime:`${time[3]}:${time[4]}`,name:c.D,classIds:Object.values(columns).map(s=>`CLS-SMP-${s}`),...provenance(scheduleFile,`D${row}`)};
 }
}
for(const {row,cells:c} of rows(scheduleFile).filter(r=>r.row>=72&&r.row<=77)){
 const m=c.B.match(/^(VII|VIII|IX) (PUTRA|PUTRI)$/),id=`CLS-SMP-${{VII:7,VIII:8,IX:9}[m[1]]}-${m[2]}`,teacher=staff(c.D);assert(teacher,`Homeroom ${c.D}`);homerooms[id]=teacher;changes[`classes/${id}/homeroomStaffId`]=teacher;changes[`classes/${id}/homeroomName`]=d.staff[teacher].name;
}
let mentorName='',mentorId=null;
for(const {row,cells:c} of rows(mentorFile)){
 if(row<7||!c.C)continue;
 if(c.B){mentorName=c.B;mentorId=staff(c.B);if(!mentorId)issues.push({type:'mentor_identity',name:mentorName,cell:`B${row}`});}
 const confirmedStudent=Object.entries(confirmations.studentAliases).find(([alias])=>norm(alias)===norm(c.C))?.[1];
 const matches=Object.entries(d.students).filter(([id,s])=>s.unitId==='UNIT-SMP'&&(confirmedStudent?id===confirmedStudent:norm(s.name)===norm(c.C)));
 if(matches.length!==1){issues.push({type:'student_identity',name:c.C,mentorName,cell:`C${row}`});continue;}
 const studentId=matches[0][0];assert(!mentors[studentId],`Duplicate mentee ${studentId}`);
 mentors[studentId]={academicYearId:year,studentId,mentorStaffId:mentorId||'',mentorName,unitId:'UNIT-SMP',status:mentorId?'active':'needs_review',...provenance(mentorFile,`C${row}`)};
 changes[`assignments/mentors/${year}/${studentId}`]=mentors[studentId];
}
for(const group of confirmations.combinedLessons||[])for(const period of group.periods){
 const members=Object.values(schedules).filter(s=>s.teacherCode===group.teacherCode&&s.day===group.day&&s.period===period&&group.classIds.includes(s.classId));
 assert.equal(members.length,group.classIds.length);assert.equal(new Set(members.map(s=>`${s.subjectId}|${s.startTime}|${s.endTime}`)).size,1);
 for(const s of members){s.combinedClassIds=group.classIds;s.teachingSessionId=`JSMP-2627G-GABUNG-${group.teacherCode}-${group.day}-${period}`;s.combinedConfirmedBy='Konfirmasi pengguna 4 Oktober 2026';}
}
for(const [id,r] of Object.entries(schedules))changes[`schedules/academic/${id}`]=r;
for(const id of new Set(Object.values(mentors).map(r=>r.mentorStaffId).filter(Boolean))){
 const ids=Object.values(mentors).filter(r=>r.mentorStaffId===id).map(r=>r.studentId);
 changes[`staff/${id}/appRoles`]=[...new Set([...(d.staff[id].appRoles||[]),'guru_wali'])];
 changes[`staff/${id}/roleScopes/guru_wali`]={...(d.staff[id].roleScopes?.guru_wali||{}),menteeStudentIds:ids};
}
// Existing staff can teach across units; append teaching role/scope without dropping other duties.
for(const id of new Set(Object.values(schedules).map(s=>s.teacherStaffId).filter(Boolean))){
 changes[`staff/${id}/appRoles`]=[...new Set([...(changes[`staff/${id}/appRoles`]||d.staff[id].appRoles||[]),'guru_mapel'])];
 changes[`staff/${id}/unitIds`]=[...new Set([...(d.staff[id].unitIds||[]),'UNIT-SMP'])];
}
const conflicts=[];for(const [id,a] of Object.entries(schedules))for(const [other,b] of Object.entries(schedules)){if(id>=other||a.teacherCode!==b.teacherCode||a.day!==b.day||a.classId===b.classId||(a.teachingSessionId&&a.teachingSessionId===b.teachingSessionId))continue;if(a.startTime<b.endTime&&b.startTime<a.endTime)conflicts.push({teacherName:a.teacherName,day:a.day,time:`${a.startTime}–${a.endTime}`,classIds:[a.classId,b.classId],cells:[a.sourceCell,b.sourceCell]});}
changes[`reference/teacherCodesSMP/${year}`]=teachers;
const report={academicYearId:year,sources:[scheduleFile,mentorFile],scheduleCount:Object.keys(schedules).length,linkedSchedules:Object.values(schedules).filter(s=>s.teacherStaffId).length,subjects:Object.keys(subjects).length,homerooms:Object.keys(homerooms).length,sourceMentees:80,matchedStudents:Object.keys(mentors).length,activeMentoring:Object.values(mentors).filter(r=>r.mentorStaffId).length,issues,conflicts};
const set=(root,path,value)=>{const keys=path.split('/');let r=root;for(const k of keys.slice(0,-1))r=r[k]??={};r[keys.at(-1)]=value;};
for(const [p,v] of Object.entries(changes))set(d,p,v);
// Firebase multi-location updates must not contain ancestor and descendant paths together.
for(const id of Object.keys(confirmations.newStaff)){
 changes[`staff/${id}`]=d.staff[id];for(const p of Object.keys(changes))if(p.startsWith(`staff/${id}/`))delete changes[p];
}
d.metadata.smpUpdate={date:'2026-10-04',sources:report.sources};
fs.writeFileSync(masterPath,JSON.stringify(d,null,2)+'\n');
fs.writeFileSync('seed/imports/smp-2026-2027-update.json',JSON.stringify({id:'smp-2026-2027-20261004',report,changes},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
