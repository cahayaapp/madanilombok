import {escapeHtml as e} from './utils.js';
const days=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Ahad'];
export function academicTimetableRows(ctx){
 const master=ctx.master,profile=ctx.session.profile||{},scope={...profile,...(profile.roleScopes?.[ctx.session.activeRole]||{})};
 const allowed=(ids,id)=>!Array.isArray(ids)||!ids.length||ids.includes(id);
 return (master.academicSchedules||[]).map(r=>{
  const classroom=(master.classes||[]).find(c=>c.id===r.classId),teacherId=r.teacherStaffId||r.staffId;
  const unitId=classroom?.unitId||r.unitId||'';
  return {...r,unitId,day:r.day==='Minggu'?'Ahad':r.day||'Hari belum diatur',
   unitName:(master.units||[]).find(u=>u.id===unitId)?.name||unitId||'Unit belum ditautkan',
   className:classroom?.name||r.classId||'—',subjectName:(master.subjects||[]).find(s=>s.id===r.subjectId)?.name||r.activityName||r.subjectId||'—',
   teacherName:(master.staff||[]).find(s=>s.id===teacherId)?.name||(teacherId?'SDM tidak ditemukan ('+teacherId+')':'Guru belum ditetapkan')};
 }).filter(r=>r.status!=='inactive'&&(!r.academicYearId||!ctx.yearId||r.academicYearId===ctx.yearId)&&allowed(scope.unitIds,r.unitId)&&allowed(scope.classIds,r.classId)&&(!r.subjectId||allowed(scope.subjectIds,r.subjectId)));
}
export function mountAcademicTimetable(ctx){
 const rows=academicTimetableRows(ctx),root=ctx.root;
 const units=[...new Map(rows.map(r=>[r.unitId,r.unitName]))].sort((a,b)=>a[1].localeCompare(b[1],'id'));
 root.innerHTML=`<section class="academic-timetable"><header class="academic-timetable-hero"><p class="eyebrow">AKADEMIK · JADWAL MENGAJAR</p><h1>Jadwal Pelajaran</h1><p>Jadwal per unit dan hari, dengan guru pengampu dari Data SDM.</p></header><div class="academic-timetable-filters"><label>Unit sekolah<select id="academicUnit"><option value="">Semua unit</option>${units.map(([id,name])=>`<option value="${e(id)}">${e(name)}</option>`).join('')}</select></label><label>Hari<select id="academicDay"><option value="">Semua hari</option>${days.map(day=>`<option>${day}</option>`).join('')}</select></label><label>Cari jadwal<input type="search" id="academicSearch" placeholder="Guru, kelas, atau mata pelajaran…"></label></div><p id="academicCount" aria-live="polite"></p><div id="academicTimetableGroups"></div></section>`;
 const $=s=>root.querySelector(s);
 function render(){
  const query=$('#academicSearch').value.trim().toLowerCase();
  const filtered=rows.filter(r=>(!$('#academicUnit').value||r.unitId===$('#academicUnit').value)&&(!$('#academicDay').value||r.day===$('#academicDay').value)&&(!query||[r.teacherName,r.className,r.subjectName].join(' ').toLowerCase().includes(query)));
  $('#academicCount').textContent=filtered.length+' jadwal';
  $('#academicTimetableGroups').innerHTML=units.map(([id,name])=>{
   const unitRows=filtered.filter(r=>r.unitId===id);if(!unitRows.length)return '';
   const orderedDays=$('#academicDay').value?[$('#academicDay').value]:[...days,...new Set(unitRows.map(r=>r.day).filter(day=>!days.includes(day)))];
   return `<section class="academic-unit"><h2>${e(name)}</h2><div class="academic-week-grid">${orderedDays.map(day=>{
    const daily=unitRows.filter(r=>r.day===day).sort((a,b)=>String(a.startTime||'').replace('.',':').localeCompare(String(b.startTime||'').replace('.',':'))||a.className.localeCompare(b.className,'id'));
    const classGroups=[...new Map(daily.map(r=>[r.classId||'',r.className]))].sort((a,b)=>a[1].localeCompare(b[1],'id',{numeric:true}));
    const classMarkup=classGroups.map(([classId,className])=>{
     const lessons=daily.filter(r=>(r.classId||'')===classId);
     return `<details class="academic-class-group"><summary><strong>${e(className)}</strong><span>${lessons.length} jadwal</span><b aria-hidden="true">⌄</b></summary><table class="data-table academic-day-table"><thead><tr><th>Jam</th><th>Pelajaran &amp; Guru</th></tr></thead><tbody>${lessons.map(r=>`<tr><td data-label="Waktu"><strong>${e(r.startTime||'—')}</strong><small>${e(r.endTime||'—')}</small></td><td data-label="Pelajaran & Guru"><strong class="academic-subject">${e(r.subjectName)}</strong><span class="academic-teacher">${e(r.teacherName)}</span></td></tr>`).join('')}</tbody></table></details>`;
    }).join('');
    return `<details class="academic-day academic-day-package"><summary class="academic-day-heading"><span class="eyebrow">JADWAL HARIAN</span><h3>${e(day)}</h3><p>${daily.length} jadwal <span>· WITA</span></p><span class="academic-day-toggle" aria-hidden="true">⌄</span></summary>${daily.length?`<div class="academic-class-list">${classMarkup}</div>`:'<p class="academic-day-empty">Tidak ada jadwal pada hari ini.</p>'}</details>`;
   }).join('')}</div></section>`;
  }).join('')||'<div class="empty-state">Belum ada jadwal yang sesuai dengan unit, penugasan, atau filter Anda.</div>';
 }
 $('#academicUnit').onchange=render;$('#academicDay').onchange=render;$('#academicSearch').oninput=render;render();
}
