import {getNode,bulkPatchRoot,getCurrentAcademicYearId} from './repository.js';
import {escapeHtml} from './utils.js';
import {girlsRoomPatch,GIRLS_YEAR as year,GIRLS_ROOM_UPDATE as key} from './confirmed-girls-rooms-model.js';
const stable=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export function renderConfirmedGirlsRooms(host,session){
 host.innerHTML='<h3>Konfirmasi Identitas & Kamar Putri</h3><p>Satukan Lukina, Restu, Tazzia, Feby, dan Nazura. Salwa Salsabila SD adalah siswa tersendiri dan tidak digabung dengan Salsabila SMP. Tetapkan kamar sesuai konfirmasi. Delapan siswa SD lainnya pada rekap menjadi nonasrama. Identitas duplikat diarsipkan; riwayat lama dan keuangan tetap pada ID asal.</p><button class="btn btn-secondary" data-review>Periksa Konfirmasi Putri</button><div data-preview></div><button class="btn btn-primary" data-apply hidden>Terapkan Konfirmasi Putri</button><p role="status"></p>';
 const review=host.querySelector('[data-review]'),apply=host.querySelector('[data-apply]'),status=host.querySelector('[role=status]');let preview;
 const read=async()=>{if(await getCurrentAcademicYearId()!==year)throw Error('Tahun aktif tidak sesuai.');const paths=['students','rooms',...['rooms','classes','mentors','groups'].map(k=>`assignments/${k}/${year}`)];const [students,rooms,r,c,m,g]=await Promise.all(paths.map(getNode));return {students:students||{},rooms:rooms||{},assignments:{rooms:r||{},classes:c||{},mentors:m||{},groups:g||{}}};};
 review.onclick=async()=>{review.disabled=true;apply.hidden=true;try{preview=girlsRoomPatch(await read());host.querySelector('[data-preview]').innerHTML='<ul>'+preview.summary.map(x=>`<li>${escapeHtml(x)}</li>`).join('')+'</ul><p>8 siswa SD → nonasrama.</p>';apply.hidden=false;status.textContent='Pemeriksaan selesai, belum disimpan.';}catch(e){status.textContent=e.message;}finally{review.disabled=false;}};
 apply.onclick=async()=>{apply.disabled=true;review.disabled=true;try{const data=await read(),fresh=girlsRoomPatch(data);if(JSON.stringify(fresh)!==JSON.stringify(preview))throw Error('Data berubah. Periksa ulang dahulu.');const marker=`settings/imports/${key}`,old=await getNode(marker),backup={};
 for(const path of Object.keys(fresh.patch)){const parts=path.split('/');let value=parts[0]==='students'?data.students:data.assignments[parts[1]];for(const part of parts.slice(parts[0]==='students'?1:3))value=value?.[part];backup[path.replaceAll('/','|')]=value??null;}
 await bulkPatchRoot({...fresh.patch,[marker]:{appliedAt:Date.now(),appliedBy:session.user.uid,backup:old?.backup||backup}},session.user.uid,key);
 const checks=await Promise.all(Object.keys(fresh.patch).map(getNode));if(checks.some((v,i)=>stable(v??null)!==stable(Object.values(fresh.patch)[i])))throw Error('Penyimpanan memerlukan pemeriksaan ulang.');
 status.textContent='Berhasil: enam identitas/kamar diselaraskan dan delapan siswa SD menjadi nonasrama. Muat ulang presensi Naqib.';apply.hidden=true;
 }catch(e){status.textContent=e.message;}finally{apply.disabled=false;review.disabled=false;}};
}
