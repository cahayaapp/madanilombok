import {icon,e} from './teacher/ui.js';
const quick=[['naqib-programs','Program Hari Ini','Lihat kegiatan sesuai piket','calendar','blue'],['naqib-attendance','Presensi Santri','Catat kehadiran per asrama','check','teal'],['naqib-report','Laporan Pelaksanaan','Catat hasil pendampingan','book','violet'],['naqib-initiative','Inisiatif Santri','Apresiasi kontribusi santri','pen','amber']];
const workspace=[['naqib-assessment','Asesmen Santri','Pantau perkembangan santri','chart'],['naqib-self','Refleksi Naqib','Evaluasi pendampingan Anda','user'],['naqib-case','Lapor Kasus','Sampaikan kejadian santri','flag'],['naqib-discipline','Kedisiplinan','Lihat catatan kedisiplinan','check'],['naqib-example','Naqib Teladan','Catat bukti keteladanan','pen'],['naqib-history','Riwayat Naqib','Tinjau laporan sebelumnya','calendar'],['naqib-guide','Panduan Kerja','Panduan tugas dan pencatatan','book']];
export function renderNaqibHome(ctx,items){
 const allowed=new Set(items.map(i=>i.id));
 ctx.root.innerHTML=`<main class="guru-hub naqib-hub"><section><div class="hub-section-head"><h2>Akses Cepat Hari Ini</h2></div><div class="hub-quick-grid">${quick.filter(([id])=>allowed.has(id)).map(([id,title,sub,ico,color])=>`<button type="button" class="hub-quick-card ${color}" data-home-route="${id}"><span class="hub-icon">${icon(ico)}</span><span><b>${e(title)}</b><small>${e(sub)}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div></section><section class="naqib-workspace-menu"><div class="hub-section-head"><h2>Menu Naqib</h2></div><div class="hub-menu-grid">${workspace.filter(([id])=>allowed.has(id)).map(([id,title,sub,ico])=>`<button type="button" class="hub-menu-card" data-home-route="${id}"><span class="hub-menu-icon">${icon(ico)}</span><b>${e(title)}</b><small>${e(sub)}</small><span class="hub-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section></main>`;
 ctx.root.querySelectorAll('[data-home-route]').forEach(b=>b.onclick=()=>ctx.navigate(b.dataset.homeRoute));
}
// Reuse the teacher page header and controls while retaining existing form handlers.
export function decorateNaqibPage(ctx){
 ctx.root.classList.add('naqib-workspace');
 const header=ctx.root.querySelector('.portal-section-head,.page-header,.section-header,.module-header');
 const back=document.createElement('button');back.type='button';back.className='teacher-back naqib-home-back';back.setAttribute('aria-label','Kembali ke beranda');back.textContent='‹';back.onclick=()=>ctx.navigate('dashboard');
 if(header){header.classList.add('naqib-page-heading');header.prepend(back);}else ctx.root.prepend(back);
}
