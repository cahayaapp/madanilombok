import {getNode,bulkPatchRoot} from './repository.js';
import {escapeHtml} from './utils.js';
export async function renderDailyUpdate(host,session){
 try{
  const response=await fetch('../seed/imports/daily-2026-update.json');
  if(!response.ok)throw Error('Paket jadwal harian belum tersedia.');
  const pack=await response.json();
  host.innerHTML='<h3>Jadwal 24 Jam Santri 2026</h3><p>14 kegiatan asrama umum dan 17 kegiatan GEMA, untuk putra dan putri. Menggantikan 50 slot lama; riwayat tetap tersimpan. Peserta GEMA mengikuti penempatan kamar GEMA.</p><button class="btn btn-primary">Terapkan Jadwal 24 Jam</button><p role="status"></p>';
  const button=host.querySelector('button'),status=host.querySelector('[role="status"]');
  button.onclick=async()=>{button.disabled=true;try{
   if(await getNode(`settings/imports/${pack.id}`)){status.textContent='Pembaruan sudah diterapkan; data tidak ditimpa ulang.';return;}
   const changes={};
   for(const [path,value]of Object.entries(pack.changes)){
    if(!/^(programs\/[^/]+|schedules\/daily\/[^/]+)(\/(status|supersededBy))?$/.test(path))throw Error('Paket memuat jalur di luar jadwal harian.');
    const base=path.replace(/\/(status|supersededBy)$/,'');
    const old=await getNode(base);
    if(pack.expected[base]){
     if(!old)continue;
     if((base.startsWith('schedules/')&&old.academicYearId!==pack.report.academicYearId)||old.source!==pack.expected[base].source)throw Error('Sumber jadwal lama berubah. Periksa sebelum menerapkan.');
    }else if(old&&old.importId!==pack.id)throw Error('ID jadwal/program sudah digunakan. Pembaruan dibatalkan.');
    changes[path]=value;
   }
   changes[`settings/imports/${pack.id}`]={appliedAt:Date.now(),appliedBy:session.user.uid,report:pack.report};
   await bulkPatchRoot(changes,session.user.uid,pack.id);
   status.textContent='Jadwal umum dan GEMA tersimpan. Muat ulang halaman untuk melihat pembaruan.';
  }catch(error){status.textContent=error.message;button.disabled=false;}};
 }catch(error){host.innerHTML=`<p>${escapeHtml(error.message)}</p>`;}
}
