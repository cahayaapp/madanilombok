import {getNode,bulkPatchRoot} from './repository.js';
export function sdMentorRolePatch(classes,staff,users){
 const patch={},ids=[...new Set(Object.values(classes).filter(c=>c.unitId==='UNIT-SD'&&c.status!=='inactive').map(c=>c.homeroomStaffId).filter(Boolean))];
 for(const id of ids){
  if(!staff[id]||staff[id].status==='inactive')throw Error('Wali Kelas SD belum tersedia atau nonaktif: '+id);
  patch[`staff/${id}/appRoles`]=[...new Set([...(staff[id].appRoles||[]),'guru_wali'])];
 }
 let accounts=0;
 for(const [uid,u]of Object.entries(users))if(ids.includes(u.staffId)&&u.active!==false&&!u.accessRevoked){
  const roles=[...new Set([u.role,...(Array.isArray(u.roles)?u.roles:Object.keys(u.roles||{}).filter(r=>u.roles[r])),...Object.keys(u.roleFlags||{}).filter(r=>u.roleFlags[r]),'guru_wali'].filter(Boolean))];
  patch[`users/${uid}/roles`]=roles;patch[`users/${uid}/roleFlags/guru_wali`]=true;patch[`users/${uid}/accessVersion`]=(u.accessVersion||0)+1;accounts++;
 }
 return {patch,accounts,teachers:ids.length};
}
export async function renderSdMentorUpdate(host,session){
 host.innerHTML='<h3>Guru Wali SD = Wali Kelas</h3><p>Santri binaan SD otomatis mengikuti Wali Kelas pada rombel aktif. Aktifkan role Guru Wali pada akun Wali Kelas SD yang sudah ada.</p><button class="btn btn-primary">Terapkan Guru Wali SD</button><p role="status"></p>';
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');button.onclick=async()=>{button.disabled=true;try{
 const [classes,staff,users]=await Promise.all(['classes','staff','users'].map(getNode));const {patch,accounts,teachers}=sdMentorRolePatch(classes||{},staff||{},users||{});
 if(!teachers)throw Error('Belum ada Wali Kelas SD yang ditetapkan.');
 await bulkPatchRoot(patch,session.user.uid,'sd-mentor-homeroom');status.textContent=`Berhasil: ${teachers} Wali Kelas SD, ${accounts} akun aktif mendapat role Guru Wali. Daftar binaan mengikuti penempatan kelas terbaru. Masuk ulang untuk memuat role.`;
 }catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
}
