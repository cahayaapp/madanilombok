import {ROLE_LABELS} from './permissions.js';
const normalized=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function lastNameEmail(name,domain='madaniapp'){
 const clean=String(name||'').split(',')[0].replace(/\b(?:ustadzah|ustadz|ustaz|bapak|ibu|tgh|hj|h)\.?\s+/gi,'').trim();
 const words=normalized(clean).split(' ').filter(Boolean);
 if(!words.length)throw new Error('Nama SDM belum diisi.');
 return `${words.at(-1)}@${domain}`;
}
export function inferStaffRoles(person,suggestions=[]){
 const roles=new Set();
 for(const role of person.appRoles||[])if(Object.hasOwn(ROLE_LABELS,role))roles.add(role);
 if(Array.isArray(person.roles))for(const role of person.roles)if(Object.hasOwn(ROLE_LABELS,role))roles.add(role);
 const description=[person.roleSummary,person.staffType,person.additionalDuty,typeof person.roles==='string'?person.roles:''].join(' ').toLowerCase();
 if(/guru|kepondokan|kode guru/.test(description))roles.add('guru_mapel');
 if(/(?:^|;)\s*kepala sekolah(?:\s*;|$)/.test(description)||person.staffType==='Kepala Sekolah')roles.add('head_formal_school');
 if(/guru wali|mentoring individu/.test(description))roles.add('guru_wali');
 if(/halaqah|tahsin|tahfi[zdh]|mutqin|pembina gema/.test(description))roles.add('mentor_tahsin_tahfiz');
 if(/naqib|pembina kamar/.test(description))roles.add('naqib');
 if(/konselor/.test(description))roles.add('konselor');
 if(/kasir/.test(description))roles.add('kasir');
 // Candidate/fuzzy name matches are never authority to grant a role.
 for(const suggestion of suggestions){
  if(normalized(suggestion.displayName)!==normalized(person.name))continue;
  if(suggestion.staffCandidates?.length===1&&suggestion.staffCandidates[0].staffId===person.id&&Object.hasOwn(ROLE_LABELS,suggestion.suggestedRole))roles.add(suggestion.suggestedRole);
 }
 return [...roles].filter(role=>!(person.disabledAppRoles||[]).includes(role));
}
export function buildStaffAccountPlan(staff,profiles=[],classes=[],suggestions=[],leadership=[],emailDomain='madaniapp'){
 const reserved=new Map(profiles.filter(p=>p.email).map(p=>[p.email.toLowerCase(),p.staffId||p.id]));
 return staff.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(person=>{
  const confirmed=leadership.find(x=>x.staffId===person.id);
  const mismatch=confirmed&&!confirmed.knownNames.some(n=>normalized(n)===normalized(person.name));
  if(confirmed&&!mismatch)person={...person,displayName:confirmed.displayName,appRoles:[...new Set([...(person.appRoles||[]),...confirmed.appRoles])],roleScopes:{...person.roleScopes,...confirmed.roleScopes}};
  const base=lastNameEmail(person.displayName||person.name,emailDomain),[local,domain]=base.split('@');let email=base,index=2;
  const existing=profiles.find(p=>p.staffId===person.id&&(p.accountKind==='staff'||p.email?.toLowerCase()===base));
  if(existing)email=existing.email;
  else {while(reserved.has(email)&&reserved.get(email)!==person.id)email=`${local}${index++}@${domain}`;}
  reserved.set(email,person.id);
  const roles=inferStaffRoles(person,suggestions),units=person.unitIds||[];
  const roleScopes={...(person.roleScopes||{})};
  if(roles.includes('head_formal_school')){const scopedUnits=roleScopes.head_formal_school?.unitIds||units;roleScopes.head_formal_school={unitIds:scopedUnits,classIds:classes.filter(c=>scopedUnits.includes(c.unitId)).map(c=>c.id),...roleScopes.head_formal_school};}
  if(roles.includes('director'))roleScopes.director={unitIds:[],classIds:[],groupIds:[]};
  if(roles.includes('deputy_director'))roleScopes.deputy_director={unitIds:[],classIds:[],groupIds:[]};
  if(roles.includes('guru_mapel'))roleScopes.guru_mapel={unitIds:units,classIds:classes.filter(c=>units.includes(c.unitId)).map(c=>c.id),...roleScopes.guru_mapel};
  if(roles.includes('guru_wali'))roleScopes.guru_wali={unitIds:units,classIds:classes.filter(c=>c.homeroomStaffId===person.id).map(c=>c.id),...roleScopes.guru_wali};
  return {staffId:person.id,name:person.displayName||person.name,email,roles,role:roles[0]||'',roleScopes,unitIds:units,existingUid:existing?.id||null,status:mismatch?'identity_mismatch':existing?'existing':person.status==='inactive'?'inactive':roles.length?'ready':'needs_role'};
 });
}
