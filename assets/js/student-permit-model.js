export const PERMIT_TYPES={
 'Orang Tua Meninggal Dunia':72,
 'Kakek/Nenek, Paman/Bibi, atau Saudara Kandung Meninggal':24,
 'Menjenguk Orang Tua Sakit Keras':24,
 'Menjenguk Kakek/Nenek, Paman/Bibi, atau Saudara Kandung Sakit Keras':12,
 'Kontrol / Medical Check Up':24,
 'Walimatul Ursy Orang Tua atau Saudara Kandung':24,
 'Pengantaran Haji / Umrah Keluarga Inti':24,
 'Kelahiran / Aqiqah Saudara Kandung':24
};
export function permitTime(value){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||''))throw Error('Tanggal dan jam tidak valid.');const n=Date.parse(value+':00+08:00');if(!Number.isFinite(n)||new Date(n+28800000).toISOString().slice(0,16)!==value)throw Error('Tanggal dan jam tidak valid.');return n;}
export function validatePermit(d){const startAt=permitTime(d.startDate),endAt=permitTime(d.endDate),max=PERMIT_TYPES[d.type];if(!max)throw Error('Pilih jenis izin.');if(endAt<=startAt||endAt-startAt>max*3600000)throw Error(`Rencana kembali harus setelah keluar, maksimal ${max} jam.`);if(d.type==='Kontrol / Medical Check Up'&&d.startDate.slice(0,10)!==d.endDate.slice(0,10))throw Error('Kontrol wajib kembali pada hari yang sama.');for(const key of ['reason','destination','pickup','relation','phone'])if(!d[key]?.trim()||d[key].length>2000)throw Error('Lengkapi alasan, tujuan dan data penjemput (maksimal 2.000 karakter per kolom).');return {...d,startAt,endAt};}
export function permitDorm(master,studentId){const room=master.rooms?.find(r=>r.id===master.roomAssignments?.[studentId]?.roomId);if(!room||room.status==='inactive'||!['DORM-PUTRA','DORM-PUTRI'].includes(room.dormitoryId))throw Error('Penempatan asrama santri belum lengkap. Hubungi administrator.');return room.dormitoryId;}
export function reviewerDorm(role){return {head_boys_dorm:'DORM-PUTRA',head_girls_dorm:'DORM-PUTRI'}[role]||null;}
export function permitTransition(record,actor,status,note,actualReturn){if(!reviewerDorm(actor.role)||reviewerDorm(actor.role)!==record.dormitoryId||actor.uid===record.parentUid)throw Error('Pengajuan bukan kewenangan kepala asrama ini.');if(!note?.trim()||note.length>2000)throw Error('Catatan wajib diisi, maksimal 2.000 karakter.');const common={actorUid:actor.uid,actorName:actor.name||'',note:note.trim(),createdAt:Date.now()};if(['approved','rejected'].includes(status)){if(record.decision)throw Error('Pengajuan sudah diputuskan.');return {path:'decision',value:{...common,status}};}if(status==='returned'){if(record.decision?.status!=='approved'||record.returned)throw Error('Izin belum disetujui atau sudah selesai.');const actualAt=permitTime(actualReturn);if(actualAt<record.startAt||actualAt>Date.now())throw Error('Waktu kembali aktual tidak valid.');return {path:'returned',value:{...common,actualAt,actualReturn,late:actualAt>record.endAt}};}throw Error('Status tidak dikenal.');}
