export const TARGET_UID='ISPES8ZTECNyJ5zECmCCep8vYIg1';
export const TARGET_STAFF='AMD-SDM-0078';
export const OLD_STAFF='AMD-SDM-0033';
export const YEAR='TA-2026-2027-GANJIL';
export const CLASS_ID='CLS-SMK-XI-TJKT';
export const REQUESTED=[
 ['AMD-SMK-0001','Abdul Rohim','0085862261'],
 ['AMD-SMK-0002','Adhes Soedirat','0092206161'],
 ['AMD-SMK-0013','ANAM ABQORI','0093176877'],
 ['AMD-SMK-0014','Andreas Dwi Santoso','0103441566'],
 ['AMD-SMK-0018','BAIN AZIQRA','0103752769']
];
const norm=x=>String(x||'').trim().toUpperCase();
const union=(a,b)=>[...new Set([...(a||[]),...b])];
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v??null;
export const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const roles=p=>union(Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k]),[p.role,...Object.keys(p.roleFlags||{}).filter(k=>p.roleFlags[k])].filter(Boolean));

// Only identity recovery, mentoring assignments and the affected staff's access metadata.
// No operational history, schedule, homeroom or finance path is writable here.
export function prepareSyamsulMaintenance(state,actorUid,now){
 const {year,profile,staff,oldStaff,users,classes,rows}=state;
 if(year!==YEAR||profile.email!=='hakim@madani.app'||profile.staffId!==TARGET_STAFF||profile.active===false||profile.accessRevoked)throw Error('Akun/tahun target berubah.');
 if(norm(staff.name)!=='SYAMSUL HAKIM'||staff.status==='inactive')throw Error('SDM target berubah.');
 if(classes[CLASS_ID]?.status==='inactive'||classes[CLASS_ID]?.unitId!=='UNIT-SMK')throw Error('Kelas XI TJKT tidak valid.');
 if(rows.length!==5||new Set(rows.map(r=>r.id)).size!==5)throw Error('Harus lima santri berbeda.');
 const changes={},before={},restored=[];
 const put=(path,value,old)=>{if(!same(value,old)){changes[path]=value;before[path]=old??null;}};
 const ids=REQUESTED.map(([id])=>id);
 for(const [id,name,nisn] of REQUESTED){
  const r=rows.find(r=>r.id===id);
  if(!r||r.classAssignment?.classId!==CLASS_ID||r.classAssignment?.status==='inactive')throw Error(`Penempatan kelas berubah: ${name}.`);
  if(r.matches.some(m=>m.id!==id))throw Error(`Identitas ganda/berubah: ${name}.`);
  if(r.student){
   if(norm(r.student.name)!==norm(name)||String(r.student.nisn)!==nisn||r.student.unitId!=='UNIT-SMK'||r.student.mergedInto||r.student.status!=='active')throw Error(`Identitas siswa berubah: ${name}.`);
  }else{
   if(id!=='AMD-SMK-0001'||r.matches.length)throw Error(`Master siswa hilang: ${name}.`);
   // Same old ID and existing class assignment; no new duplicate ID is generated.
   put(`students/${id}`,{name,nisn,gender:'L',unitId:'UNIT-SMK',status:'active',boardingStatus:'boarding',source:'Pemulihan identitas: foto Dapodik pengguna 11 November 2026 dan master sumber 26 Agustus 2026',validationStatus:'user_confirmed',restoredAt:now,restoredBy:actorUid},null);
   restored.push(name);
  }
  if(r.mentor&&!['AMD-SDM-0033',TARGET_STAFF].includes(r.mentor.mentorStaffId))throw Error(`Guru Wali berubah: ${name}.`);
  if(r.mentor?.mentorStaffId!==TARGET_STAFF||r.mentor?.status!=='active')put(`assignments/mentors/${year}/${id}`,{...r.mentor,studentId:id,academicYearId:year,unitId:'UNIT-SMK',mentorStaffId:TARGET_STAFF,mentorName:staff.name,status:'active',source:'Penugasan dikonfirmasi pengguna, foto Dapodik XI TJKT 11 November 2026',updatedAt:now,updatedBy:actorUid},r.mentor);
 }
 put(`users/${TARGET_UID}/roles`,union(roles(profile),['guru_wali']),profile.roles);
 put(`users/${TARGET_UID}/roleFlags/guru_wali`,true,profile.roleFlags?.guru_wali);
 const scope={unitIds:[],classIds:[],subjectIds:[],groupIds:[],studentIds:[],scopeGender:'',genderScope:'',...profile.roleScopes?.guru_wali,menteeStudentIds:union(profile.roleScopes?.guru_wali?.menteeStudentIds,ids)};
 put(`users/${TARGET_UID}/roleScopes/guru_wali`,scope,profile.roleScopes?.guru_wali);
 put(`staff/${TARGET_STAFF}/appRoles`,union(staff.appRoles,['guru_wali']),staff.appRoles);
 put(`staff/${TARGET_STAFF}/roleScopes/guru_wali`,{...staff.roleScopes?.guru_wali,menteeStudentIds:union(staff.roleScopes?.guru_wali?.menteeStudentIds,ids)},staff.roleScopes?.guru_wali);
 const changedUsers=new Set();
 for(const [id,p] of Object.entries(users||{})){
  if(p.staffId!==OLD_STAFF)continue;
  const current=p.roleScopes?.guru_wali?.menteeStudentIds;
  if(Array.isArray(current)&&current.some(id=>ids.includes(id))){
   put(`users/${id}/roleScopes/guru_wali/menteeStudentIds`,current.filter(id=>!ids.includes(id)),current);
   changedUsers.add(id);
  }
 }
 const oldIds=oldStaff?.roleScopes?.guru_wali?.menteeStudentIds;
 if(Array.isArray(oldIds))put(`staff/${OLD_STAFF}/roleScopes/guru_wali/menteeStudentIds`,oldIds.filter(id=>!ids.includes(id)),oldIds);
 if(Object.keys(changes).some(path=>path.startsWith(`users/${TARGET_UID}/`)))changedUsers.add(TARGET_UID);
 for(const id of changedUsers){const p=users[id];put(`users/${id}/accessVersion`,(p.accessVersion||0)+1,p.accessVersion);put(`users/${id}/updatedAt`,now,p.updatedAt);put(`users/${id}/updatedBy`,actorUid,p.updatedBy);put(`users/${id}/accessHistory/syamsul-mentor-${now}`,{action:'assign_guru_wali',actorUid,at:now,studentIds:ids,targetStaffId:TARGET_STAFF},null);}
 return {changes,before,restored,ids};
}
