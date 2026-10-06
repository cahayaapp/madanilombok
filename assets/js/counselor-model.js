// Workflow reference: fajrulislam/js/counselor-case-v2.js. Uses Madani IDs only.
export const CASE_POINTS={BIMBINGAN:0,RINGAN:-25,SEDANG:-50,BERAT:-100,KRITIS:-200};
export const FINAL_CASE_STATES=['selesai','tidak_terbukti'];
const norm=v=>String(v||'').toUpperCase();
export function counselorLevel(profile={}){return norm(profile.counselorLevel||profile.assignments?.konselor?.counselorLevel||'PEMULA')==='MADYA'?'MADYA':'PEMULA';}
export function routeCounselorCase(record,nearby=[]){
 const category=norm(record.category),severity=norm(record.severity),code=norm(record.violationCode||record.category);
 if(category.includes('MORAL')||category.includes('ETIKA'))return {level:'MADYA',reason:'MORAL'};
 if(['BERAT','KRITIS'].includes(severity))return {level:'MADYA',reason:severity};
 if(record.escalationTarget==='konselor_madya')return {level:'MADYA',reason:'MANUAL_ESCALATION'};
 const dates=new Set(nearby.filter(r=>r.studentId===record.studentId&&norm(r.violationCode||r.category)===code).map(r=>r.date));
 const shift=n=>{const d=new Date(`${record.date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-n);return Number.isNaN(+d)?'':d.toISOString().slice(0,10);};
 if(record.date&&dates.has(record.date)&&dates.has(shift(1))&&dates.has(shift(2)))return {level:'MADYA',reason:'THREE_CONSECUTIVE_DAYS'};
 return {level:'PEMULA',reason:'ROUTINE'};
}
export function assertCaseOwner(record,session){
 if(!record||FINAL_CASE_STATES.includes(record.status))throw Error('Kasus tidak tersedia atau sudah ditutup.');
 if(record.assignedCounselorUid!==session.user.uid)throw Error('Kasus bukan tanggung jawab Konselor aktif ini.');
 if(session.activeRole!=='konselor')throw Error('Penanganan formal harus melalui role Konselor.');
}
export function applyCaseOperation(current,operation,session,now){
 if(!current)throw Error('Kasus tidak ditemukan.');
 if(current.handlingRole==='wali_kelas')throw Error('Kasus SD ditangani Wali Kelas.');
 if(current.operations?.[operation.id]){if(current.operations[operation.id].actorUid!==session.user.uid)throw Error('Operasi milik petugas lain.');return current;}
 const r=structuredClone(current),d=operation.data||{},uid=session.user.uid;
 if(operation.type==='response'){
  const request=r.higherEscalation;
  if(!request||request.response||request.targetRole!==session.activeRole||!['director','deputy_director'].includes(session.activeRole))throw Error('Tidak ada permintaan arahan aktif untuk role ini.');
  if(!d.instruction?.trim()||(session.activeRole==='director'&&!d.decision?.trim()))throw Error('Lengkapi arahan dan keputusan pimpinan.');
  request.response={...d,actorUid:uid,at:now};r.status='ditangani';
 }else{
  assertCaseOwner(r,session);
  if(r.higherEscalation&&!r.higherEscalation.response)throw Error('Menunggu tanggapan pimpinan.');
  if(r.status==='eskalasi_diperlukan'&&operation.type!=='escalation')throw Error('Temuan berat/moral memerlukan eskalasi ke Madya.');
  if(operation.type==='tabayyun'){
   if(!d.date||!d.studentStatement?.trim()||!d.facts?.trim()||!['TERBUKTI','TIDAK TERBUKTI','BELUM CUKUP BUKTI'].includes(d.conclusion))throw Error('Isi pernyataan santri, fakta, dan kesimpulan tabayyun.');
   const values=['niat','frekuensi','dampak','kondisi'].map(k=>Number(d[k]||0));if(values.some(v=>!Number.isFinite(v)||v<0))throw Error('NFDK tidak valid.');const score=values.reduce((a,b)=>a+b,0),severity=score>=7?'KRITIS':score>=5?'BERAT':score>=2?'SEDANG':'RINGAN';
   r.tabayyun={...d,nfdk:{score,severity},counselorUid:uid,at:now};r.tabayyunHistory={...r.tabayyunHistory,[operation.id]:r.tabayyun};
   r.status=d.conclusion==='TIDAK TERBUKTI'?'tidak_terbukti':'tabayyun';
   if(r.status!=='tidak_terbukti'&&counselorLevel(session.profile)==='PEMULA'&&(['MORAL','BERAT','KRITIS'].includes(d.discoveredSeverity)||score>=5))r.status='eskalasi_diperlukan';
  }else if(operation.type==='evaluation'){
   if(!['evaluasi','konsekuensi','konseling'].includes(r.status)||!d.result?.trim()||!['LANJUTKAN','SELESAI'].includes(d.decision))throw Error('Lengkapi hasil evaluasi dan keputusan tindak lanjut.');
   r.evaluation={...d,counselorUid:uid,at:now};r.evaluationHistory={...r.evaluationHistory,[operation.id]:r.evaluation};r.status=d.decision==='SELESAI'?'selesai':'konseling';
  }else if(operation.type==='session'){
   if(!d.clarification?.trim()||!d.date)throw Error('Tanggal dan hasil tabayyun wajib diisi.');
   const steps={ditangani:['ditangani','tabayyun','tidak_terbukti'],tabayyun:['tabayyun','konseling','tidak_terbukti'],konseling:['konseling','konsekuensi','evaluasi'],konsekuensi:['konsekuensi','evaluasi'],evaluasi:['evaluasi','konseling','selesai'],dieskalasi:['tabayyun','konseling']};
   if(!(steps[r.status]||[]).includes(d.caseStatus))throw Error('Tahap berikutnya belum sesuai alur kasus.');
   if(d.caseStatus==='selesai'&&!d.evaluation?.trim())throw Error('Hasil evaluasi wajib diisi sebelum menutup kasus.');
   r.sessions={...r.sessions,[operation.id]:{...d,counselorUid:uid,createdAt:now}};r.status=d.caseStatus;
  }else if(operation.type==='action'){
   if(!['konseling','konsekuensi','evaluasi'].includes(r.status)||!d.actionType?.trim()||!d.description?.trim())throw Error('Selesaikan tabayyun dan konseling sebelum tindakan edukatif.');
   r.actions={...r.actions,[operation.id]:{...d,counselorUid:uid,createdAt:now}};r.status='konsekuensi';
  }else if(operation.type==='points'){
   if(r.finalPointTransactionId)throw Error('Poin final kasus sudah tercatat.');
   if(!['konsekuensi','evaluasi'].includes(r.status))throw Error('Poin difinalisasi setelah konseling dan tindakan edukatif.');
   if(!Object.values(CASE_POINTS).includes(Number(d.points))||!d.description?.trim())throw Error('Pilih poin sesuai klasifikasi dan isi keterangan.');
   r.finalPointTransactionId=operation.id;r.finalPoints=Number(d.points);r.pointsFinalizedAt=now;r.pointsFinalizedBy=uid;
   r.pointRecord={...d,points:Number(d.points),studentId:r.studentId,counselorUid:uid,createdAt:now,type:'final_case'};r.status='evaluasi';
  }else if(operation.type==='escalation'){
   if(!d.summary?.trim())throw Error('Ringkasan kebutuhan keputusan wajib diisi.');
   const level=counselorLevel(session.profile);
   if(level==='PEMULA'){
    if(d.targetLevel!=='konselor_madya')throw Error('Konselor Pemula mengeskalasi kepada Konselor Madya.');
    r.previousCounselorUid=uid;r.assignedCounselorUid=null;r.routeLevel='MADYA';r.escalationTarget='konselor_madya';r.status='dieskalasi';
   }else{
    if(!['director','deputy_director'].includes(d.targetLevel)||!d.decisionNeeded?.trim())throw Error('Pilih tujuan pimpinan dan jelaskan keputusan yang dibutuhkan.');
    r.higherEscalation={targetRole:d.targetLevel,summary:d.summary,decisionNeeded:d.decisionNeeded,requestedBy:uid,requestedAt:now};r.status='dieskalasi';
   }
   r.escalations={...r.escalations,[operation.id]:{...d,actorUid:uid,at:now}};
  }else throw Error('Operasi kasus tidak dikenal.');
 }
 r.operations={...r.operations,[operation.id]:{type:operation.type,actorUid:uid,at:now}};
 r.history={...r.history,[operation.id]:{from:current.status,to:r.status,type:operation.type,actorUid:uid,actorName:session.profile?.name||'',at:now}};
 return r;
}
