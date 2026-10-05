export const REPORT_TYPES={bulanan:'Bulanan',triwulan:'Triwulan',semester:'Semester'};
export function reportKey(type,period){if(!REPORT_TYPES[type]||!/^\d{1,4}(?:-\d{2})?$/.test(String(period)))throw Error('Periode rapor tidak valid.');if(type==='bulanan'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period))||type==='triwulan'&&!/^[1-4]$/.test(String(period))||type==='semester'&&!/^[12]$/.test(String(period)))throw Error('Periode rapor tidak valid.');return `${type}__${period}`;}
export function reportReadiness(sessions,schedules,studentId,classId,type,period){
 const expected=[...new Set(schedules.filter(s=>s.status!=='inactive'&&(s.classId===classId||s.classIds?.includes(classId))).map(s=>s.subjectId).filter(Boolean))];
 const rows=expected.map(subjectId=>{const candidates=sessions.filter(r=>r.subjectId===subjectId&&r.type===type&&String(r.period)===String(period)&&r.students?.[studentId]&&(r.classId===classId||r.classIds?.includes(classId))).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));const r=candidates[0],score=r?.students?.[studentId]?.score;return {subjectId,score:r?.stage==='FINAL'&&typeof score==='number'&&Number.isFinite(score)?score:null,remedial:!!r?.students?.[studentId]?.remedial,sourceUpdatedAt:r?.updatedAt||0,stage:r?.stage||'MISSING'};});
 return {rows,expected:expected.length,final:rows.filter(r=>r.score!==null).length,ready:expected.length>0&&rows.every(r=>r.score!==null)};
}
export function mutatePublication(current,action,{actorUid,actorName,role,note='',readiness,ranking=null,studentId,classId,type,period,now,eventId}){
 if(!['deputy_director','admin','super_admin'].includes(role))throw Error('Publikasi ditinjau oleh Wakil Direktur / Supervisor.');
 if(current?.history?.[eventId])return current;
 if(!['publish','revise','withdraw'].includes(action))throw Error('Tindakan tidak dikenal.');
 if(action!=='publish'&&!note.trim())throw Error('Alasan wajib diisi.');
 if(action==='withdraw'&&current?.status!=='PUBLISHED')throw Error('Rapor belum dipublikasikan.');
 if(action==='revise'&&current?.status==='PUBLISHED')throw Error('Tarik publikasi sebelum meminta revisi.');
 if(action==='publish'&&(!readiness?.ready||current?.status==='NEEDS_REVISION'&&!readiness.rows.some(r=>r.sourceUpdatedAt>current.revisionRequestedAt)))throw Error('Nilai belum lengkap atau perbaikan belum difinalisasi.');
 const status={publish:'PUBLISHED',revise:'NEEDS_REVISION',withdraw:'WITHDRAWN'}[action];
 return {...current,studentId,classId,type,period,status,version:(current?.version||0)+1,updatedAt:now,updatedBy:actorUid,...(action==='publish'?{rows:readiness.rows,classRanking:ranking,publishedAt:now,publishedBy:actorUid,publishedByName:actorName}:{}),...(action==='revise'?{revisionNote:note.trim(),revisionRequestedAt:now}:{}),history:{...current?.history,[eventId]:{action,note:note.trim(),actorUid,actorName,at:now}}};
}
export function rankClassReports(entries){
 const rows=entries.map(({studentId,readiness})=>{const scores=readiness.rows.filter(r=>r.score!==null);return {studentId,average:scores.length?scores.reduce((n,r)=>n+r.score,0)/scores.length:null,subjectCount:scores.length,remedial:scores.filter(r=>r.remedial).length,complete:readiness.ready,rank:null,total:0,method:'competition-v1'};});
 const ranked=rows.filter(r=>r.complete&&Number.isFinite(r.average)).sort((a,b)=>b.average-a.average);ranked.forEach((r,i)=>{r.rank=i&&Math.abs(r.average-ranked[i-1].average)<1e-9?ranked[i-1].rank:i+1;r.total=ranked.length;});return rows;
}
