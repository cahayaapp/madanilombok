export function naqibLeaveGender(role,profile,duty){
 if(role==='head_boys_dorm')return 'L';if(role==='head_girls_dorm')return 'P';
 if(role==='naqib'&&duty?.active&&['L','P'].includes(duty.gender))return duty.gender;
 throw Error('Penugasan unit Naqib belum tersedia.');
}
export function naqibDecision(request,actor,status,note){
 if(request.decision)throw Error('Pengajuan sudah diproses. Muat ulang.');
 if(status==='cancelled'?actor.uid!==request.ownerUid:!['approved','rejected'].includes(status)||actor.uid===request.ownerUid||!['head_boys_dorm','head_girls_dorm'].includes(actor.role)||actor.gender!==request.gender)throw Error('Pengajuan di luar kewenangan Anda.');
 if(!note?.trim()||note.length>1000)throw Error('Catatan keputusan wajib diisi, maksimal 1.000 karakter.');
 return {status,note:note.trim(),actorUid:actor.uid,actorName:actor.name||'',decidedAt:Date.now()};
}
