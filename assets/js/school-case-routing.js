export function isSdStudent(master,studentId){
 const student=(master.students||[]).find(s=>s.id===studentId),unit=(master.units||[]).find(u=>u.id===student?.unitId);
 return student?.unitId==='UNIT-SD'||unit?.type==='SD';
}
export function schoolCaseRoute(master,studentId,yearId){
 if(!isSdStudent(master,studentId))return {path:`boarding/cases/${yearId}`,fields:{status:'menunggu_konselor',handlingRole:'konselor'}};
 const classId=master.classAssignments?.[studentId]?.classId||null,room=(master.classes||[]).find(c=>c.id===classId),staffId=room?.homeroomStaffId||null;
 return {path:`boarding/homeroom_cases/${yearId}`,fields:{status:'menunggu_wali_kelas',handlingRole:'wali_kelas',unitId:'UNIT-SD',classId,assignedHomeroomStaffId:staffId,routingStatus:staffId?'assigned':'needs_homeroom'}};
}
export function canHandleSchoolCase(master,record,profile){
 if(!record||!isSdStudent(master,record.studentId)||!profile.staffId)return false;
 const classId=master.classAssignments?.[record.studentId]?.classId;
 return (master.classes||[]).some(c=>c.id===classId&&c.homeroomStaffId===profile.staffId);
}
export function applySchoolCaseNote(record,data,master,session,now){
 if(session.activeRole!=='guru_mapel'||!canHandleSchoolCase(master,record,session.profile))throw Error('Laporan hanya dapat ditangani Wali Kelas siswa ini.');
 if(['selesai','tidak_terbukti'].includes(record.status))throw Error('Laporan sudah ditutup.');
 if(!data.note?.trim()||!['ditangani','selesai','tidak_terbukti'].includes(data.status))throw Error('Isi hasil klarifikasi/pembinaan dan pilih status.');
 const id=data.id;
 if(record.homeroomHistory?.[id])return record;
 return {...record,handlingRole:'wali_kelas',assignedHomeroomStaffId:session.profile.staffId,status:data.status,homeroomHistory:{...record.homeroomHistory,[id]:{note:data.note.trim(),status:data.status,actorUid:session.user.uid,staffId:session.profile.staffId,at:now}}};
}
