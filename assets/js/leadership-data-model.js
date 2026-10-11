// Master-data scope is deliberately closed when the leader has no assigned unit.
export const DATA_ROLES=['head_formal_school','head_boys_dorm','head_girls_dorm'];
export function dataScope(session){
 const role=session.activeRole;if(!DATA_ROLES.includes(role)||!session.roles.includes(role))throw Error('Manajemen Data hanya tersedia untuk pimpinan unit.');
 const profile=session.profile,school=role==='head_formal_school';
 const units=profile.roleScopes?.[role]?.unitIds??profile.unitIds??[];
 return {role,school,units:Array.isArray(units)?units:[],gender:school?'':role==='head_boys_dorm'?'L':'P',uid:session.user.uid};
}
export const active=r=>r&&(!r.status||r.status==='active')&&!r.mergedInto;
export function inDataScope(kind,row,scope,master={}){
 if(!row)return false;
 if(kind==='students')return scope.school?scope.units.includes(row.unitId):row.gender===scope.gender&&row.boardingStatus==='boarding';
 if(kind==='classes')return scope.school&&scope.units.includes(row.unitId);
 if(kind==='rooms')return !scope.school&&master.dormitories?.some(d=>d.id===row.dormitoryId&&d.gender===scope.gender);
 if(kind==='groups')return !scope.school&&(row.genderScope||row.gender)===scope.gender;
 if(kind==='staff')return scope.school?Array.isArray(row.unitIds)&&row.unitIds.length===1&&row.unitIds.every(id=>scope.units.includes(id)):row.gender===scope.gender;
 return false;
}
export function validateMaster(kind,next,old,scope,master){
 if(!inDataScope(kind,next,scope,master)||(old&&!inDataScope(kind,old,scope,master)))throw Error('Data berada di luar unit kewenangan Anda.');
 if(old?.mergedInto)throw Error('Identitas ini telah digabung; ubah identitas santri tujuan penggabungan.');
 if(!next.name?.trim())throw Error('Nama wajib diisi.');
 if(!['active','inactive','leave','graduated','withdrawn'].includes(next.status))throw Error('Status tidak valid.');
 if(kind==='students'){
  if(!master.units.some(u=>u.id===next.unitId)||!['L','P'].includes(next.gender))throw Error('Unit dan jenis kelamin wajib dipilih.');
  for(const key of ['nisn','studentNo'])if(next[key]&&(master.students||[]).some(s=>s.id!==old?.id&&s[key]===next[key]&&active(s)))throw Error(`${key.toUpperCase()} sudah dipakai santri lain. Periksa identitas sebelum menambah.`);
 }
 if(next.capacity!==undefined&&(!Number.isInteger(Number(next.capacity))||Number(next.capacity)<0))throw Error('Kapasitas harus bilangan bulat minimal 0.');
 for(const key of ['homeroomStaffId','staffId','mentorStaffId'])if(next[key]&&next[key]!==old?.[key]&&!master.staff.some(s=>s.id===next[key]&&active(s)&&inDataScope('staff',s,scope,master)))throw Error('Personil harus aktif dan berada dalam unit Anda.');
 return next;
}
export function placementChange({kind,student,target,scope,master,yearId,current}){
 if(!yearId||!student||(target&&!active(student))||!(inDataScope('students',student,scope,master)||(!target&&!scope.school&&student.gender===scope.gender)))throw Error('Santri atau tahun ajaran tidak sesuai.');
 if(target&&(!active(target)||!inDataScope(kind==='mentors'?'staff':kind,target,scope,master)))throw Error('Tujuan penempatan berada di luar kewenangan Anda.');
 if(kind==='classes'&&target&&target.unitId!==student.unitId)throw Error('Kelas harus berada di unit sekolah santri.');
 if(kind==='mentors'&&['SD','TK'].includes(master.units.find(u=>u.id===student.unitId)?.code))throw Error('Guru Wali SD mengikuti Wali Kelas; TK tidak memakai Guru Wali.');
 const key={classes:'classId',rooms:'roomId',groups:'groupId',mentors:'mentorStaffId'}[kind];
 if(!key)throw Error('Jenis penempatan tidak dikenal.');
 return {...(current||{}),studentId:student.id,academicYearId:yearId,[key]:target?.id||current?.[key]||'',status:target?'active':'inactive',assignedBy:scope.uid,assignedAt:Date.now()};
}
export const staffRoles=scope=>scope.school?['guru_mapel','guru_wali']:['naqib','mentor_tahsin_tahfiz','guru_wali','konselor'];
