import {panel,metric,empty,escapeHtml as e} from './modules/common.js';
import {loading} from './loading-ui.js';

import {prayers,statuses,worshipSummary} from './leadership-worship-model.js';

// Read only the selected period. A detached panel must never replace a newer view.
export async function renderWorshipMonitor(body,{yearId,scope,from,to,name,read}){
 const view=document.createElement('section');
 view.className='monitor-worship';
 body.replaceChildren(view);
 view.innerHTML=loading('Memuat absensi ibadah pengurus muqim…');
 try{
  const data=await read(`workspaces/${yearId}/staff_worship`,from,to+'\uf8ff');
  if(view.parentNode!==body)return;
  const {rows,counts,filled,attendance}=worshipSummary(data,{yearId,scope,from,to});
  view.innerHTML=`<div class="portal-metrics monitor-summary-strip">${metric('Kehadiran Ibadah',attendance===null?'—':attendance+'%','Dari presensi yang sudah diisi','green')}${metric('Hadir',counts.Hadir,'Catatan per personil per salat','cyan')}${metric('Tidak Hadir',counts['Tidak Hadir'],'Tidak termasuk izin, sakit, dan tugas','coral')}${metric('Personil',new Set(rows.map(r=>r.staffId)).size,'Memiliki catatan dalam periode ini','blue')}</div>`+
   panel('Ringkasan Ibadah Muqim',`<p>Izin: <b>${counts.Izin}</b> · Sakit: <b>${counts.Sakit}</b> · Tugas lembaga: <b>${counts['Tugas Lembaga']}</b> · Belum diisi: <b>${counts['Belum Diisi']}</b></p><p>${filled} catatan terisi. Persentase dihitung dari Hadir dibagi seluruh catatan terisi, termasuk tidak hadir, izin, sakit, dan tugas lembaga. Belum diisi tidak dihitung. Data mengikuti unit saat absensi dicatat.</p><p>Presensi ibadah tidak mencatat waktu kedatangan, sehingga tidak digunakan untuk menghitung kedisiplinan waktu mengajar.</p>`)+
   panel('Rincian Presensi Ibadah',`<div class="filter-row wrap"><label>Waktu salat<select data-worship-prayer><option value="">Semua salat</option>${Object.entries(prayers).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label>Kehadiran<select data-worship-status><option value="">Semua status</option>${[...statuses,'Belum Diisi'].map(s=>`<option>${s}</option>`).join('')}</select></label></div><div data-worship-results></div>`);
  const prayer=view.querySelector('[data-worship-prayer]'),status=view.querySelector('[data-worship-status]');
  const draw=()=>{
   const selected=rows.filter(r=>(!prayer.value||r.prayer===prayer.value)&&(!status.value||r.status===status.value));
   view.querySelector('[data-worship-results]').innerHTML=selected.map(r=>`<article class="workspace-record monitor-person"><span class="monitor-person-avatar" aria-hidden="true">${e(name(r.staffId).slice(0,1))}</span><div><h3>${e(name(r.staffId))}</h3><p>Salat ${prayers[r.prayer]} · ${scope==='boarding-L'?'Putra':'Putri'}</p><small>${e(r.date)}</small></div><span class="monitor-status ${r.status==='Tidak Hadir'?'absent':r.status==='Hadir'?'':'warning'}">${e(r.status)}</span></article>`).join('')||empty(rows.length?'Tidak ada presensi sesuai filter.':'Belum ada presensi ibadah tercatat dalam periode ini.');
  };
  prayer.onchange=draw;status.onchange=draw;draw();
 }catch{
  if(view.parentNode!==body)return;
  view.innerHTML='<p role="alert">Absensi ibadah belum dapat dimuat. Periksa koneksi dan hak akses unit Anda.</p><button type="button" class="btn btn-secondary">Coba Lagi</button>';
  view.querySelector('button').onclick=()=>renderWorshipMonitor(body,{yearId,scope,from,to,name,read});
 }
}
