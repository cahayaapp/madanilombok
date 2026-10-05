import {groupTeacherName} from './group-teachers.js';
import {dailyForStudent,dailyForStaff} from './daily-schedules.js';
import {escapeHtml as e} from './utils.js';
export function recurringView(master,profile,yearId,student=null){
 const rows=(master.recurringSchedules||[]).filter(s=>dailyForStaff(s,profile,yearId)&&(!student||dailyForStudent(s,student,master))).sort((a,b)=>a.order-b.order);
 if(!rows.length)return '';
 return `<section class="panel"><h3>Jadwal Pekanan, Bulanan & Khusus</h3><p>Waktu mengikuti keterangan sumber; jam rinci belum ditentukan.</p><div class="stack-list">${rows.map(s=>`<article class="list-card"><div><span>${e(s.timeLabel)}</span><strong>${e(s.name)}</strong><small>${e(s.participantScope==='boarding_gema'?'Khusus GEMA':s.participantScope==='boarding_general'?'Asrama umum':'Peserta sesuai jadwal')}</small></div></article>`).join('')}</div></section>`;
}
export function arabicRosterView(master,profile,student=null){
 const gender=profile.scopeGender||profile.genderScope;
 const students=Object.fromEntries((master.students||[]).map(s=>[s.id,s]));
 const groups=(master.groups||[]).filter(g=>g.status!=='inactive'&&g.programType==='arabic'&&(!gender||g.gender===gender)&&(!student||master.groupAssignments?.[g.id]?.[student.id]));
 if(!groups.length)return '';
 return `<section class="panel"><h3>Kelompok Bahasa Arab Pagi</h3><div class="stack-list">${groups.map(g=>{const ids=Object.keys(master.groupAssignments?.[g.id]||{}).filter(id=>students[id]);return `<article class="list-card"><div><span>${e(g.timeLabel||'Ba’da Subuh')} · ${e(g.gender==='P'?'Putri':'Putra')}</span><strong>${e(g.name)}</strong><small>Pembina: ${e(groupTeacherName(g,master.staff||[]))}</small><p>${student?'Kelompok anak':ids.map(id=>e(students[id].name)).join(', ')||'Anggota belum terhubung'}</p>${g.rosterStatus==='needs_review'?'<small>Sebagian identitas peserta masih perlu konfirmasi.</small>':''}</div></article>`;}).join('')}</div></section>`;
}
