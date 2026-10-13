export const GIRLS_ROOM_UPDATE='confirmed-girls-rooms-20261011';
export const GIRLS_YEAR='TA-2026-2027-GANJIL';
export const GIRLS_PAIRS=[
 {id:'AMD-SMK-0083',name:'Lukiana Jannatul Makwa',unit:'UNIT-SMK',aliases:['Lukina Jannatul Makwa'],room:'ROOM-PTRI-M3'},
 {id:'AMD-SMK-0084',name:'Restu Indira Apridarsi',unit:'UNIT-SMK',aliases:['Restu Indira Afriadarsi','Restu Indira Afriadarsih'],room:'ROOM-PTRI-M3'},
 {id:'AMD-SMK-0081',name:'Tazia Olivia',unit:'UNIT-SMK',aliases:['Tazzia Olipia'],room:'ROOM-PTRI-P1'},
 {id:'AMD-SD-0114',name:'FEBY EFRILLIA',unit:'UNIT-SD',aliases:['Feby Aprilia'],room:'ROOM-PTRI-P1'},
 {id:'AMD-SMK-0031',name:'HIDAYATUL NAZURA',unit:'UNIT-SMK',aliases:['Huriatun Nazura','Hidayatul Naura'],room:'ROOM-PTRI-P2'},
 {id:'AMD-SMP-0086',name:'SALSABILA',unit:'UNIT-SMP',aliases:[],room:'ROOM-PTRI-M1'}
];
export const NON_BOARDING_SD={
 'AMD-SD-0111':'AISYAH NUHA ZAHIRA','AMD-SD-0036':'FARADIBA SATRIA NUGRAHA','AMD-SD-0096':'HAFIZA FADILA ZAHRA','AMD-SD-0124':'HANIFA HUMAERA SALSABILA','AMD-SD-0115':'HILYA NURUL AZKIA','AMD-SD-0118':'NAJIHA AMALINA','AMD-SD-0128':'SABILA AZIZAH','AMD-SD-0101':'SYAIMA ATQIYA'
};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function girlsRoomPatch({students,rooms,assignments}){
 const patch={},summary=[];const year=GIRLS_YEAR;
 for(const row of GIRLS_PAIRS){
  const target=students[row.id];
  if(!target||norm(target.name)!==norm(row.name)||target.unitId!==row.unit||target.status!=='active'||target.mergedInto)throw Error('Identitas utama perlu diperiksa: '+row.name);
  if(!rooms[row.room]||rooms[row.room].status==='inactive')throw Error('Kamar tidak tersedia: '+row.room);
  const aliases=new Set([row.name,...row.aliases].map(norm));
  const sources=Object.entries(students).filter(([id,s])=>id!==row.id&&aliases.has(norm(s.name)));
  for(const [id,s]of sources){
   if(s.unitId!==(row.sourceUnit||row.unit)||(s.mergedInto&&s.mergedInto!==row.id))throw Error('Identitas duplikat perlu diperiksa: '+s.name);
   patch[`students/${id}/status`]='inactive';patch[`students/${id}/mergedInto`]=row.id;
   patch[`students/${row.id}/confirmedAliases/${id}`]=s.name;
   for(const kind of ['rooms','classes','mentors'])if(assignments[kind]?.[id])patch[`assignments/${kind}/${year}/${id}/status`]='inactive';
   // Preserve canonical school. Transfer the confirmed mentor only if absent.
   if(!assignments.mentors?.[row.id]&&assignments.mentors?.[id]&&!patch[`assignments/mentors/${year}/${row.id}`])patch[`assignments/mentors/${year}/${row.id}`]={...assignments.mentors[id],studentId:row.id,status:'active'};
   for(const [gid,members]of Object.entries(assignments.groups||{}))if(members[id]){
    const dest=`assignments/groups/${year}/${gid}/${row.id}`;
    if(!members[row.id]&&!patch[dest])patch[dest]=typeof members[id]==='object'?{...members[id],studentId:row.id}:members[id];
    patch[`assignments/groups/${year}/${gid}/${id}`]=null;
   }
  }
  row.aliases.forEach((alias,i)=>{patch[`students/${row.id}/confirmedAliases/room-confirmation-${i}`]=alias;});
  patch[`students/${row.id}/boardingStatus`]='boarding';
  patch[`assignments/rooms/${year}/${row.id}`]={...(assignments.rooms?.[row.id]||{}),studentId:row.id,academicYearId:year,roomId:row.room,status:'active',source:GIRLS_ROOM_UPDATE};
  summary.push(`${row.name}: ${sources.length} record duplikat, ${rooms[row.room].name}`);
 }
 for(const [id,name]of Object.entries(NON_BOARDING_SD)){
  const s=students[id];if(!s||norm(s.name)!==norm(name)||s.unitId!=='UNIT-SD'||s.mergedInto)throw Error('Identitas SD perlu diperiksa: '+name);
  patch[`students/${id}/boardingStatus`]='non_boarding';
  if(assignments.rooms?.[id])patch[`assignments/rooms/${year}/${id}/status`]='inactive';
 }
 return {patch,summary};
}
