const norm=v=>String(v||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
// A source roster supplies the room; identity must match the master before any repair.
export function reconcileRooms(pkg,students,rooms,assignments){
 const patch={},results=[],claimed=new Set();
 for(const row of pkg.rows){
  const candidates=Object.entries(students).filter(([,s])=>!s.mergedInto&&s.status==='active'&&(row.nisn&&String(s.nisn||s.studentNo||'')===row.nisn||norm(s.name)===norm(row.name)));
  const result={name:row.name,roomId:row.roomId};results.push(result);
  if(candidates.length!==1){result.status=candidates.length?'Identitas ganda':'Identitas belum ditemukan';continue;}
  const [id,s]=candidates[0];result.studentId=id;
  if(claimed.has(id)){throw Error('Santri muncul dua kali dalam paket: '+row.name);}claimed.add(id);
  if(s.unitId!==row.unitId||(s.gender&&s.gender!==row.gender)||(row.nisn&&s.nisn&&String(s.nisn)!==row.nisn)){result.status='Identitas perlu diperiksa';continue;}
  if(!rooms[row.roomId]||rooms[row.roomId].status==='inactive'){result.status='Kamar tidak aktif/tersedia';continue;}
  const old=assignments[id];
  if(old?.roomId&&old.status!=='inactive'&&old.roomId!==row.roomId){result.status='Penempatan berbeda — dipertahankan';result.currentRoomId=old.roomId;continue;}
  let changed=false;
  if(!old?.roomId||old.status==='inactive'){
   patch[`assignments/rooms/${pkg.academicYearId}/${id}`]={...(old||{}),studentId:id,academicYearId:pkg.academicYearId,roomId:row.roomId,status:'active',source:row.source,sourceName:row.sourceName,reconciliationId:pkg.id};changed=true;
  }
  if(s.boardingStatus!=='boarding'){patch[`students/${id}/boardingStatus`]='boarding';changed=true;}
  if(!s.gender){patch[`students/${id}/gender`]=row.gender;changed=true;}
  result.status=changed?'Siap diperbaiki':'Sudah sesuai';
 }
 return {patch,results};
}
