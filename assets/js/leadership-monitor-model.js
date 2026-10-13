// Ownership follows the teaching group/program, never the pupil's formal school.
export function boardingLearning(record,master={}){
 const schedules=master.academicSchedules||[];
 const schedule=schedules.find(s=>s.id===record.scheduleId)||{};
 const groupId=record.groupId||schedule.groupId;
 const group=(master.groups||[]).find(g=>g.id===groupId||(record.scheduleId||'').startsWith(`group-${g.id}-`)||(record.scheduleId||'').startsWith(`quran-${g.id}-`));
 return !!group||record.teachingTarget==='group'||schedule.teachingTarget==='group'||record.subjectId==='MPL-PONDOK-QURAN'||record.subjectId==='MPL-PONDOK-ARAB-PAGI';
}
export function teachingReportInScope(record,scope,master){
 const boarding=boardingLearning(record,master);
 if(scope.school)return !boarding&&(scope.classIds.has(record.classId)||(record.classIds||[]).some(id=>scope.classIds.has(id)));
 if(!boarding)return false;
 const group=(master.groups||[]).find(g=>g.id===record.groupId||(record.scheduleId||'').startsWith(`group-${g.id}-`)||(record.scheduleId||'').startsWith(`quran-${g.id}-`));
 if(group?.gender)return group.gender===scope.gender||['Campuran','mixed'].includes(group.gender);
 return Object.keys(master.groupAssignments?.[group?.id]||{}).some(id=>scope.studentIds.has(id));
}
// Reports use canonical identities and fail closed when the leader has no scope.
export function monitorScope(session,master){
 const role=session.activeRole,school=role==='head_formal_school';
 if(!['head_formal_school','head_boys_dorm','head_girls_dorm'].includes(role))throw Error('Di luar kewenangan pimpinan unit.');
 const units=session.profile.roleScopes?.[role]?.unitIds??session.profile.unitIds??[],gender=school?'':role==='head_boys_dorm'?'L':'P';
 const students=(master.students||[]).filter(s=>!s.mergedInto&&(school?units.includes(s.unitId):s.gender===gender&&s.boardingStatus==='boarding'));
 const classes=(master.classes||[]).filter(c=>school&&units.includes(c.unitId));
 return {school,units,gender,students,classes,studentIds:new Set(students.map(s=>s.id)),classIds:new Set(classes.map(c=>c.id))};
}
export function attendanceSummary(rows){
 const valid=rows.filter(r=>!r.attendanceManagedBy&&['Hadir','Terlambat','Sakit','Izin','Alfa','TEPAT_WAKTU','TERLAMBAT'].includes(r.status));
 const present=valid.filter(r=>['Hadir','Terlambat','TEPAT_WAKTU','TERLAMBAT'].includes(r.status));
 const late=present.filter(r=>['Terlambat','TERLAMBAT'].includes(r.status)||Number(r.lateMinutes)>0);
 return {total:valid.length,present:present.length,late:late.length,absent:valid.length-present.length,attendance:valid.length?Math.round(present.length/valid.length*1000)/10:null,punctuality:present.length?Math.round((present.length-late.length)/present.length*1000)/10:null,unknown:rows.length-valid.length};
}
export function learningRows(sessions,scope){
 return sessions.filter(r=>r.stage==='FINAL').flatMap(r=>Object.entries(r.students||{}).filter(([id])=>scope.studentIds.has(id)).map(([studentId,s])=>({...r,...s,studentId,students:undefined})));
}
export const isLate=r=>['Terlambat','TERLAMBAT'].includes(r.status)||Number(r.lateMinutes)>0;
export const isAbsent=r=>['Sakit','Izin','Alfa'].includes(r.status);
export const caseHandled=r=>!!(r.tabayyun||r.counseling||r.action||r.evaluation||['ditangani','dalam_penanganan','selesai','tidak_terbukti'].includes(r.status));
export const MONITOR_VIEWS={
 'dorm-quran-daily':['Setoran Tahfiz Harian','quran'],
 'school-teacher-attendance':['Kehadiran Guru','teacher'], 'school-teacher-punctuality':['Kedisiplinan Guru','teacher'],
 'school-student-attendance':['Kehadiran Siswa','student'], 'school-student-punctuality':['Kedisiplinan Siswa','student'],
 'school-mentoring':['Mentoring Guru Wali','mentoring'], 'dorm-student-attendance':['Kehadiran Santri','boarding'],
 'dorm-student-punctuality':['Kedisiplinan Santri','boarding'],
 'dorm-teacher-attendance':['Kehadiran Pembina & Guru Pondok','pondokTeacher'], 'dorm-teacher-punctuality':['Kedisiplinan Pembina & Guru Pondok','pondokTeacher'], 'dorm-counselor':['Konselor','cases']
};
export function teacherMissing(schedules,records,from,to,now=Date.now()){
 const missing=[],days=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
 if(Date.parse(to)-Date.parse(from)>366*86400000)throw Error('Periode maksimal satu tahun.');
 for(let d=Date.parse(from+'T12:00:00Z');d<=Date.parse(to+'T12:00:00Z');d+=86400000){const date=new Date(d).toISOString().slice(0,10),day=days[new Date(d).getUTCDay()];
 for(const s of schedules){if((s.day==='Ahad'?'Minggu':s.day)!==day||!s.staffId&&!s.teacherStaffId||Date.parse(`${date}T${s.endTime}:00+08:00`)>now)continue;const ids=s.sourceScheduleIds||[s.id];if(!records.some(r=>r.date===date&&r.staffId===(s.staffId||s.teacherStaffId)&&(ids.includes(r.scheduleId)||(r.sourceScheduleIds||[]).some(id=>ids.includes(id)))))missing.push({...s,date,staffId:s.staffId||s.teacherStaffId,status:'Belum presensi'});}
 }return missing;
}
