import {getNode,bulkPatchRoot} from './repository.js';
import {mergeTeachingRoles,groupTeacherIds} from './group-teachers.js';
import {escapeHtml as e} from './utils.js';
export async function renderGroupTeacherUpdate(host,session){
 try{
  const response=await fetch('../seed/imports/group-teacher-links-2026.json');if(!response.ok)throw Error('Paket penautan pembina belum tersedia.');const pack=await response.json();
  host.innerHTML=`<h3>Sinkronisasi Pembina & Guru Bahasa Arab</h3><p>${pack.links.length} kelompok siap ditautkan ke SDM dan akun guru. ${pack.pending.length} kelompok masih menunggu kepastian identitas pembina.</p><button class="btn btn-primary">Terapkan Sinkronisasi Guru</button><p role="status"></p>`;
  const button=host.querySelector('button'),status=host.querySelector('[role="status"]');
  button.onclick=async()=>{button.disabled=true;try{
   if(await getNode(`settings/imports/${pack.id}`)){status.textContent='Sinkronisasi sudah diterapkan.';return;}
   const changes={},staffMap=new Map(),assignments={};
   for(const link of pack.links){
    const group=await getNode(`groups/${link.groupId}`);if(!group)throw Error('Terapkan pembaruan Kelompok & Kamar terlebih dahulu.');
    const names=[];
    for(const id of link.staffIds){
     if(!staffMap.has(id))staffMap.set(id,await getNode(`staff/${id}`));const staff=staffMap.get(id);
     if(!staff)throw Error(`SDM ${id} belum tersedia. Lengkapi master SDM terlebih dahulu.`);
     if(staff.name?.trim().toLowerCase()!==link.staffNames[id].trim().toLowerCase())throw Error(`Nama SDM ${id} berbeda dari acuan. Periksa identitas sebelum sinkronisasi.`);
     names.push(staff.name);((assignments[id]??={})[link.role]??=[]).push(link.groupId);
    }
    if(groupTeacherIds(group).some(id=>!link.staffIds.includes(id)))throw Error(`Pembina ${group.name} telah berubah. Periksa penugasan terlebih dahulu.`);
    const base=`groups/${link.groupId}`;changes[base+'/mentorStaffIds']=link.staffIds;changes[base+'/mentorStaffId']=link.staffIds[0];changes[base+'/mentorName']=names.join(' & ');changes[base+'/sourceMentorName']=group.sourceMentorName||link.sourceMentorName;
   }
   for(const [id,a]of Object.entries(assignments)){const merged=mergeTeachingRoles(staffMap.get(id),a);changes[`staff/${id}/appRoles`]=merged.roles;changes[`staff/${id}/roleScopes`]=merged.roleScopes;}
   const users=await getNode('users')||{};
   for(const [uid,p]of Object.entries(users)){
    const a=assignments[p.staffId];if(!a||p.active===false||p.accessRevoked===true)continue;
    const merged=mergeTeachingRoles(p,a);changes[`users/${uid}/roles`]=merged.roles;changes[`users/${uid}/roleScopes`]=merged.roleScopes;
    for(const role of Object.keys(a))changes[`users/${uid}/roleFlags/${role}`]=true;
    changes[`users/${uid}/accessVersion`]=(p.accessVersion||0)+1;
   }
   changes[`settings/imports/${pack.id}`]={appliedBy:session.user.uid,appliedAt:Date.now(),groupCount:pack.links.length};
   await bulkPatchRoot(changes,session.user.uid,pack.id);status.textContent='Pembina dan akun guru tersinkron. Masuk ulang untuk memuat role dan kelompok terbaru.';
  }catch(error){status.textContent=error.message;button.disabled=false;}};
 }catch(error){host.innerHTML=`<p>${e(error.message)}</p>`;}
}
