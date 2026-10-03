// Adapted from fajrulislam/js/weekly-kpi-v2.js v3; institutional timezone is WITA.
const numericMetric=x=>{const v=x&&typeof x==='object'?x.value:x;return v===null||v===undefined||v===''?NaN:Number(v);};
  'use strict';
  const VERSION='v2';
  const CYCLE=Object.freeze({
    id:'MON_SAT_NOON',label:'KPI Pekan Kerja',timezone:'Asia/Makassar',
    cutoffDay:'sabtu',cutoffMinutes:13*60,
    rewardPolicyVersion:'v1',rewardStartDayOffset:5,rewardStartMinutes:13*60,
    rewardEndDayOffset:6,rewardEndMinutes:11*60
  });
  const CONFIG={
    GURU:{operationalMax:55,qualityMax:25,qualityMinimum:20,qualityTarget:1,operational:[
      ['attendance','Kehadiran mengajar',15],['punctuality','Ketepatan waktu',10],['learningAttendance','Absensi pembelajaran',10],['journal','Jurnal/Laporan KBM',10],['evaluationDue','Evaluasi & tindak lanjut jatuh tempo',10]
    ]},
    NAQIB:{operationalMax:50,qualityMax:30,qualityMinimum:24,qualityTarget:2,operational:[
      ['programDelivery','Program tanggung jawab terlaksana',15],['programAttendance','Absensi program lengkap',10],['programReport','Laporan pelaksanaan lengkap',10],['presence','Kehadiran & ketepatan waktu',10],['findingFollowup','Pelaporan temuan & tindak lanjut',5]
    ]}
  };
  const EXEMPLARY_LABELS=['Kedisiplinan pribadi','Adab dan komunikasi','Konsistensi antara ucapan dan tindakan','Sikap terhadap amanah','Keteladanan nilai Madani'];
  const QUALITY_LABELS={
    GURU:['Kesiapan & kejelasan tujuan pembelajaran','Keterlibatan aktif santri','Kejelasan dan kedalaman penyampaian','Pengelolaan kelas & adab belajar','Pengecekan pemahaman & penutup'],
    NAQIB:['Ketertiban program','Keterlibatan santri','Kualitas/suasana program','Kualitas pendampingan Naqib','Menjaga program saat muncul gangguan']
  };
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const key=v=>norm(v).replace(/\s+/g,'')||'unknown';
  const values=node=>Array.isArray(node)?node.filter(Boolean):Object.entries(node||{}).map(([id,row])=>row&&typeof row==='object'?{id,...row}:null).filter(Boolean);
  const dateKey=value=>{if(/^\d{4}-\d{2}-\d{2}$/.test(String(value||'').slice(0,10)))return String(value).slice(0,10);const date=new Date(value||0);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)};
  function shift(date,days){const value=new Date(`${date}T12:00:00+08:00`);value.setDate(value.getDate()+days);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(value)}
  function at(date,minutes){const hour=String(Math.floor(minutes/60)).padStart(2,'0'),minute=String(minutes%60).padStart(2,'0');return `${date}T${hour}:${minute}:00+08:00`}
  function weekOf(value=new Date()){
    const selected=dateKey(value)||dateKey(new Date()),date=new Date(`${selected}T12:00:00+08:00`),jsDay=new Date(`${selected}T12:00:00Z`).getUTCDay(),day=(jsDay+6)%7,start=jsDay===0?shift(selected,1):shift(selected,-day),end=shift(start,5),rewardEndDate=shift(start,CYCLE.rewardEndDayOffset),year=Number(start.slice(0,4));
    return {kpiCycle:CYCLE.id,rewardPolicyVersion:CYCLE.rewardPolicyVersion,weekStart:start,weekEnd:end,year,weekKey:`${start}_${end}`,label:`${formatDate(start)} – ${formatDate(end)}`,cutoffAt:at(end,CYCLE.cutoffMinutes),rewardStart:at(end,CYCLE.rewardStartMinutes),rewardEnd:at(rewardEndDate,CYCLE.rewardEndMinutes)};
  }
  function rewardWeekOf(value=new Date()){const parts=jakartaClock(value),selected=parts.day==='ahad'?shift(parts.date,-1):parts.date;return weekOf(selected)}
  function formatDate(value){const date=new Date(`${String(value).slice(0,10)}T12:00:00+08:00`);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
  function jakartaClock(value=new Date()){const date=value instanceof Date?value:new Date(value),parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:CYCLE.timezone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part=>[part.type,part.value])),days={Sun:'ahad',Mon:'senin',Tue:'selasa',Wed:'rabu',Thu:'kamis',Fri:'jumat',Sat:'sabtu'};return{date:`${parts.year}-${parts.month}-${parts.day}`,day:days[parts.weekday],minutes:Number(parts.hour)*60+Number(parts.minute)}}
  function inWeek(row,week){const raw=row?.tanggal||row?.date||row?.createdAt||row?.timestamp||row?.updatedAt,d=dateKey(raw);if(!d||d<week.weekStart||d>week.weekEnd)return false;if(d!==week.weekEnd||/^\d{4}-\d{2}-\d{2}$/.test(String(raw||'')))return true;const clock=jakartaClock(raw);return clock.date!==week.weekEnd||clock.minutes<=CYCLE.cutoffMinutes}
  function canClose(week,value=new Date()){return new Date(value).getTime()>=new Date(week.cutoffAt).getTime()}
  function inRewardWindow(value=new Date(),week=rewardWeekOf(value)){const time=new Date(value).getTime();return time>=new Date(week.rewardStart).getTime()&&time<new Date(week.rewardEnd).getTime()}
  const average=list=>{const nums=list.map(Number).filter(Number.isFinite);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function scoreOperational(role,metrics={}){
    const config=CONFIG[role],applicable=config.operational.filter(([id])=>Number.isFinite(numericMetric(metrics[id]))),weight=applicable.reduce((sum,item)=>sum+item[2],0),items=config.operational.map(([id,label,max])=>{const source=metrics[id],raw=numericMetric(source);return{id,label,max,value:Number.isFinite(raw)?clamp(raw,0,100):null,detail:source?.detail||'',source:source?.source||'',notApplicable:!Number.isFinite(raw)}});
    const score=weight?applicable.reduce((sum,[id,,max])=>sum+clamp(numericMetric(metrics[id]),0,100)*max/weight,0)*config.operationalMax/100:null;
    return {score:score===null?null:round(score),max:config.operationalMax,items,applicable:applicable.length,total:config.operational.length};
  }
  function observationScore(role,observation){const scores=QUALITY_LABELS[role].map((_,index)=>Number(observation?.scores?.[index]??observation?.scores?.[`i${index+1}`]??observation?.[`quality${index+1}`])).filter(value=>Number.isFinite(value)&&value>=1&&value<=5);return scores.length===5?scores.reduce((a,b)=>a+b,0)/25*CONFIG[role].qualityMax:null}
  function quality(role,observations=[]){const scored=values(observations).map(row=>({...row,computedScore:observationScore(role,row)})).filter(row=>Number.isFinite(row.computedScore)),score=average(scored.map(row=>row.computedScore)),contexts=new Set(scored.map(row=>norm(row.subject||row.program)).filter(Boolean)),complete=role==='NAQIB'?scored.length>=CONFIG[role].qualityTarget&&contexts.size>=CONFIG[role].qualityTarget:scored.length>=CONFIG[role].qualityTarget;return{score:score===null?null:round(score),max:CONFIG[role].qualityMax,count:scored.length,distinctContexts:contexts.size,target:CONFIG[role].qualityTarget,complete,records:scored}}
  function exemplary(record){const scores=EXEMPLARY_LABELS.map((_,index)=>Number(record?.scores?.[index]??record?.scores?.[`i${index+1}`]??record?.[`example${index+1}`])).filter(value=>Number.isFinite(value)&&value>=1&&value<=4);return{score:scores.length===5?scores.reduce((a,b)=>a+b,0):null,max:20,complete:scores.length===5,scores}}
  function calculate(role,{operational={},observations=[],exemplaryRecord=null,criticalFailures=[],closure=null,reward=null}={}){
    const op=scoreOperational(role,operational),q=quality(role,observations),ex=exemplary(exemplaryRecord),critical=values(criticalFailures).filter(row=>row.active!==false),ready=Number.isFinite(op.score)&&q.complete&&ex.complete,total=ready?round(op.score+q.score+ex.score):null,reasons=[];
    if(!q.complete)reasons.push(role==='NAQIB'?`Observasi kualitas baru ${q.count}/${q.target} dan harus pada program berbeda.`:`Observasi kualitas baru ${q.count}/${q.target}.`);
    if(!ex.complete)reasons.push('Keteladanan belum dinilai lengkap.');
    if(Number.isFinite(total)&&total<90)reasons.push('Total KPI belum mencapai 90/100.');
    if(Number.isFinite(q.score)&&q.score<CONFIG[role].qualityMinimum)reasons.push(`${role==='GURU'?'Kualitas Pembelajaran':'Kualitas Program'} belum mencapai minimum ${CONFIG[role].qualityMinimum}/${CONFIG[role].qualityMax}.`);
    if(Number.isFinite(ex.score)&&ex.score<16)reasons.push('Keteladanan belum mencapai minimum 16/20.');
    if(critical.length)reasons.push('Terdapat Critical Failure pada pekan ini.');
    const qualified=ready&&total>=90&&q.score>=CONFIG[role].qualityMinimum&&ex.score>=16&&!critical.length,closed=Boolean(closure?.closedAt),rewardEligible=closed&&Boolean(reward?.rewardEligible??qualified),status=!ready?'BELUM_LENGKAP':closed?'CLOSED':'SIAP_DITUTUP';
    if(ready&&!closed)reasons.unshift('KPI belum ditutup oleh Manajer pada Sabtu siang.');
    if(reward?.status==='CANCELLED_BY_OPERATION')reasons.unshift(`Hak Libur dibatalkan karena kebutuhan operasional: ${reward.cancelledReason||'alasan tercatat pada histori reward'}.`);
    return {kpiVersion:VERSION,kpiCycle:CYCLE.id,role,operational:op,quality:q,exemplary:ex,total,max:100,ready,closed,status,criticalFailures:critical,qualified,rewardEligible,rewardStatus:reward?.status||'',rewardReason:rewardEligible?'Seluruh syarat Hak Libur Pilihan terpenuhi.':reasons.join(' ')||'Belum memenuhi syarat Hak Libur Pilihan.'};
  }
  function basePath(role,personKey,weekKey){return `madani_app/academic/weekly_kpi/${String(role).toLowerCase()}/${key(personKey)}/${weekKey}`}
  function rewardRecord(result,week,person={},actor={},now=new Date()){
    const eligible=Boolean(result.qualified);return{kpiVersion:VERSION,kpiCycle:CYCLE.id,rewardPolicyVersion:CYCLE.rewardPolicyVersion,weekKey:week.weekKey,personId:String(person.id||person.code||person.key||''),personKey:key(person.key||person.name),personName:person.name||'',unit:person.unit||'',totalKpi:result.total,qualityScore:result.quality.score,roleModelScore:result.exemplary.score,criticalFailure:result.criticalFailures.length>0,rewardEligible:eligible,rewardStart:week.rewardStart,rewardEnd:week.rewardEnd,status:eligible?'EARNED':'NOT_ELIGIBLE',decidedAt:new Date(now).toISOString(),decidedByUid:actor.uid||actor.id||'',decidedByName:actor.name||actor.label||''}
  }
  function summary(result,week,person={}){return{kpiVersion:VERSION,kpiCycle:CYCLE.id,rewardPolicyVersion:CYCLE.rewardPolicyVersion,role:result.role,personKey:key(person.key||person.name),personName:person.name||'',unit:person.unit||'',weekStart:week.weekStart,weekEnd:week.weekEnd,year:week.year,weekKey:week.weekKey,cutoffAt:week.cutoffAt,rewardStart:week.rewardStart,rewardEnd:week.rewardEnd,operationalScore:result.operational.score,qualityScore:result.quality.score,qualityObservationCount:result.quality.count,exemplaryScore:result.exemplary.score,total:result.total,status:result.status,rewardEligible:result.rewardEligible,rewardReason:result.rewardReason,criticalFailureCount:result.criticalFailures.length,updatedAt:new Date().toISOString()}}
  const round=value=>Math.round(value*10)/10;
  const WeeklyKpi=Object.freeze({VERSION,CYCLE,CONFIG,QUALITY_LABELS,EXEMPLARY_LABELS,norm,key,values,dateKey,shift,at,weekOf,rewardWeekOf,formatDate,jakartaClock,inWeek,canClose,inRewardWindow,average,scoreOperational,observationScore,quality,exemplary,calculate,basePath,rewardRecord,summary});

export default WeeklyKpi;
