import {ROLE_LABELS} from './permissions.js';
export const roleIds=p=>[...new Set([p.role,...(Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k])),...Object.keys(p.roleFlags||{}).filter(k=>p.roleFlags[k])].filter(r=>Object.hasOwn(ROLE_LABELS,r)))];
export const SCOPE_FIELDS={
 kesehatan:['unitIds','scopeGender'],
 guru_mapel:['unitIds','classIds','subjectIds'],mentor_tahsin_tahfiz:['unitIds','groupIds','scopeGender'],guru_wali:['classIds','menteeStudentIds','scopeGender'],
 naqib:['scopeGender'],konselor:['scopeGender','counselorLevel'],head_formal_school:['unitIds','classIds'],head_boys_dorm:[],head_girls_dorm:[],
 director:['unitIds'],deputy_director:['unitIds'],kasir:['financeUnit'],wali_santri:['studentIds'],admin:[],super_admin:[]
};
export const FIELD_LABELS={unitIds:'Unit sekolah',classIds:'Kelas / rombel',subjectIds:'Mata pelajaran',groupIds:'Halaqah / kelompok',menteeStudentIds:'Santri binaan',studentIds:'Anak terotorisasi',scopeGender:'Lingkup putra / putri',financeUnit:'Unit kasir',counselorLevel:'Level Konselor'};
export const FIELD_MASTER={unitIds:'units',classIds:'classes',subjectIds:'subjects',groupIds:'groups',menteeStudentIds:'students',studentIds:'students'};
const copy=x=>JSON.parse(JSON.stringify(x));
export function userDraft(p={}){
 const roles=roleIds(p),roleScopes=copy(p.roleScopes||{});
 for(const role of roles){
  roleScopes[role]||={};for(const key of SCOPE_FIELDS[role]||[]){const value=p[key]??(key==='scopeGender'?p.genderScope:undefined)??(key==='studentIds'&&p.studentId?[p.studentId]:undefined);if(roleScopes[role][key]===undefined&&value!==undefined)roleScopes[role][key]=copy(value);}
 }
 return {name:p.name||p.displayName||'',email:p.email||'',staffId:p.staffId||'',roles,defaultRole:roles.includes(p.defaultRole)?p.defaultRole:roles[0]||'',roleScopes,active:p.active!==false&&!p.accessRevoked};
}
export function validateUserDraft(d,master={}){
 if(!d.name?.trim())throw Error('Nama pengguna wajib diisi.');
 if(!d.roles.length||d.roles.some(r=>!Object.hasOwn(ROLE_LABELS,r)))throw Error('Pilih minimal satu role yang tersedia.');
 if(!d.roles.includes(d.defaultRole))throw Error('Role utama harus termasuk role yang dipilih.');
 if(d.staffId&&!master.staff?.some(s=>s.id===d.staffId))throw Error('SDM tidak ditemukan pada master.');
 for(const role of d.roles){const s=d.roleScopes[role]||{};
  for(const key of SCOPE_FIELDS[role]||[]){if(FIELD_MASTER[key]){const values=s[key]||[];if(!Array.isArray(values)||values.some(id=>!master[FIELD_MASTER[key]]?.some(r=>r.id===id)))throw Error(`${FIELD_LABELS[key]} tidak sesuai master.`);}}
  if(s.scopeGender&&!['L','P'].includes(s.scopeGender))throw Error('Scope gender tidak valid.');
  if(role==='kasir'&&!['PUTRA','PUTRI'].includes(s.financeUnit))throw Error('Pilih unit kasir Putra atau Putri.');
  if(role==='wali_santri'&&!s.studentIds?.length)throw Error('Hubungkan minimal satu anak untuk Wali Santri.');
  if(role==='head_formal_school'&&!s.unitIds?.length)throw Error('Pilih unit penugasan Kepala Sekolah.');
  if(s.counselorLevel&&!['PEMULA','MADYA'].includes(s.counselorLevel))throw Error('Level Konselor tidak valid.');
  if(s.unitIds?.length&&s.classIds?.some(id=>!s.unitIds.includes(master.classes.find(c=>c.id===id)?.unitId)))throw Error('Kelas yang dipilih berada di luar unit penugasan.');
 }
 return true;
}
export function applyUserDraft(current,d,master,actorUid,targetUid,eventId){
 validateUserDraft(d,master);
 if(actorUid===targetUid&&(!d.active||!d.roles.some(r=>['admin','super_admin'].includes(r))))throw Error('Anda tidak dapat mencabut akses administrator akun sendiri.');
 const scopes=Object.fromEntries(d.roles.map(role=>{
  // Explicit empty scope fields prevent legacy profile fields leaking between roles.
  const s={unitIds:[],classIds:[],subjectIds:[],groupIds:[],studentIds:[],menteeStudentIds:[],scopeGender:'',genderScope:'',financeUnit:'',cashierUnits:[],...copy(d.roleScopes[role]||{})};
  if(s.unitIds.length&&!s.classIds.length)s.classIds=(master.classes||[]).filter(c=>s.unitIds.includes(c.unitId)).map(c=>c.id);
  s.genderScope=s.scopeGender||'';
  if(role==='kasir')s.cashierUnits=[s.financeUnit];
  if(role==='head_boys_dorm')s.scopeGender=s.genderScope='L';
  if(role==='head_girls_dorm')s.scopeGender=s.genderScope='P';
  return [role,s];
 }));
 const children=scopes.wali_santri?.studentIds||[];
 const next={...current,name:d.name.trim(),staffId:d.staffId||'',roles:[...new Set(d.roles)],role:d.defaultRole,defaultRole:d.defaultRole,roleFlags:Object.fromEntries(d.roles.map(r=>[r,true])),roleScopes:scopes,studentIds:children,studentId:children[0]||'',studentAccess:Object.fromEntries(children.map(id=>[id,true])),active:d.active,accessRevoked:false,accessVersion:(current.accessVersion||0)+1};
 if(!current.accessManagedAt)next.legacyRoleData={role:current.role||'',roles:current.roles||[],roleFlags:current.roleFlags||{},roleScopes:current.roleScopes||{}};
 next.accessManagedAt={'.sv':'timestamp'};
 next.accessHistory={...current.accessHistory,[eventId]:{action:'save_access',actorUid,at:{'.sv':'timestamp'},roles:next.roles,defaultRole:next.defaultRole,active:next.active}};
 delete next.id;
 return next;
}
export function revokeUserAccess(current,actorUid,targetUid,eventId){
 if(actorUid===targetUid)throw Error('Anda tidak dapat mencabut akses akun sendiri.');
 if(current.accessRevoked)throw Error('Akses pengguna sudah dicabut.');
 const next={...current,accessRevoked:true,active:false,accessVersion:(current.accessVersion||0)+1,accessHistory:{...current.accessHistory,[eventId]:{action:'revoke_access',actorUid,at:{'.sv':'timestamp'}}}};delete next.id;return next;
}
