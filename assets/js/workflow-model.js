import { MANAGEMENT_ROLES, LEADERSHIP_ROLES } from './role-workspace-catalog.js';
export const FINDING_TRANSITIONS={NEW:['VERIFIED','DISMISSED'],VERIFIED:['IN_PROGRESS'],IN_PROGRESS:['EVALUATION','ESCALATED'],EVALUATION:['RESOLVED','IN_PROGRESS'],ESCALATED:['IN_PROGRESS','ESCALATED'],RESOLVED:[],DISMISSED:[]};
export const FINDING_LABELS={NEW:'Baru',VERIFIED:'Terverifikasi',IN_PROGRESS:'Ditindaklanjuti',EVALUATION:'Menunggu evaluasi',ESCALATED:'Dieskalasi',RESOLVED:'Selesai',DISMISSED:'Tidak ditindaklanjuti'};
export function managementScope(role,profile={}) {
  if(role==='head_formal_school') return 'education';
  if(role==='head_boys_dorm') return 'boarding-L';
  if(role==='head_girls_dorm') return 'boarding-P';
  return profile.managementScope||'all';
}
export function canSeeManagement(record,session) {
  if(!MANAGEMENT_ROLES.includes(session.activeRole))return false;
  const scope=managementScope(session.activeRole,session.profile);
  return scope==='all'||record.scope===scope;
}
export function validateTransition(record,next,session,note) {
  if(!canSeeManagement(record,session))throw new Error('Temuan berada di luar scope role aktif.');
  if(!FINDING_TRANSITIONS[record.status]?.includes(next))throw new Error('Perubahan status tidak diperbolehkan.');
  if(!note?.trim())throw new Error('Catatan tindak lanjut/evaluasi wajib diisi.');
  if(record.status==='ESCALATED'&&record.escalationTargetRole&&record.escalationTargetRole!==session.activeRole&&!['admin','super_admin'].includes(session.activeRole))throw new Error('Keputusan hanya oleh role tujuan eskalasi.');
  if(next==='ESCALATED'&&session.activeRole==='director')throw new Error('Direktur memberikan keputusan akhir, bukan eskalasi lanjutan.');
  if(record.status==='ESCALATED'&&next==='ESCALATED'&&session.activeRole!=='deputy_director')throw new Error('Penerusan ke Direktur dilakukan oleh Wakil Direktur.');
  if(record.status==='ESCALATED'&&!LEADERSHIP_ROLES.includes(session.activeRole))throw new Error('Eskalasi perlu arahan pimpinan.');
  if(next==='RESOLVED'&&record.assigneeUid===session.user.uid)throw new Error('Penyelesaian diverifikasi oleh pejabat lain, bukan pelaksana tindakan.');
  return true;
}
export function requireAssignedId(value,list,label) {
  if(!list.some(row=>row.id===value))throw new Error(`${label} tidak berada dalam scope aktif.`);
  return value;
}

export function escalationTarget(role){return role==='deputy_director'?'director':'deputy_director';}
