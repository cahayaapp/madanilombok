import {getNode,bulkPatchRoot} from './repository.js';
import {escapeHtml as e} from './utils.js';
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));return x??null;}
export async function renderBoardingUpdate(host,session,options={}){
 try{
  const response=await fetch(options.packageUrl||'../seed/imports/boarding-2026-update.json');if(!response.ok)throw Error('Paket roster belum tersedia.');
  const pack=await response.json(),r=pack.report;
  const totals=kind=>Object.entries(r.counts||{}).filter(([key])=>key.startsWith(kind+'-')).reduce((sum,[,value])=>sum+value.linked,0);
  host.innerHTML=`<h3>${e(options.title||"Kelompok & Kamar 2026/2027")}</h3><p>${options.summary?e(options.summary):`${totals("rooms")} penempatan kamar · ${totals("quran")} keanggotaan halaqah · ${totals("arabic")} keanggotaan bahasa Arab. ${r.recurring} kegiatan pekanan/bulanan.`}</p><p>${r.pending.length} kemunculan nama masih menunggu verifikasi. Hanya identitas yang sudah terhubung yang diterapkan. Anggota belum lengkap ditandai pada kelompok.</p><button type="button" class="btn btn-primary" id="applyBoardingUpdate">${e(options.buttonLabel||"Terapkan Pembaruan Kelompok & Kamar")}</button><p role="status" aria-live="polite"></p>`;
  const button=host.querySelector('button'),status=host.querySelector('[role="status"]');
  button.onclick=async()=>{button.disabled=true;button.textContent="Memeriksa data…";status.textContent="Memeriksa identitas dan perubahan data sebelum menerapkan.";try{
   const markerPath=`settings/imports/${pack.id}`,marker=await getNode(markerPath);
   if(marker&&marker.status!=='partial'){button.textContent='Sudah diterapkan';status.textContent='Paket ini sudah diterapkan. Gunakan revisi baru untuk memperbarui hasil konfirmasi.';return;}
   const done=new Set(marker?.appliedPaths||[]),changes={},entries=Object.entries(pack.changes),studentIds=[...new Set(entries.map(([,v])=>v?.studentId).filter(Boolean))],missing=[];
   for(let i=0;i<studentIds.length;i+=25)await Promise.all(studentIds.slice(i,i+25).map(async id=>{if(!await getNode(`students/${id}`))missing.push(id);}));
   const missingIds=new Set(missing),applied=new Set(done);
   for(let i=0;i<entries.length;i+=25)await Promise.all(entries.slice(i,i+25).map(async([path,value])=>{
    if(!/^(groups\/|rooms\/|assignments\/(rooms|groups)\/|schedules\/recurring\/|reference\/boardingRoster)/.test(path))throw Error('Jalur paket di luar cakupan roster.');
    if(done.has(path)||missingIds.has(value?.studentId))return;
    // Keep legacy groups available until every known student's replacement can be linked.
    if(/^groups\/HLQ-[^/]+\/(status|supersededBy)$/.test(path)){
     if(missing.length)return;
     if(!await getNode(path.split('/').slice(0,-1).join('/'))){applied.add(path);return;}
    }
    const old=await getNode(path);
    if(!equal(old,pack.expected[path])&&!equal(old,value)&&!(pack.acceptedPrevious?.[path]||[]).some(v=>equal(old,v)))throw Error(`Data tujuan berubah: ${path}. Periksa sebelum impor.`);
    changes[path]=value;applied.add(path);
   }));
   changes[markerPath]={appliedAt:Date.now(),appliedBy:session.user.uid,pendingCount:r.pending.length,status:missing.length?'partial':'complete',missingStudentIds:missing.sort(),appliedPaths:[...applied].sort()};
   button.textContent="Menerapkan…";await bulkPatchRoot(changes,session.user.uid,pack.id);
   if(missing.length){button.disabled=false;button.textContent='Coba Lagi Data Tertunda';status.textContent=`Data yang tersedia berhasil diterapkan. ${missing.length} ID siswa belum ada di database aktif dan ditunda: ${missing.slice(0,20).join(', ')}${missing.length>20?' …':''}. Kelompok lama tetap aktif. Setelah master siswa dilengkapi, klik Coba Lagi Data Tertunda; data yang sudah diterapkan tidak ditimpa.`;}
   else{button.textContent="Sudah diterapkan";status.textContent='Pembaruan tersimpan. Muat ulang halaman untuk melihat kelompok dan kamar terbaru.';}

  }catch(error){status.textContent=error.message;button.disabled=false;button.textContent=options.buttonLabel||"Terapkan Pembaruan Kelompok & Kamar";}};
 }catch(error){host.innerHTML=`<p>${e(error.message)}</p>`;}
}

export function renderRoomMetadataUpdate(host,session){return renderBoardingUpdate(host,session,{packageUrl:'../seed/imports/room-metadata-2026-update.json',title:'Penyelarasan Master Kamar',buttonLabel:'Terapkan Penyelarasan Master Kamar',summary:'Perbarui nama GEMA Gedung Cairo, GEMA I Putri, dan jenis penghuni Makkah 2. Cordova 1 tetap tersimpan dengan catatan perlu konfirmasi. Penempatan penghuni tidak diubah.'});}
