// Shared schedule audience rules. Membership always uses the existing student ID.
export function activeDaily(s,yearId){return s.status!=='inactive'&&(!yearId||!s.academicYearId||s.academicYearId===yearId);}
export function genderMatches(scope,gender){return !scope||scope==='mixed'||!gender||scope===gender;}
export function dailyForStudent(s,student,master){
 if(!activeDaily(s)||!genderMatches(s.genderScope,student.gender))return false;
 const assignment=master.roomAssignments?.[student.id];
 const roomId=assignment?.status==='inactive'?'':assignment?.roomId;
 const boarding=Boolean(roomId)||student.boardingStatus==='boarding';
 // Legacy TK entries were imported as all_boarding; retain their original audience.
 if(s.audience==='TK IT Al-Madani')return student.unitId==='UNIT-TK';
 const gema=['ROOM-PTR-GEMA','ROOM-PTRI-GEMA'].includes(roomId);
 switch(s.participantScope){
  case 'boarding_gema':return boarding&&gema;
  case 'boarding_general':return Boolean(roomId)&&!gema;
  case 'all_boarding':return boarding;
  case 'units':return (s.targetUnitIds||[]).includes(student.unitId);
  case 'unit':return student.unitId===s.targetId;
  case 'class':return master.classAssignments?.[student.id]?.classId===s.targetId;
  case 'group':return Boolean(master.groupAssignments?.[s.targetId]?.[student.id]);
  case 'all_students':return true;
  default:return false;
 }
}
export function dailyForStaff(s,profile,yearId){
 const gender=profile.scopeGender||profile.genderScope;
 return s.audience!=='TK IT Al-Madani'&&activeDaily(s,yearId)&&genderMatches(s.genderScope,gender);
}
export function programStudents(programId,master){
 const schedules=(master.dailySchedules||[]).filter(s=>s.programId===programId&&activeDaily(s));
 return (master.students||[]).filter(student=>student.status!=='inactive'&&schedules.some(s=>dailyForStudent(s,student,master)));
}
