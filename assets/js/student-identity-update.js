import {getNode,bulkPatchRoot} from './repository.js';
const source='AMD-SMP-0013',target='AMD-SMP-0016',year='TA-2026-2027-GANJIL',marker='atika-identity-20261006';
export async function prepareAtikaIdentity(read){
 const [old,main,mentor]=await Promise.all([read(`students/${source}`),read(`students/${target}`),read(`assignments/mentors/${year}/${target}`)]);
 if(old?.name!=='ATIKA ZAHRA RATIFA'||main?.name!=='BAIQ ATIKA ZAHRA RATIFA'||String(main.nisn)!=='3135519594'||main.status!=='active'||mentor?.mentorStaffId!=='AMD-SDM-0036')throw Error('Identitas atau Guru Wali Atika berubah. Periksa kembali master.');
 if(old.mergedInto&&old.mergedInto!==target)throw Error('Record duplikat sudah ditautkan ke siswa lain.');
 return {[`students/${source}/status`]:'inactive',[`students/${source}/mergedInto`]:target,[`students/${source}/validationStatus`]:'Duplikat dikonfirmasi pengguna 6 Oktober 2026. Gunakan BAIQ ATIKA ZAHRA RATIFA (AMD-SMP-0016). Riwayat ID lama tetap tersimpan.',[`students/${target}/confirmedAliases/${source}`]:'ATIKA ZAHRA RATIFA'};
}
export async function renderStudentIdentityUpdate(host,session){
 host.innerHTML='<h3>Identitas Atika terkonfirmasi</h3><p>Pertahankan Baiq Atika Zahra Ratifa sebagai identitas utama, dengan Guru Wali Ida Fitriana. Arsipkan record Atika tanpa “Baiq” sebagai duplikat. Biodata utama serta riwayat ID lama tetap tersimpan.</p><button class="btn btn-primary">Terapkan Identitas Atika</button><p role="status"></p>';
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');
 button.onclick=async()=>{button.disabled=true;try{
  if(await getNode(`settings/imports/${marker}`)){status.textContent='Identitas Atika sudah diterapkan.';return;}
  const changes=await prepareAtikaIdentity(getNode);
  changes[`settings/imports/${marker}`]={appliedAt:Date.now(),appliedBy:session.user.uid,sourceStudentId:source,canonicalStudentId:target,previousStatus:(await getNode(`students/${source}`)).status};
  await bulkPatchRoot(changes,session.user.uid,marker);
  const saved=await getNode(`students/${source}`);
  if(saved?.status!=='inactive'||saved?.mergedInto!==target)throw Error('Verifikasi arsip Atika belum berhasil.');
  status.textContent='Berhasil. Baiq Atika tetap aktif dan dibimbing Ida Fitriana. Record duplikat Atika sudah nonaktif; riwayatnya tetap tersimpan.';
 }catch(error){status.textContent=error.message;button.disabled=false;}};
}
