export const GEMA_ATTENDANCE_NOTE='Presensi oleh Pembina GEMA';
export function gemaClassAttendance(student,schedule,master,yearId){
 if(schedule.groupId||!schedule.classId||!['UNIT-SD','UNIT-SMP','UNIT-SMK'].includes(student.unitId))return false;
 const placement=master.roomAssignments?.[student.id];
 return !!placement&&placement.status!=='inactive'&&(!placement.academicYearId||placement.academicYearId===yearId)&&['ROOM-PTR-GEMA','ROOM-PTRI-GEMA'].includes(placement.roomId);
}

export function isActiveGemaStudent(student,master,yearId){
 const p=master.roomAssignments?.[student.id];
 return !!p&&p.status!=='inactive'&&(!p.academicYearId||p.academicYearId===yearId)&&['ROOM-PTR-GEMA','ROOM-PTRI-GEMA'].includes(p.roomId);
}
