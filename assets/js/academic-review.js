export function examRevisionChanges(record,reason,actorUid,now){
 if(!record||record.stage!=='FINAL')throw Error('Sesi nilai belum final atau sudah dibuka untuk revisi.');
 if(!reason?.trim())throw Error('Alasan revisi wajib diisi.');
 const history={...record.revision?.history,[String(now)]:{reason:reason.trim(),requestedBy:actorUid,at:now}};
 return {stage:'DRAFT',version:(record.version||0)+1,revision:{status:'OPEN',reason:reason.trim(),requestedBy:actorUid,requestedAt:now,history}};
}
export function revisionForGradeSave(saved,stage,actorUid,now){return saved?.revision?{...saved.revision,status:stage==='FINAL'?'RESOLVED':'OPEN',...(stage==='FINAL'?{resolvedBy:actorUid,resolvedAt:now}:{})}:null;}
