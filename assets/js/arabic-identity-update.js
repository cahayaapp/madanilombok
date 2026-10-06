import {getNode,bulkPatchRoot} from './repository.js';
import {arabicIdentityImportId as marker,arabicIdentityNodes,prepareArabicIdentity} from './arabic-identity-model.js';
export async function renderArabicIdentityUpdate(host,session){
 host.innerHTML='<h3>Konfirmasi Guru Bahasa Arab & Identitas Ida Fitriana</h3><p>Fahri Gontor → Fahri Aldian Effendi. Satukan Ida Fitriana ke SDM utama SMP beserta penugasannya, lalu hapus duplikat dari master dengan arsip pemulihan. Nama kegiatan 05.40–06.10 menjadi Bahasa Arab untuk umum dan GEMA. Riwayat kegiatan dan akun login tetap tersimpan.</p><button class="btn btn-primary">Terapkan Konfirmasi Guru & Bahasa Arab</button><p role="status"></p>';
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');
 button.onclick=async()=>{button.disabled=true;try{
  if(await getNode(`settings/imports/${marker}`)){status.textContent='Konfirmasi sudah diterapkan.';return;}
  const data=Object.fromEntries(await Promise.all(arabicIdentityNodes.map(async n=>[n,await getNode(n)||{}])));
  const changes=prepareArabicIdentity(data);changes[`settings/imports/${marker}`]={appliedBy:session.user.uid,appliedAt:Date.now()};
  await bulkPatchRoot(changes,session.user.uid,marker);
  const [removed,group,program]=await Promise.all([getNode('staff/AMD-SDM-0037'),getNode('groups/GRP-2026-arabic-L-c3'),getNode('programs/PRG-2026-UMUM-04')]);
  if(removed||group?.mentorStaffId!=='AMD-SDM-0023'||!/Bahasa Arab/.test(program?.name||''))throw Error('Penulisan selesai, tetapi verifikasi belum lengkap. Muat ulang data.');
  status.textContent='Berhasil. Ida Fitriana menjadi satu SDM, pengajar terhubung, dan jadwal bernama Bahasa Arab. Muat ulang atau masuk ulang akun guru.';
 }catch(error){status.textContent=error.message;button.disabled=false;}};
}
