import {evaluateCases,evaluationPeriods,incidentDate} from './counselor-review-model.js';
export const EVALUATION_MODES={week:'Pekanan',month:'Bulanan','4weeks':'Bandingkan 4 pekan terakhir','4months':'Bandingkan 4 bulan terakhir'};
const iso=d=>d.toISOString().slice(0,10);
export function violationKind(c){
 const value=String(c.attendanceStatus||c.category||'Lainnya').trim();
 if(/alfa/i.test(value))return 'Alfa';
 if(/terlambat|telat/i.test(value))return 'Terlambat';
 return value||'Lainnya';
}
export function summarizeEvaluation(rows){
 const kinds=new Map(),students=new Map();
 for(const c of rows){const kind=violationKind(c);kinds.set(kind,(kinds.get(kind)||0)+1);if(c.studentId){const s=students.get(c.studentId)||{id:c.studentId,count:0,kinds:new Set()};s.count++;s.kinds.add(kind);students.set(c.studentId,s);}}
 const finished=rows.filter(c=>c.status==='selesai').length;
 return {total:rows.length,students:students.size,kinds:kinds.size,finished,pending:rows.length-finished,completion:rows.length?Math.round(finished/rows.length*100):0,distribution:[...kinds].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),top:[...students.values()].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)).slice(0,5)};
}
export function buildEvaluation(cases,mode,anchor){
 if(!EVALUATION_MODES[mode])throw Error('Periode tidak valid.');
 const periods=evaluationPeriods(mode,anchor);
 const buckets=evaluateCases(cases,periods).map(p=>({...p,...summarizeEvaluation(p.rows)}));
 const rows=buckets.flatMap(p=>p.rows),summary=summarizeEvaluation(rows);
 const from=periods[0].from,to=periods.at(-1).to;
 const previousAnchor=new Date(`${from}T12:00:00Z`);previousAnchor.setUTCDate(previousAnchor.getUTCDate()-1);
 const previous=summarizeEvaluation(evaluateCases(cases,evaluationPeriods(mode,iso(previousAnchor))).flatMap(p=>p.rows));
 let trend=buckets.map(p=>({from:p.from,to:p.to,count:p.total}));
 if(buckets.length===1){trend=[];for(let d=new Date(`${from}T12:00:00Z`);iso(d)<=to;d.setUTCDate(d.getUTCDate()+1)){const date=iso(d);trend.push({from:date,to:date,count:rows.filter(c=>incidentDate(c)===date).length});}}
 return {from,to,summary,previous,buckets,trend,rows};
}
