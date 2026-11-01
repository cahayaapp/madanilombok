import {escapeHtml as e} from './utils.js';
const days=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Ahad'];
export function formalScheduleRows(cache){
 return (cache['academic-schedules']||[]).map(row=>{
  const classroom=(cache.classes||[]).find(c=>c.id===row.classId);
  const teacherStaffId=row.teacherStaffId||row.staffId||'';
  return {...row,day:row.day==='Minggu'?'Ahad':row.day,unitId:classroom?.unitId||row.unitId||'',teacherStaffId,
   teacherName:(cache.staff||[]).find(s=>s.id===teacherStaffId)?.name||teacherStaffId||'Belum ditautkan ke SDM',
   className:classroom?.name||row.classId||'',subjectName:(cache.subjects||[]).find(s=>s.id===row.subjectId)?.name||row.subjectId||''};
 });
}
export function mountFormalSchedules({root,cache,bindActions,add,exportCsv}){
 const rows=formalScheduleRows(cache);
 let selectedUnit=null;
 const unitName=id=>(cache.units||[]).find(u=>u.id===id)?.name||id||'Unit belum ditautkan';
 const options=items=>items.map(item=>`<option value="${e(item.id)}">${e(item.name||item.id)}</option>`).join('');
 root.innerHTML=`<section class="admin-page-hero"><div><p class="eyebrow">PEMBELAJARAN FORMAL</p><h2>Jadwal Pelajaran</h2><p>Pilih unit untuk melihat jadwal per hari. Nama guru terhubung langsung ke Data SDM.</p></div><div class="section-actions"><button class="btn btn-secondary" id="exportButton">Export CSV</button><button class="btn btn-primary" id="addButton">+ Tambah Jadwal</button></div></section><div id="formalUnitCards" class="formal-unit-cards"></div><section id="formalDetail" hidden><button type="button" id="formalBack" class="btn btn-secondary">← Kembali ke Unit</button><h3 id="formalUnitTitle" tabindex="-1"></h3><div class="toolbar"><input id="formalSearch" type="search" aria-label="Cari jadwal" placeholder="Cari guru, kelas, atau mata pelajaran…"><select id="formalDay" aria-label="Hari"><option value="">Semua Hari</option>${days.map(day=>`<option>${day}</option>`).join('')}</select><select id="formalYear" aria-label="Tahun ajaran"><option value="">Semua Tahun Ajaran</option>${options(cache['academic-years']||[])}</select><span id="formalCount" class="badge"></span></div><div id="formalGroups"></div></section>`;
 const $=selector=>root.querySelector(selector);
 const render=()=>{
  const query=$('#formalSearch').value.trim().toLowerCase();
  const filtered=rows.filter(row=>row.unitId===selectedUnit&&(!$('#formalDay').value||row.day===$('#formalDay').value)&&(!$('#formalYear').value||row.academicYearId===$('#formalYear').value)&&(!query||[row.teacherName,row.className,row.subjectName,row.startTime,row.endTime].join(' ').toLowerCase().includes(query)));
  $('#formalCount').textContent=`${filtered.length} jadwal`;
  $('#formalGroups').innerHTML=[...new Set(filtered.map(r=>r.unitId))].sort((a,b)=>unitName(a).localeCompare(unitName(b),'id')).map(unitId=>{
   const unitRows=filtered.filter(r=>r.unitId===unitId);
   const dayNames=$('#formalDay').value?[$('#formalDay').value]:[...days,...new Set(unitRows.map(r=>r.day||'Hari belum diatur').filter(day=>!days.includes(day)))];
   return `<section class="formal-unit"><div class="academic-week-grid">${dayNames.map(day=>{
    const daily=unitRows.filter(r=>(r.day||'Hari belum diatur')===day).sort((a,b)=>String(a.startTime||'').replace('.',':').localeCompare(String(b.startTime||'').replace('.',':'))||a.className.localeCompare(b.className,'id'));
    const classes=[...new Map(daily.map(r=>[r.classId||'',r.className||'Kelas belum ditautkan']))].sort((a,b)=>a[1].localeCompare(b[1],'id',{numeric:true}));
    return `<details class="academic-day academic-day-package formal-day"><summary class="academic-day-heading"><span class="eyebrow">JADWAL HARIAN</span><h3>${e(day)}</h3><p>${daily.length} jadwal <span>· WITA</span></p><span class="academic-day-toggle" aria-hidden="true">⌄</span></summary>${daily.length?`<div class="academic-class-list">${classes.map(([classId,className])=>{
     const lessons=daily.filter(r=>(r.classId||'')===classId);
     return `<details class="academic-class-group"><summary><strong>${e(className)}</strong><span>${lessons.length} jadwal</span><b aria-hidden="true">⌄</b></summary><table class="data-table academic-day-table"><thead><tr><th>Jam</th><th>Pelajaran &amp; Guru</th></tr></thead><tbody>${lessons.map(r=>`<tr><td data-label="Waktu"><strong>${e(r.startTime||'—')}</strong><small>${e(r.endTime||'—')}</small></td><td data-label="Pelajaran & Guru"><strong class="academic-subject">${e(r.subjectName||'—')}</strong><span class="academic-teacher">${e(r.teacherName)}</span><div class="row-actions"><button class="mini-btn detail" data-detail="${e(r.id)}">Detail</button><button class="mini-btn" data-edit="${e(r.id)}">Edit</button><button class="mini-btn danger" data-delete="${e(r.id)}">Hapus</button></div></td></tr>`).join('')}</tbody></table></details>`;
    }).join('')}</div>`:'<p class="academic-day-empty">Tidak ada jadwal pada hari ini.</p>'}</details>`;
   }).join('')}</div></section>`;
  }).join('')||'<div class="empty-state">Tidak ada jadwal yang cocok.</div>';
  bindActions();
 };
 $('#addButton').onclick=add;$('#exportButton').onclick=exportCsv;
 for(const id of ['formalDay','formalYear'])$('#'+id).onchange=render;
 $('#formalSearch').oninput=render;
 const unitIds=[...new Set([...(cache.units||[]).map(u=>u.id),...rows.map(row=>row.unitId)])].sort((a,b)=>unitName(a).localeCompare(unitName(b),'id'));
 $('#formalUnitCards').innerHTML=unitIds.map(id=>`<button type="button" class="formal-unit-card" data-formal-unit="${e(id)}"><span class="formal-unit-icon" aria-hidden="true">▤</span><strong>${e(unitName(id))}</strong><span>${rows.filter(row=>row.unitId===id).length} jadwal pelajaran</span><b>Lihat jadwal <span aria-hidden="true">→</span></b></button>`).join('')||'<div class="empty-state">Belum ada unit sekolah.</div>';
 let opener=null;
 $('#formalUnitCards').onclick=event=>{
  const card=event.target.closest('[data-formal-unit]');if(!card)return;
  opener=card;selectedUnit=card.dataset.formalUnit;
  $('#formalUnitCards').hidden=true;$('#formalDetail').hidden=false;
  $('#formalUnitTitle').textContent=unitName(selectedUnit);render();$('#formalUnitTitle').focus();
 };
 $('#formalBack').onclick=()=>{
  selectedUnit=null;$('#formalDetail').hidden=true;$('#formalUnitCards').hidden=false;
  $('#formalGroups').innerHTML='';$('#formalSearch').value='';$('#formalDay').value='';$('#formalYear').value='';opener?.focus();
 };

}
