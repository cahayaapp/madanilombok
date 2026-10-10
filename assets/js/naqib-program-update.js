import {getNode,bulkPatchRoot} from './repository.js';
import {naqibProgramPatch,NAQIB_SLOTS} from './naqib-program-model.js';
export async function renderNaqibProgramUpdate(host,session){
 host.innerHTML='<h3>Program Presensi Naqib</h3><p>Tahajjud, Subuh, Zuhur, Ashar, Magrib, Isya (20.00–20.30), Makan Pagi, Makan Siang, Makan Malam, Pengecekan Tidur, Apel Pagi Senin, Senam Sabtu, serta Apel Transisi 07.50–08.00. Putra/putri termasuk GEMA; khusus apel transisi SMP/SMK, GEMA dicatat pembinanya. Waktu WITA. Riwayat dipertahankan.</p><button class="btn btn-primary">Terapkan Program Presensi Naqib</button><p role="status"></p>';
 host.querySelector('button').insertAdjacentHTML('beforebegin','<details><summary>Lihat 13 jadwal yang diterapkan (WITA)</summary><ul>'+NAQIB_SLOTS.map(([,name,start,end,day])=>`<li>${name}: ${day}, ${start}–${end}</li>`).join('')+'</ul></details>');
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');button.onclick=async()=>{button.disabled=true;try{
 const [schedules,programs,duty]=await Promise.all(['schedules/daily','programs','settings/naqibDuty'].map(getNode));
 if(!duty?.staff)throw Error('Terapkan piket terlebih dahulu.');
 const years=[...new Set(Object.values(schedules||{}).filter(s=>s.status!=='inactive'&&s.academicYearId).map(s=>s.academicYearId))];
 if(years.length!==1)throw Error('Jadwal harus memiliki satu tahun aktif sebelum pembaruan ini diterapkan.');
 await bulkPatchRoot(naqibProgramPatch(years[0],schedules,programs),session.user.uid,'naqib-program-20261010');status.textContent='Program presensi Naqib berhasil diterapkan. Muat ulang aplikasi petugas.';
 }catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
}
