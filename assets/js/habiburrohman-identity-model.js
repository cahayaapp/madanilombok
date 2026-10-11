export const HABIB_SOURCE='AMD-SMP-0029',HABIB_TARGET='AMD-SMK-0028';
export function habibIdentityPatch({source,target,room,targetRoom,school,mentor,groups,year}){
 const from=HABIB_SOURCE,to=HABIB_TARGET,p={};
 if(source?.name!=='HABIBURRAHMAN'||source.unitId!=='UNIT-SMP'||target?.unitId!=='UNIT-SMK'||target.nisn!=='0103305545'||target.status!=='active')throw Error('Identitas master berubah. Periksa kembali sebelum penggabungan.');
 if(source.mergedInto&&source.mergedInto!==to)throw Error('Duplikat sudah ditautkan ke identitas lain.');
 if(room?.roomId&&room.roomId!=='ROOM-PTR-C3')throw Error('Kamar sumber berbeda dari Cordova 3.');
 if(targetRoom?.roomId&&targetRoom.status!=='inactive'&&targetRoom.roomId!=='ROOM-PTR-C3')throw Error('Siswa SMK sudah memiliki kamar berbeda.');
 p[`students/${from}/status`]='inactive';p[`students/${from}/mergedInto`]=to;
 p[`students/${to}/confirmedAliases/${from}`]=source.name;
 p[`students/${to}/boardingStatus`]='boarding';
 p[`assignments/rooms/${year}/${to}`]={...(targetRoom||room||{}),studentId:to,academicYearId:year,roomId:'ROOM-PTR-C3',status:'active',identityCorrection:'habiburrohman-20261011'};
 if(room)p[`assignments/rooms/${year}/${from}/status`]='inactive';
 if(school)p[`assignments/classes/${year}/${from}/status`]='inactive';
 if(mentor)p[`assignments/mentors/${year}/${from}/status`]='inactive';
 for(const [gid,members]of Object.entries(groups||{}))if(members?.[from]){
  if(!members[to])p[`assignments/groups/${year}/${gid}/${to}`]=typeof members[from]==='object'?{...members[from],studentId:to}:members[from];
  p[`assignments/groups/${year}/${gid}/${from}`]=null;
 }
 return p;
}
