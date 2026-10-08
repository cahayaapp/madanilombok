export const LEAVE_TYPES=['Sakit','Keperluan keluarga','Keperluan pribadi','Tugas dinas','Lainnya'];
export const LEAVE_REVIEWERS=['admin','super_admin','director','deputy_director'];
export function validateLeave(d){
 for(const k of ['startDate','endDate'])if(!/^\d{4}-\d{2}-\d{2}$/.test(d[k]||'')||!Number.isFinite(Date.parse(d[k]+'T00:00:00Z'))||new Date(d[k]+'T00:00:00Z').toISOString().slice(0,10)!==d[k])throw Error('Tanggal izin tidak valid.');
 for(const k of ['startTime','endTime'])if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d[k]||''))throw Error('Jam izin tidak valid.');
 const start=Date.parse(d.startDate+'T'+d.startTime+':00Z'),end=Date.parse(d.endDate+'T'+d.endTime+':00Z');
 if(end<=start||end-start>366*86400000)throw Error('Akhir izin harus setelah awal izin, maksimal 366 hari.');
 if(!LEAVE_TYPES.includes(d.type))throw Error('Pilih jenis izin.');
 for(const [k,label,max]of [['reason','Alasan',2000],['handover','Rencana pengganti / tugas siswa',2000],['contact','Kontak selama izin',100]])if(!d[k]?.trim()||d[k].length>max)throw Error(label+' wajib diisi dan tidak boleh terlalu panjang.');
 return {...d,reason:d.reason.trim(),handover:d.handover.trim(),contact:d.contact.trim()};
}
export function affectedLessons(d,schedules){
 validateLeave(d);const result=[],days=['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
 for(let t=Date.parse(d.startDate+'T00:00:00Z');t<=Date.parse(d.endDate+'T00:00:00Z');t+=86400000){const dt=new Date(t),date=dt.toISOString().slice(0,10);for(const s of schedules){if(s.isExample||s.assignmentConfirmed===false||s.day!==days[dt.getUTCDay()])continue;if(date===d.startDate&&s.endTime<=d.startTime||date===d.endDate&&s.startTime>=d.endTime)continue;result.push({date,scheduleId:s.id,startTime:s.startTime,endTime:s.endTime,classId:s.classId||'',classIds:s.classIds||s.combinedClassIds||[s.classId||''],groupId:s.groupId||'',subjectId:s.subjectId||''});}}
 return result;
}
export function leaveDecision(request,existing,actor,status,note){
 if(existing)throw Error('Pengajuan sudah diproses. Muat ulang halaman.');
 const own=request.teacherUid===actor.uid;
 if(status==='cancelled'){if(!own)throw Error('Hanya pengaju yang dapat membatalkan.');}
 else if(!['approved','rejected'].includes(status)||own||!LEAVE_REVIEWERS.includes(actor.role))throw Error('Anda tidak berwenang memutuskan pengajuan ini.');
 if(!note?.trim()||note.length>1000)throw Error('Catatan keputusan wajib diisi (maksimal 1.000 karakter).');
 return {status,note:note.trim(),actorUid:actor.uid,actorName:actor.name||'',decidedAt:Date.now()};
}
