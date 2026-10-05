import {TASK_GROUPS} from './health-rubric.js';
export const DISPOSITIONS=['Kembali ke Kegiatan','Istirahat di UKS','Istirahat di Asrama','Dirujuk ke Fasilitas Kesehatan','Dijemput Wali Santri'];
export const JOURNAL_STATUSES={terlaksana:'Terlaksana',sebagian:'Sebagian',tidak:'Tidak Terlaksana',tidak_berlaku:'Tidak Berlaku'};
export function validateJournal(entries){let active=0;for(const t of TASK_GROUPS.flatMap(g=>g.tasks)){const r=entries[t.id];if(!r||!JOURNAL_STATUSES[r.status])throw Error('Lengkapi status seluruh indikator.');if(r.status!=='terlaksana'&&!r.note?.trim())throw Error('Alasan wajib diisi untuk indikator sebagian, tidak terlaksana, atau tidak berlaku.');if(r.status!=='tidak_berlaku')active++;}if(!active)throw Error('Semua indikator tidak boleh ditandai Tidak Berlaku.');}
export function applyHealthOperation(current,op,actor,now){
 const data=structuredClone(current||{});for(const key of ['stock','transactions','records','journals','permits','learning_memos'])data[key]||={};
 if(!op.id||!actor)throw Error('Identitas operasi tidak tersedia.');
 if(data.transactions[op.id])return data;
 const record={...op.data,createdBy:actor,createdAt:now};
 if(op.type==='stock'){
  const s=record;for(const key of ['name','category','form','unit','batch','expiry','storageUnit','location','storageCondition','date'])if(!s[key]?.trim())throw Error('Lengkapi identitas obat, batch, tanggal, dan penyimpanan.');
  if(!Number.isInteger(s.quantity)||s.quantity<=0||!Number.isInteger(s.minimum)||s.minimum<0)throw Error('Jumlah stok harus bilangan bulat positif; minimum tidak boleh negatif.');if(s.expiry<s.date)throw Error('Obat kedaluwarsa tidak dapat diterima sebagai stok aktif.');if(!s.packagingChecked||!s.expiryChecked)throw Error('Konfirmasi kemasan dan tanggal kedaluwarsa.');
  const old=data.stock[op.stockId];if(old&&['name','batch','expiry','unit','storageUnit'].some(k=>old[k]!==s[k]))throw Error('Identitas batch stok berubah.');data.stock[op.stockId]={...old,...s,quantity:(old?.quantity||0)+s.quantity,createdAt:old?.createdAt||now};
 }else if(op.type==='exam'){
  const r=record;if(!r.studentId||!r.complaint?.trim()||!r.date||!r.time)throw Error('Lengkapi santri, tanggal, waktu, dan keluhan.');if(!['BOLEH_MENGIKUTI','TIDAK_MENGIKUTI'].includes(r.learningStatus))throw Error('Pilih status mengikuti pembelajaran.');if(!DISPOSITIONS.includes(r.disposition))throw Error('Pilih disposisi.');if(r.learningStatus==='TIDAK_MENGIKUTI'&&(!r.restLocation?.trim()||!r.excuseStart||!r.excuseEnd||r.excuseEnd<=r.excuseStart))throw Error('Lengkapi lokasi dan masa berlaku izin sakit.');
  for(const [key,min,max] of [['age',0,150],['weight',0,1000],['temperature',0,100],['pulse',0,500],['respiration',0,300],['oxygen',0,100],['pain',0,10]]){if(r[key]!==undefined&&r[key]!==''&&(!Number.isFinite(Number(r[key]))||Number(r[key])<min||Number(r[key])>max))throw Error('Nilai pemeriksaan '+key+' tidak valid.');}
  const requests=new Map();for(const m of r.medicines||[]){if(!Number.isInteger(m.quantity)||m.quantity<=0||!m.instructions?.trim())throw Error('Isi jumlah obat dan aturan pakai oleh petugas.');requests.set(m.stockId,(requests.get(m.stockId)||0)+m.quantity);}
  for(const [id,quantity]of requests){const s=data.stock[id];if(!s||s.quantity<quantity||s.expiry<r.date||s.storageUnit!==r.storageUnit)throw Error('Stok obat tidak cukup, kedaluwarsa, atau unit penyimpanan tidak sesuai.');s.quantity-=quantity;}
  data.records[r.studentId]||={};data.records[r.studentId][op.id]=record;
  data.learning_memos[r.studentId]||={};data.learning_memos[r.studentId][op.id]={studentId:r.studentId,date:r.date,excusedFromLearning:r.learningStatus==='TIDAK_MENGIKUTI',start:r.excuseStart||'',end:r.excuseEnd||'',restLocation:r.restLocation||'',note:r.teacherMemo||'',examId:op.id};
 }else if(op.type==='journal'){
  validateJournal(record.entries);const old=data.journals[op.recordId];if(old&&old.createdBy!==actor)throw Error('Jurnal dicatat oleh petugas lain.');if((old?.version||0)!==(op.expectedVersion||0))throw Error('Jurnal berubah. Muat ulang sebelum menyimpan.');data.journals[op.recordId]={...record,version:(old?.version||0)+1,createdAt:old?.createdAt||now};
 }else if(op.type==='permit'){
  const exam=data.records[op.studentId]?.[op.examId];if(!exam||!DISPOSITIONS.slice(3).includes(exam.disposition))throw Error('Izin medis hanya dari pemeriksaan rujukan atau penjemputan wali.');if(data.permits[op.examId])return data;
  data.permits[op.examId]={examId:op.examId,studentId:op.studentId,date:exam.date,destination:exam.referralDestination||exam.disposition,companion:exam.companion||'',status:'MENUNGGU_PIMPINAN',createdBy:actor,createdAt:now,history:[{status:'MENUNGGU_PIMPINAN',actor,at:now}]};
 }else if(op.type==='permit-decision'){
  const p=data.permits[op.examId];if(p?.lastOperationId===op.id)return data;if(!p||p.status!=='MENUNGGU_PIMPINAN'||!['DISETUJUI','DITOLAK'].includes(record.status)||!record.note?.trim())throw Error('Keputusan tidak valid atau izin telah diputuskan.');Object.assign(p,{status:record.status,decisionNote:record.note,decidedBy:actor,decidedAt:now,lastOperationId:op.id});p.history.push({status:record.status,note:record.note,actor,at:now});
 }else throw Error('Operasi UKS tidak dikenal.');
 data.transactions[op.id]={type:op.type,actor,at:now,stockId:op.stockId||null,examId:op.examId||null,recordId:op.recordId||null,quantity:op.data?.quantity||null,medicines:op.data?.medicines||[]};return data;
}

/** Compare local Makassar wall-clock strings; no device-timezone conversion. */
export function healthMemoActive(memo,date,time='12:00'){
 if(memo.excusedFromLearning!==true)return false;
 const now=`${date}T${time}`;
 return memo.start&&memo.end?memo.start<=now&&now<memo.end:memo.date===date;
}

/** Correct only Alfa for the examined student/date; keep original evidence for audit. */
export function correctAttendanceFromHealth(current,memo,examId,actor,now){
 if(!current||current.status!=='Alfa'||memo.excusedFromLearning!==true)return current;
 return {...current,status:'Sakit',points:0,originalStatus:current.originalStatus||current.status,healthCorrection:{examId,actorUid:actor,at:now,date:memo.date}};
}
