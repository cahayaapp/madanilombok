export function personnelRoles(user={}){
 return new Set([user.role,...(Array.isArray(user.roles)?user.roles:Object.keys(user.roles||{}).filter(k=>user.roles[k])),...(user.appRoles||[]),...Object.keys(user.roleFlags||{}).filter(k=>user.roleFlags[k])]);
}
const normalizedGender=value=>({L:'L',P:'P',PUTRA:'L',PUTRI:'P','LAKI-LAKI':'L',PEREMPUAN:'P'})[String(value||'').trim().toUpperCase()]||'';
export function personnelGender(staff={},user={},duty={}){
 const explicit=normalizedGender(staff.gender);if(explicit)return explicit;
 const values=[duty.active!==false?duty.gender:'',user.gender,user.scopeGender,user.genderScope,...Object.entries(user.roleScopes||{}).filter(([r])=>['naqib','mentor_tahsin_tahfiz','konselor','guru_mapel'].includes(r)).flatMap(([,s])=>[s.scopeGender,s.genderScope])].map(normalizedGender).filter(Boolean);
 const genders=new Set(values);return genders.size===1?[...genders][0]:'';
}
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
  if(!staff||personnelGender(staff,u,master.naqibDuty?.[staff.id])!==gender||staff.status==='inactive'||u.active===false||u.accessRevoked)return false;
  const roles=personnelRoles(u);
  if(master.naqibDuty?.[staff.id]?.active===true)return true;
  if(['naqib','mentor_tahsin_tahfiz','konselor'].some(r=>roles.has(r)))return true;
  return roles.has('guru_mapel')&&(master.groups||[]).some(g=>g.status!=='inactive'&&(g.programType==='arabic'||g.subjectId==='MPL-PONDOK-ARAB-PAGI')&&[g.teacherStaffId,g.mentorStaffId,...(g.teacherStaffIds||[]),...(g.mentorStaffIds||[])].includes(staff.id));
 });
}
