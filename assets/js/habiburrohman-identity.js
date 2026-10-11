import {getNode,bulkPatchRoot,getCurrentAcademicYearId} from './repository.js';
import {habibIdentityPatch,HABIB_SOURCE as from,HABIB_TARGET as to} from './habiburrohman-identity-model.js';
export function renderHabibIdentity(host,session){
 host.innerHTML='<h3>Satukan Habiburrohman ke SMK</h3><p>Identitas utama: Habiburohman SMK. Alihkan Cordova 3 dan keanggotaan kelompok dari duplikat SMP, pertahankan kelas serta Guru Wali SMK, dan nonaktifkan penempatan duplikat SMP. Riwayat lama tetap disimpan pada ID asal; transaksi keuangan dan akun orang tua tidak diubah.</p><button class="btn btn-primary">Terapkan Identitas Habiburrohman</button><p role="status"></p>';
 const b=host.querySelector('button'),status=host.querySelector('[role=status]');b.onclick=async()=>{b.disabled=true;try{
 const year=await getCurrentAcademicYearId();if(year!=='TA-2026-2027-GANJIL')throw Error('Tahun aktif tidak sesuai konfirmasi.');
 const paths=[`students/${from}`,`students/${to}`,`assignments/rooms/${year}/${from}`,`assignments/rooms/${year}/${to}`,`assignments/classes/${year}/${from}`,`assignments/mentors/${year}/${from}`,`assignments/groups/${year}`];
 const values=await Promise.all(paths.map(getNode)),[source,target,room,targetRoom,school,mentor,groups]=values;
 const patch=habibIdentityPatch({source,target,room,targetRoom,school,mentor,groups,year});
 const marker='settings/imports/habiburrohman-20261011';
 const previous=await getNode(marker);const backup=Object.fromEntries(paths.map((p,i)=>[p.replaceAll('/','|'),values[i]??null]));
 // Keep only affected group memberships in the recovery snapshot.
 backup[`assignments|groups|${year}`]=Object.fromEntries(Object.entries(groups||{}).filter(([,m])=>m[from]||m[to]).map(([id,m])=>[id,{source:m[from]||null,target:m[to]||null}]));
 patch[marker]={appliedBy:session.user.uid,appliedAt:Date.now(),source:from,target:to,backup:previous?.backup||backup};
 await bulkPatchRoot(patch,session.user.uid,'habiburrohman-20261011');
 const [saved,placed,members]=await Promise.all([getNode(`students/${from}`),getNode(`assignments/rooms/${year}/${to}`),getNode(`assignments/groups/${year}`)]);
 if(saved?.status!=='inactive'||saved?.mergedInto!==to||placed?.roomId!=='ROOM-PTR-C3'||Object.values(members||{}).some(m=>m[from]))throw Error('Verifikasi belum lengkap. Periksa kembali.');
 status.textContent='Berhasil diverifikasi: identitas SMK aktif, Cordova 3 dan kelompok tertaut ke SMK, duplikat SMP nonaktif. Riwayat ID lama tetap tersimpan.';
 }catch(e){status.textContent=e.message;b.disabled=false;}};
}
