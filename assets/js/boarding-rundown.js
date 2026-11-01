import {escapeHtml as e} from './utils.js';
import {naqibProgramEnabled} from './naqib-program-policy.js';
const days=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Ahad'];
export function boardingAudience(row,program={}){
 if(row.participantScope==='boarding_gema')return ['gema'];
 if(row.participantScope==='boarding_general')return ['umum'];
 if(['all_boarding','all_students'].includes(row.participantScope))return ['gema','umum'];
 if(/asrama\s+gema/i.test(program.name||''))return ['gema'];
 if(/asrama\s+umum/i.test(program.name||''))return ['umum'];
 return ['gema','umum'];
}
export function orderRundown(rows,programs=[]){
 const minutes=time=>{const m=/^(\d{1,2})[:.](\d{2})$/.exec(time||'');return m?Number(m[1])*60+Number(m[2]):null;};
 const name=row=>programs.find(p=>p.id===row.programId)?.name||'';
 const wakes=rows.filter(r=>/bangun\s*(tidur)?/i.test(name(r))).map(r=>minutes(r.startTime)).filter(n=>n!==null);
 const start=wakes.length?Math.min(...wakes):0;
 const position=r=>minutes(r.startTime)===null?Infinity:(minutes(r.startTime)-start+1440)%1440;
 return [...rows].sort((a,b)=>position(a)-position(b)||String(a.id).localeCompare(String(b.id)));
}
export function mountBoardingRundown({root,cache,add,bindActions}){
 const all=cache['daily-schedules']||[],programs=cache.programs||[];
 const program=row=>programs.find(p=>p.id===row.programId)||{};
 const active=row=>row.status!=='inactive'&&program(row).status!=='inactive';
 let selected=null,opener=null;
 root.innerHTML=`<section class="admin-page-hero"><div><p class="eyebrow">RITME KEHIDUPAN SANTRI</p><h2>Jadwal Keasramaan</h2><p>Pilih GEMA atau UMUM untuk melihat rundown kegiatan dari bangun hingga tidur kembali.</p></div><button class="btn btn-primary" id="addDaily">+ Tambah Jadwal</button></section><div class="formal-unit-cards" id="boardingAudienceCards">${['gema','umum'].map(id=>`<button type="button" class="formal-unit-card" data-boarding-audience="${id}"><span class="formal-unit-icon" aria-hidden="true">${id==='gema'?'▤':'⌂'}</span><strong>${id.toUpperCase()}</strong><span>${all.filter(r=>boardingAudience(r,program(r)).includes(id)&&active(r)).length} kegiatan aktif</span><b>Lihat rundown <span aria-hidden="true">→</span></b></button>`).join('')}</div><section id="boardingRundown" hidden><button class="btn btn-secondary" id="backBoarding">← Kembali ke GEMA &amp; UMUM</button><header class="rundown-heading"><div><p class="eyebrow">RUNDOWN HARIAN · WITA</p><h3 id="rundownTitle"></h3></div><span class="badge" id="programCount"></span></header><div class="toolbar"><input id="programSearch" type="search" aria-label="Cari kegiatan" placeholder="Cari kegiatan atau waktu…"><select id="programDay" aria-label="Hari"><option value="">Semua Hari</option>${days.map(d=>`<option>${d}</option>`).join('')}</select><select id="programStatus" aria-label="Status"><option value="active">Aktif</option><option value="">Semua Status</option><option value="inactive">Nonaktif</option></select></div><ol class="boarding-timeline" id="dailyProgramCards"></ol></section>`;
 const $=s=>root.querySelector(s);
 function render(){
  const query=$('#programSearch').value.trim().toLowerCase(),day=$('#programDay').value,status=$('#programStatus').value;
  const audience=all.filter(r=>boardingAudience(r,program(r)).includes(selected));
  const ordered=orderRundown(audience,programs);
  const rows=ordered.filter(r=>(!status||active(r)===(status==='active'))&&(!day||r.day==='Setiap Hari'||r.day===day||(day==='Ahad'&&r.day==='Minggu'))&&(!query||[program(r).name,program(r).category,r.startTime,r.endTime].join(' ').toLowerCase().includes(query)));
  $('#programCount').textContent=rows.length+' kegiatan';
  $('#dailyProgramCards').innerHTML=rows.map((r,i)=>{
   const p=program(r),name=(p.name||r.programId||'Kegiatan belum ditautkan').replace(/^Asrama (?:Umum|GEMA) \d{2}[:.]\d{2}\s*·\s*/i,'');
   return `<li class="rundown-item"><div class="rundown-clock"><b>${e(r.startTime||'—')}</b><span>${e(r.endTime?'– '+r.endTime:'')}</span></div><article class="admin-program-card"><header><span class="rundown-number" aria-hidden="true">${i+1}</span><div><small>${e(p.category||'Kegiatan Asrama')}</small><h3>${e(name)}</h3></div></header><p>${e(r.day||'Hari belum diatur')} · ${e(({L:'Putra',P:'Putri'})[r.genderScope]||'Putra & Putri')}</p>${p.description||p.detail?`<p class="rundown-description">${e(p.description||p.detail)}</p>`:''}<div class="program-flags"><span class="badge">${active(r)?'Aktif':'Nonaktif'}</span><span class="badge">${naqibProgramEnabled(r,p)?'Wajib Presensi':'Tanpa Presensi'}</span><span class="badge">${naqibProgramEnabled(r,p,'report')?'Wajib Laporan':'Tanpa Laporan'}</span></div><div class="row-actions"><button class="mini-btn" data-edit="${e(r.id)}">Edit Jadwal</button><button class="mini-btn danger" data-delete="${e(r.id)}">Hapus</button></div></article></li>`;
  }).join('')||'<li class="empty-state">Tidak ada kegiatan yang cocok.</li>';
  bindActions();
 }
 $('#boardingAudienceCards').onclick=event=>{const card=event.target.closest('[data-boarding-audience]');if(!card)return;selected=card.dataset.boardingAudience;opener=card;$('#boardingAudienceCards').hidden=true;$('#boardingRundown').hidden=false;$('#rundownTitle').textContent='Asrama '+selected.toUpperCase();render();$('#backBoarding').focus();};
 $('#backBoarding').onclick=()=>{selected=null;$('#boardingRundown').hidden=true;$('#boardingAudienceCards').hidden=false;$('#dailyProgramCards').innerHTML='';$('#programSearch').value='';$('#programDay').value='';$('#programStatus').value='active';opener?.focus();};
 $('#programSearch').oninput=render;$('#programDay').onchange=render;$('#programStatus').onchange=render;$('#addDaily').onclick=add;
}
