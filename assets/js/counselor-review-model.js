// Madani case IDs and incident dates remain authoritative. No external records.
export function isUnproven(c){return c.status==='tidak_terbukti'||c.tabayyun?.conclusion==='TIDAK TERBUKTI';}
export function isProven(c){return !isUnproven(c)&&c.tabayyun?.conclusion==='TERBUKTI';}
export function violationName(c){
 const status=c.attendanceStatus;const context=c.attendanceContext||c.programName||c.subjectName||String(c.description||'').match(/ pada (.+?)(?:\. |\.$|$)/)?.[1];
 return String(status&&context?`${status} ${context}`:c.violationName||c.violationLabel||c.description||c.category||'Pelanggaran').toLocaleUpperCase('id-ID');
}
export function incidentDate(c){return String(c.incidentDate||c.date||'').slice(0,10);}
export function counselingEntries(cases,legacy={}){
 const rows=[];
 for(const c of cases){if(isUnproven(c))continue;
  const sessions={...(legacy[c.id]||{}),...(c.sessions||{})};
  for(const [id,s] of Object.entries(sessions))rows.push({id,caseId:c.id,studentId:c.studentId,date:s.date||incidentDate(c),violation:violationName(c),groupSessionId:s.groupSessionId||s.batchId||'',what:s.what||s.clarification||'',why:s.why||s.insight||'',how:s.how||s.intervention||'',consequence:s.consequence||s.agreement||'',counselorUid:s.counselorUid,counselorName:s.counselorName||'',conclusion:s.conclusion||s.tabayyun?.conclusion||c.tabayyun?.conclusion||'',createdAt:s.createdAt||''});
  for(const [id,s] of Object.entries(c.batchActions||{}))if(!sessions[id])rows.push({id,caseId:c.id,studentId:c.studentId,date:s.date,violation:violationName(c),groupSessionId:s.batchId||'',what:s.description||'',why:'',how:s.followUp||'',consequence:s.actionType||'',counselorUid:s.counselorUid,counselorName:s.counselorName||'',conclusion:s.conclusion||c.tabayyun?.conclusion||'',createdAt:s.createdAt||''});
 }
 return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt).localeCompare(String(a.createdAt)));
}
const iso=d=>d.toISOString().slice(0,10);
export function evaluationPeriods(mode,anchor){
 const base=new Date(`${anchor}T12:00:00Z`);if(Number.isNaN(+base))throw Error('Tanggal tidak valid.');
 const monthly=mode.includes('month'),count=mode.startsWith('4')?4:1,result=[];
 for(let n=count-1;n>=0;n--){const start=new Date(base);if(monthly){start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()-n);}else{start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7)-7*n);}
 const end=new Date(start);monthly?end.setUTCMonth(end.getUTCMonth()+1):end.setUTCDate(end.getUTCDate()+7);end.setUTCDate(end.getUTCDate()-1);result.push({from:iso(start),to:iso(end)});}
 return result;
}
export function evaluateCases(cases,periods){return periods.map(p=>{const unique=new Map(cases.map(c=>[c.id,c]));const rows=[...unique.values()].filter(c=>isProven(c)&&incidentDate(c)>=p.from&&incidentDate(c)<=p.to);return {...p,total:rows.length,students:new Set(rows.map(c=>c.studentId)).size,rows,categories:rows.reduce((a,c)=>(a[c.category||'Lainnya']=(a[c.category||'Lainnya']||0)+1,a),{})};});}
