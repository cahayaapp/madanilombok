import {monitorScope,MONITOR_VIEWS,CONTROL_UNIT_ROUTES} from './leadership-monitor-model.js';
import {renderLeadershipMonitor} from './leadership-monitor.js';
import {escapeHtml as e,empty} from './modules/common.js';

const leaders=['director','deputy_director'];
const schoolViews=['school-quality','school-teacher-attendance','school-student-attendance','school-mentoring'];
const dormViews=['dorm-student-attendance','dorm-teacher-attendance','dorm-quran-daily','dorm-counselor'];
export function controlUnits(session,master){
 if(!leaders.includes(session.activeRole)||!session.roles.includes(session.activeRole))throw Error('Akses kontrol lintas unit tidak tersedia.');
 return [
  {id:'boys',label:'Asrama Putra',role:'head_boys_dorm'},
  {id:'girls',label:'Asrama Putri',role:'head_girls_dorm'},
  ...['SMK','SMP','SD','TK'].map(type=>({id:type,label:type,role:'head_formal_school',unitIds:(master.units||[]).filter(u=>u.type===type||u.code===type).map(u=>u.id)}))
 ].map(unit=>{
  // A local read-only reporting context; never change the signed-in role or assignments.
  const reportSession={...session,activeRole:unit.role,profile:{...session.profile,unitIds:unit.unitIds||[],roleScopes:{[unit.role]:{unitIds:unit.unitIds||[]}}}};
  return {...unit,reportSession,scope:monitorScope(reportSession,master),views:unit.unitIds?schoolViews:dormViews};
 });
}
const unitIcon=school=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${school?'<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11v6c4 3 8 3 12 0v-6M21 9v7"/>':'<path d="M4 21V7l8-4 8 4v14M2 21h20M9 21v-6h6v6M8 8h1m6 0h1M8 11h1m6 0h1"/>'}</svg>`;
const viewLabels={'school-quality':'Mutu Pendidikan','school-teacher-attendance':'Kehadiran Guru','school-student-attendance':'Kehadiran Siswa','school-mentoring':'Guru Wali','dorm-student-attendance':'Kehadiran Santri','dorm-teacher-attendance':'Pembina & Guru','dorm-quran-daily':'Setoran Tahfiz','dorm-counselor':'Konseling'};
export async function renderLeadershipControl(ctx){
 const units=controlUnits(ctx.session,ctx.master);
 ctx.root.innerHTML=`<div class="lc-dashboard"><header class="lc-hero"><div class="lc-eyebrow"><span></span> PEMANTAUAN UNIT</div><h1>Kontrol & Kondisi</h1><p>Satu pandangan untuk pendidikan dan pengasuhan.</p><div class="lc-hero-footer"><span>6 unit pemantauan</span><span>${e(ctx.year?.name||'Tahun ajaran aktif')}</span></div></header><div class="lc-section-heading"><div><h2>Jelajahi unit</h2><p>Pilih unit untuk melihat kondisi dan perkembangannya.</p></div><span class="lc-section-count">01 — 06</span></div><div class="lc-unit-grid" aria-label="Unit pemantauan">${units.map(u=>`<button type="button" class="lc-unit-card ${u.scope.school?'lc-school':'lc-dorm'}" data-control-unit="${u.id}"><span class="lc-card-top"><span class="lc-unit-icon">${unitIcon(u.scope.school)}</span><span class="lc-unit-kind">${u.scope.school?'Sekolah':'Asrama'}</span></span><b>${e(u.label)}</b><small>${u.scope.students.length} ${u.scope.school?'siswa · '+u.scope.classes.length+' rombel':'santri mukim'}</small><span class="lc-card-footer"><span>Lihat kondisi</span><span class="lc-arrow" aria-hidden="true">↗</span></span></button>`).join('')}</div></div>`;
 ctx.root.querySelectorAll('[data-control-unit]').forEach(b=>b.onclick=()=>ctx.navigate(`management-control-${b.dataset.controlUnit}`));
}
export async function renderLeadershipControlUnit(ctx,unitId){
 const unit=controlUnits(ctx.session,ctx.master).find(u=>u.id===unitId);
 if(!unit)throw Error('Unit pemantauan tidak tersedia.');
 if(!ctx.yearId)throw Error('Tahun ajaran aktif belum diatur.');
 ctx.root.innerHTML='<div class="lc-dashboard"><button type="button" class="lc-back" data-control-back><span aria-hidden="true">←</span> Kembali ke Kontrol & Kondisi</button><section id="controlDetail" aria-live="polite"></section></div>';
 ctx.root.querySelector('[data-control-back]').onclick=()=>ctx.navigate('management-control');
 const detail=ctx.root.querySelector('#controlDetail');
  detail.innerHTML=`<header class="lc-detail-heading"><span class="lc-unit-icon">${unitIcon(unit.scope.school)}</span><div><span class="lc-detail-kicker">KONDISI UNIT</span><h2>${e(unit.label)}</h2></div><span class="lc-detail-tag">${unit.scope.school?'Pendidikan':'Pengasuhan'}</span></header><div class="lc-report-tabs" role="group" aria-label="Laporan ${e(unit.label)}">${unit.views.map(id=>`<button type="button" title="${e(MONITOR_VIEWS[id][0])}" data-control-view="${id}">${e(viewLabels[id])}</button>`).join('')}</div><div data-control-report></div>`;
  async function openReport(route){
   // Replace the mount so a slower previous request cannot overwrite the latest selection.
   const old=detail.querySelector('[data-control-report]');
   const mount=old.ownerDocument.createElement('div');mount.setAttribute('data-control-report','');old.replaceWith(mount);
   detail.querySelectorAll('[data-control-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.controlView===route)));
   mount.innerHTML=empty('Memuat data unit…');
   try{await renderLeadershipMonitor({...ctx,root:mount,session:unit.reportSession},route);}
   catch(error){mount.innerHTML=empty('Data belum tersedia: '+(error.message||'Gagal memuat laporan.'))+'<button type="button" class="btn btn-secondary" data-retry-control>Coba lagi</button>';mount.querySelector('[data-retry-control]').onclick=()=>openReport(route);}
  }
  detail.querySelectorAll('[data-control-view]').forEach(b=>b.onclick=()=>openReport(b.dataset.controlView));
  await openReport(unit.views[0]);
}

export const CONTROL_ROUTES=Object.fromEntries(Object.entries(CONTROL_UNIT_ROUTES).map(([route,{unitId}])=>[route,ctx=>renderLeadershipControlUnit(ctx,unitId)]));
