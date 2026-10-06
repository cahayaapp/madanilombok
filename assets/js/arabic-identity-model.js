import {mergeTeachingRoles} from './group-teachers.js';
export const arabicIdentityImportId='arabic-staff-confirmed-20261006-v1';
const main='AMD-SDM-0036',duplicate='AMD-SDM-0037',fahri='AMD-SDM-0023';
export const arabicIdentityNodes=['staff','groups','classes','rooms','dormitories','assignments','schedules','programs','users'];
const union=(a=[],b=[])=>[...new Set([...a,...b])];
function mergeScope(a={},b={}){const out={...b,...a};for(const k of Object.keys(b)){if(Array.isArray(b[k]))out[k]=union(a[k],b[k]);else if(b[k]&&typeof b[k]==='object')out[k]=mergeScope(a[k],b[k]);}return out;}
export function prepareArabicIdentity(data){
 const changes={},s=data.staff||{},ida=s[main],old=s[duplicate],f=s[fahri];
 if(!/^ida fitriana$/i.test(ida?.name||'')||!/^ida fitriana$/i.test(old?.name||'')||!/^fahri (effendi|aldian effendi)$/i.test(f?.name||''))throw Error('Identitas SDM berubah. Periksa master sebelum menggabungkan.');
 // Rewrite reference leaves only; historical operational records and finance are untouched.
 function refs(value,path){if(value===duplicate){changes[path]=main;return;}if(Array.isArray(value)&&value.includes(duplicate)){changes[path]=[...new Set(value.map(x=>x===duplicate?main:x))];return;}if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))refs(v,path+'/'+k);}
 for(const node of arabicIdentityNodes.filter(n=>!['staff','users','programs'].includes(n)))refs(data[node],node);
 const merged={...old,...ida,unitIds:union(ida.unitIds,old.unitIds),appRoles:union(ida.appRoles,old.appRoles),roleScopes:mergeScope(ida.roleScopes,old.roleScopes),confirmedDuplicateIds:union(ida.confirmedDuplicateIds,[duplicate])};
 const links={'GRP-2026-arabic-L-c3':fahri,'GRP-2026-arabic-P-3':main,'GRP-2026-quran-P-5':main},assignments={};
 for(const [gid,id]of Object.entries(links)){
  const g=data.groups?.[gid];if(!g)throw Error('Terapkan Kelompok & Kamar terlebih dahulu.');
  if([...(g.mentorStaffIds||[]),g.mentorStaffId].filter(Boolean).some(x=>![id,duplicate].includes(x)))throw Error('Pembina kelompok telah berubah: '+g.name);
  const role=g.programType==='arabic'?'guru_mapel':'mentor_tahsin_tahfiz';((assignments[id]??={})[role]??=[]).push(gid);
  for(const [key,value]of Object.entries({mentorStaffId:id,mentorStaffIds:[id],mentorName:id===fahri?'Fahri Aldian Effendi':ida.name,sourceMentorName:g.sourceMentorName||g.mentorName}))changes[`groups/${gid}/${key}`]=value;
 }
 for(const [id,record]of [[main,merged],[fahri,{...f,name:'Fahri Aldian Effendi'}]]){const a=mergeTeachingRoles(record,assignments[id]);changes[`staff/${id}`]={...record,appRoles:a.roles,roleScopes:a.roleScopes};}
 changes[`reference/staffIdentityMerges/${duplicate}`]={canonicalStaffId:main,sourceStaff:old,confirmation:'Pengguna mengonfirmasi satu identitas, 6 Oktober 2026'};
 changes[`staff/${duplicate}`]=null;
 for(const [uid,p]of Object.entries(data.users||{})){
  const id=p.staffId===duplicate?main:p.staffId;if(!assignments[id])continue;
  if(p.staffId===duplicate)changes[`users/${uid}/staffId`]=main;
  // Keep each login's existing privileges; add only the confirmed teaching assignments.
  const a=mergeTeachingRoles(p,assignments[id]);changes[`users/${uid}/roles`]=a.roles;changes[`users/${uid}/roleScopes`]=a.roleScopes;
  for(const role of Object.keys(assignments[id]))changes[`users/${uid}/roleFlags/${role}`]=true;
  changes[`users/${uid}/accessVersion`]=(p.accessVersion||0)+1;
 }
 for(const [gid,g]of Object.entries(data.groups||{})){
  if(g.programType==='arabic'&&g.scheduleBasis)changes[`groups/${gid}/scheduleBasis`]=g.scheduleBasis.replace(/mufrodat/gi,'Bahasa Arab');
  if(!links[gid]&&[...(g.mentorStaffIds||[]),g.mentorStaffId].includes(fahri))changes[`groups/${gid}/mentorName`]='Fahri Aldian Effendi';
 }
 for(const pid of ['PRG-2026-UMUM-04','PRG-2026-GEMA-04']){
  const p=data.programs?.[pid];if(!p||!/(mufrodat|bahasa arab)/i.test(p.name))throw Error('Jadwal Bahasa Arab pagi belum tersedia atau sudah berubah.');
  for(const key of ['name','detail','description','notes'])if(typeof p[key]==='string')changes[`programs/${pid}/${key}`]=p[key].replace(/mufrodat/gi,'Bahasa Arab');
 }
 return changes;
}
