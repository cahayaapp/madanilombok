// A dorm assignment must be explicit; formal teaching alone never grants membership.
export function counselorGender(profile={}){
 const scope=profile.roleScopes?.konselor||profile.assignments?.konselor||{};
 const value=scope.scopeGender||scope.genderScope||profile.scopeGender||profile.genderScope;
 return ['L','P'].includes(value)?value:'';
}
export function dormPersonnel(users,role,master={}){
 const gender=role==='head_boys_dorm'?'L':role==='head_girls_dorm'?'P':null;
 if(!gender)return [];
 return users.filter(u=>{
  const staff=(master.staff||[]).find(s=>s.id===u.staffId);
  if(!staff||staff.gender!==gender||staff.status==='inactive'||u.active===false||u.accessRevoked)return false;
  const roles=new Set([u.role,...(Array.isArray(u.roles)?u.roles:[]),...Object.keys(u.roleFlags||{}).filter(k=>u.roleFlags[k])]);
  if(['naqib','mentor_tahsin_tahfiz','konselor'].some(r=>roles.has(r)))return true;
  return roles.has('guru_mapel')&&(master.groups||[]).some(g=>g.status!=='inactive'&&(g.programType==='arabic'||g.subjectId==='MPL-PONDOK-ARAB-PAGI')&&[g.teacherStaffId,g.mentorStaffId,...(g.teacherStaffIds||[]),...(g.mentorStaffIds||[])].includes(staff.id));
 });
}
