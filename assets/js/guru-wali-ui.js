import {escapeHtml as e} from './utils.js';
import {icon} from './teacher/ui.js';
export function decorateGuruWali(ctx,route){
 if(ctx.session.activeRole!=='guru_wali')return;
 ctx.root.classList.add('guru-wali-premium');
 ctx.root.dataset.mentorView=route;
 if(route==='dashboard')return;
 const header=ctx.root.querySelector('.section-head,.workspace-page-head,.mentor-workspace-hero');
 if(header&&!header.querySelector('[data-mentor-home]')){
  header.classList.add('mentor-workspace-hero');
  const back=document.createElement('button');back.type='button';back.className='mentor-back';back.dataset.mentorHome='';back.textContent='← Beranda';back.onclick=()=>ctx.navigate('dashboard');(header.querySelector(':scope > div')||header).prepend(back);
 }
}
export function renderMentorRoster(ctx,list){
 const classroom=student=>(ctx.master.classes||[]).find(c=>c.id===ctx.master.classAssignments?.[student.id]?.classId);
 const unit=student=>(ctx.master.units||[]).find(u=>u.id===(classroom(student)?.unitId||student.unitId))?.name||classroom(student)?.unitId||student.unitId||'Unit belum ditetapkan';
 ctx.root.innerHTML=`<section class="mentor-roster"><header class="mentor-workspace-hero"><div><span class="mu-eyebrow">RUANG PENDAMPINGAN · GURU WALI</span><h1>Santri Binaan</h1><p>Kenali setiap santri, dampingi prosesnya, dan rayakan langkah pertumbuhannya.</p></div><span class="mentor-hero-icon" aria-hidden="true">${icon('people')}</span></header><div class="mentor-overview"><article>${icon('people')}<div><strong>${list.length}</strong><span>Santri binaan</span></div></article><article>${icon('book')}<div><strong>${new Set(list.map(s=>classroom(s)?.id).filter(Boolean)).size}</strong><span>Kelas binaan</span></div></article><article>${icon('home')}<div><strong>${new Set(list.map(s=>classroom(s)?.unitId||s.unitId).filter(Boolean)).size}</strong><span>Unit pendampingan</span></div></article></div><div class="mentor-roster-toolbar"><div><h2>Teman Bertumbuh</h2><p>Santri dalam penugasan aktif Anda.</p></div><label>Cari santri<input type="search" id="mentorRosterSearch" placeholder="Nama, kelas, atau nomor santri…"></label></div><div id="mentorRosterCards" class="mentor-roster-grid"></div><div class="mentor-roster-actions"><button class="mu-primary" data-mentor-route="mentoring">Mulai Mentoring</button><button class="mentor-secondary" data-mentor-route="mentoring-history">Lihat Riwayat</button></div></section>`;
 const render=()=>{
  const q=ctx.root.querySelector('#mentorRosterSearch').value.trim().toLowerCase();
  const rows=list.filter(s=>[s.name,s.studentNo,s.id,classroom(s)?.name,unit(s)].join(' ').toLowerCase().includes(q));
  ctx.root.querySelector('#mentorRosterCards').innerHTML=rows.map(s=>`<article class="mentor-student-card"><div class="mentor-student-identity"><span class="mentor-student-avatar" aria-hidden="true">${e((s.name||'S').slice(0,1))}</span><div><h3>${e(s.name)}</h3><span>${e(s.studentNo||s.id)}</span></div></div><dl><div><dt>Kelas</dt><dd>${e(classroom(s)?.name||'Belum ditetapkan')}</dd></div><div><dt>Unit</dt><dd>${e(unit(s))}</dd></div></dl><span class="mentor-student-status">${e(({boarding:'Asrama',non_boarding:'Nonasrama',fullday:'Fullday'})[s.boardingStatus]||s.boardingStatus||'Status belum ditetapkan')}</span></article>`).join('')||'<div class="mu-note">Tidak ada santri yang sesuai dengan pencarian atau penugasan Anda.</div>';
 };
 ctx.root.querySelector('#mentorRosterSearch').oninput=render;ctx.root.querySelectorAll('[data-mentor-route]').forEach(b=>b.onclick=()=>ctx.navigate(b.dataset.mentorRoute));render();
}
export function renderMentorGuide(ctx){
 const steps=[['people','Kenali & dengarkan','Pilih santri binaan dan tanggal pertemuan. Mulai dengan percakapan yang membuat santri nyaman.'],['book','Refleksikan perkembangannya','Bahas pengalaman sepekan melalui wawancara lima dimensi. Skor membantu dialog, bukan label bagi santri.'],['check','Temukan hal yang disyukuri','Catat apresiasi dan kemajuan kecil sebagai dasar untuk menyusun langkah berikutnya.'],['flag','Tentukan fokus pertumbuhan','Pilih Perbaiki atau Tingkatkan, lalu sepakati target, alasan yang bermakna, dan strategi pekan ini.'],['chart','Tinjau hasil bersama','Buka Target & Hasil pada pertemuan berikutnya. Perbarui hasil pada sesi yang sama agar proses tetap tersambung.']];
 ctx.root.innerHTML=`<section class="mentor-guide"><header class="mentor-workspace-hero"><div><span class="mu-eyebrow">PANDUAN PENDAMPINGAN</span><h1>Menemani Proses Bertumbuh</h1><p>Langkah sederhana untuk mentoring yang hangat, terarah, dan berkesinambungan.</p></div><span class="mentor-hero-icon" aria-hidden="true">${icon('book')}</span></header><div class="mentor-guide-grid">${steps.map(([ico,title,description],i)=>`<article class="mentor-guide-step"><span class="mentor-guide-icon" aria-hidden="true">${icon(ico)}</span><span class="mu-eyebrow">LANGKAH ${i+1}</span><h2>${e(title)}</h2><p>${e(description)}</p></article>`).join('')}</div><aside class="mentor-guide-note"><strong>Ruang aman untuk pendampingan</strong><p>Guru Wali mendampingi pertumbuhan santri. Pendampingan ini bukan diagnosis dan tidak menggantikan penanganan kasus oleh konselor.</p></aside><button class="mu-primary" id="mentorGuideStart">Mulai Mentoring</button></section>`;
 ctx.root.querySelector('#mentorGuideStart').onclick=()=>ctx.navigate('mentoring');
}
