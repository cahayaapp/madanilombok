import {escapeHtml as e,csvEscape} from './utils.js';
import {icon} from './teacher/ui.js';
import {pageHeader} from './modules/common.js';
import {localDate} from './role-experience.js';
import {buildEvaluation,EVALUATION_MODES} from './counselor-evaluation-model.js';
const colors=['#00a39d','#4a9ff5','#efb338','#ed7c8b','#a38aca'];
const dateLabel=(s,month=false)=>new Intl.DateTimeFormat('id-ID',month?{month:'short',year:'numeric'}:{day:'numeric',month:'short'}).format(new Date(`${s}T12:00:00Z`));
function lineChart(points,mode){
 const max=Math.max(4,Math.ceil(Math.max(...points.map(p=>p.count))/4)*4),x=i=>42+i*510/Math.max(points.length-1,1),y=n=>160-n/max*132;
 const path=points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.count)}`).join(' ');
 const ticks=points.map((p,i)=>i).filter(i=>points.length<=7||i===0||i===points.length-1||i%7===0);
 return `<svg class="ce-trend" viewBox="0 0 590 202" role="img" aria-label="Tren kasus terbukti, ${points.map(p=>`${dateLabel(p.from)}: ${p.count}`).join('; ')}">${[0,1,2,3,4].map(i=>`<line x1="42" y1="${y(max*i/4)}" x2="552" y2="${y(max*i/4)}" stroke="#e2eeed"/><text x="30" y="${y(max*i/4)+4}" text-anchor="end">${max*i/4}</text>`).join('')}<path d="${path} L${x(points.length-1)},160 L42,160 Z" fill="#00a39d" opacity=".12"/><path d="${path}" fill="none" stroke="#009c97" stroke-width="3"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.count)}" r="4" fill="#009c97"><title>${e(dateLabel(p.from))}: ${p.count} kasus</title></circle>`).join('')}${ticks.map(i=>`<text x="${x(i)}" y="188" text-anchor="middle">${e(dateLabel(points[i].from,mode==='4months'))}</text>`).join('')}</svg>`;
}
function donut(summary){
 const entries=summary.distribution.slice(0,4);if(summary.distribution.length>4)entries.push({name:'Lainnya',count:summary.distribution.slice(4).reduce((n,p)=>n+p.count,0)});
 let offset=0;const stops=entries.map((p,i)=>{const start=offset;offset+=p.count/summary.total*100;return `${colors[i]} ${start}% ${offset}%`;});
 return `<div class="ce-donut-layout"><div class="ce-donut" style="background:${summary.total?`conic-gradient(${stops.join(',')})`:'#e7efee'}" role="img" aria-label="${summary.total} kasus terbukti"><div><strong>${summary.total}</strong><span>Kasus</span></div></div><ul class="ce-legend">${entries.map((p,i)=>`<li><i style="background:${colors[i]}"></i><span>${e(p.name)}</span><b>${p.count} <small>(${Math.round(p.count/summary.total*100)}%)</small></b></li>`).join('')||'<li>Belum ada kasus terbukti.</li>'}</ul></div>`;
}
export function renderCounselorEvaluation(ctx,cases){
 let mode='week',report;
 const names=new Map((ctx.master.students||[]).map(s=>[s.id,s.name]));
 ctx.root.innerHTML=pageHeader('Evaluasi Pelanggaran','Analisis kasus terbukti menurut tanggal kejadian, sesuai unit akses Anda.')+`<div class="counselor-evaluation"><div class="ce-controls"><div class="ce-tabs" role="group" aria-label="Periode evaluasi">${Object.entries(EVALUATION_MODES).map(([id,label])=>`<button type="button" data-ce-mode="${id}" aria-pressed="${id===mode}">${label}</button>`).join('')}</div><label>Tanggal acuan<input type="date" data-ce-date value="${localDate()}" required></label></div><p class="ce-caption" data-ce-caption aria-live="polite"></p><div data-ce-result></div></div>`;
 const draw=()=>{
  const anchor=ctx.root.querySelector('[data-ce-date]').value;if(!anchor)return;
  report=buildEvaluation(cases,mode,anchor);const s=report.summary,previous=report.previous;
  ctx.root.querySelectorAll('[data-ce-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ceMode===mode)));
  ctx.root.querySelector('[data-ce-caption]').textContent=`${dateLabel(report.from)} – ${dateLabel(report.to)} ${report.to.slice(0,4)} · ${s.total} kasus terbukti. Kasus belum ditabayyun dan tidak terbukti tidak dihitung.`;
  const metrics=[['total','Total Kasus','book'],['students','Santri Terlibat','people'],['kinds','Jenis Pelanggaran','chart'],['finished','Selesai Ditangani','check']];
  ctx.root.querySelector('[data-ce-result]').innerHTML=`<div class="ce-metrics">${metrics.map(([key,label,glyph],i)=>{const delta=s[key]-previous[key];return `<article class="ce-metric ce-tone-${i}"><span class="ce-metric-icon" aria-hidden="true">${icon(glyph)}</span><div><span>${label}</span><strong>${s[key]}</strong><small>${delta===0?'Sama dengan':`${delta>0?'+':''}${delta} dari`} periode sebelumnya</small></div></article>`;}).join('')}</div><div class="ce-charts"><section class="ce-panel"><h3>Tren Kasus ${mode==='4months'?'4 Bulan Terakhir':mode==='4weeks'?'4 Pekan Terakhir':'Harian'}</h3>${lineChart(report.trend,mode)}</section><section class="ce-panel"><h3>Jenis Pelanggaran</h3>${donut(s)}</section><section class="ce-panel"><h3>Top 5 Santri</h3><ol class="ce-ranking">${s.top.map((p,i)=>`<li><span class="ce-rank">${i+1}</span><div><strong>${e(names.get(p.id)||'Santri tidak tersedia')}</strong><small>${p.count} kasus</small></div><span class="ce-bar" aria-hidden="true"><i style="width:${p.count/s.top[0].count*100}%;background:${colors[i]}"></i></span></li>`).join('')||'<li>Belum ada kasus terbukti pada periode ini.</li>'}</ol></section></div><section class="ce-panel ce-comparison"><div class="ce-panel-head"><h3>${mode.startsWith('4')?'Perbandingan '+(mode==='4months'?'4 Bulan':'4 Pekan')+' Terakhir':'Ringkasan '+EVALUATION_MODES[mode]}</h3><button class="btn btn-secondary" type="button" data-ce-export>↓ Unduh Laporan CSV</button></div><table><thead><tr>${['Periode','Total Kasus','Santri Terlibat','Jenis Pelanggaran','Selesai Ditangani','Belum Selesai','Persentase Selesai'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${report.buckets.map(p=>`<tr>${[`${dateLabel(p.from)} – ${dateLabel(p.to)}`,p.total,p.students,p.kinds,p.finished,p.pending,p.total?p.completion+'%':'—'].map((v,i)=>`<td data-label="${['Periode','Total Kasus','Santri Terlibat','Jenis Pelanggaran','Selesai Ditangani','Belum Selesai','Persentase Selesai'][i]}">${e(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="ce-note">Selesai ditangani mengikuti status kasus “selesai”. Selisih kartu dibandingkan dengan periode sebelumnya yang sama panjang. Periode berjalan masih dapat bertambah.</p></section>`;
  ctx.root.querySelector('[data-ce-export]').onclick=()=>{
   const rows=[['Periode mulai','Periode akhir','Total kasus terbukti','Santri terlibat','Jenis pelanggaran','Selesai ditangani','Belum selesai','Persentase selesai'],...report.buckets.map(p=>[p.from,p.to,p.total,p.students,p.kinds,p.finished,p.pending,p.total?p.completion+'%':''])];
   const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`evaluasi-pelanggaran-${report.from}-${report.to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
 };
 ctx.root.querySelectorAll('[data-ce-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.ceMode;draw();});ctx.root.querySelector('[data-ce-date]').onchange=draw;draw();
}
