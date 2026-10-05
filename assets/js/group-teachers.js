export function groupTeacherIds(group){return [...new Set([...(group.mentorStaffIds||[]),group.mentorStaffId].filter(Boolean))];}
export function groupTeacherName(group,staff=[]){const names=groupTeacherIds(group).map(id=>staff.find(s=>s.id===id)?.name).filter(Boolean);return names.length?names.join(' & '):(group.sourceMentorName||group.mentorName||'Belum ditautkan ke SDM');}
export function teachingGroups(master,profile,kind){
 return (master.groups||[]).filter(g=>g.status!=='inactive'&&(!kind||(kind==='arabic'?g.programType==='arabic':g.programType!=='arabic'))&&(profile.staffId&&groupTeacherIds(g).includes(profile.staffId)||profile.groupIds?.includes(g.id)));
}
export function mergeTeachingRoles(profile,assignments){
 const roles=new Set([...(Array.isArray(profile.roles)?profile.roles:Object.keys(profile.roles&&typeof profile.roles==='object'?profile.roles:{}).filter(k=>profile.roles[k])),profile.role,...(profile.appRoles||[])].filter(Boolean)),roleScopes={...profile.roleScopes};
 for(const [role,ids]of Object.entries(assignments)){roles.add(role);roleScopes[role]={...roleScopes[role],groupIds:[...new Set([...(roleScopes[role]?.groupIds||[]),...ids])]};}
 return {roles:[...roles],roleScopes};
}
