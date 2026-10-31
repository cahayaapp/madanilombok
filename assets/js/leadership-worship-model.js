export const prayers={subuh:'Subuh',dzuhur:'Zuhur',ashar:'Ashar',maghrib:'Maghrib',isya:'Isya'};
export const statuses=['Hadir','Tidak Hadir','Izin','Sakit','Tugas Lembaga'];

export function worshipSummary(data,{yearId,scope,from,to}){
 const rows=[];
 for(const record of Object.values(data||{})){
  if(!record||record.scope!==scope||!['boarding-L','boarding-P'].includes(scope)||
   (record.academicYearId&&record.academicYearId!==yearId)||!record.date||record.date<from||record.date>to||!prayers[record.prayer])continue;
  for(const [staffId,status] of Object.entries(record.attendance||{}))rows.push({staffId,date:record.date,prayer:record.prayer,status:statuses.includes(status)?status:'Belum Diisi'});
 }
 rows.sort((a,b)=>b.date.localeCompare(a.date)||Object.keys(prayers).indexOf(a.prayer)-Object.keys(prayers).indexOf(b.prayer)||a.staffId.localeCompare(b.staffId));
 const counts=Object.fromEntries([...statuses,'Belum Diisi'].map(s=>[s,rows.filter(r=>r.status===s).length]));
 const filled=rows.length-counts['Belum Diisi'];
 return {rows,counts,filled,attendance:filled?Math.round(counts.Hadir/filled*1000)/10:null};
}

