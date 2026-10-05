import {mountHomeRoleSwitcher} from '../home-role-switcher.js';
import {renderManagementHome} from '../management-layout.js';
import {renderHealthHome} from '../health.js';
import {renderMentorHome} from '../mentoring.js';
import {renderTahfizHome} from '../tahfiz-home.js';
import {dailyForStaff} from '../daily-schedules.js';
import {renderTeacherHome} from '../teacher/home.js';
import {getNode,listNode} from '../repository.js';
import {ROLE_EXPERIENCE,localDate,filterScopedStudents} from '../role-experience.js';
import {pageHeader,panel,metric,escapeHtml,empty,badge} from './common.js';
import {renderParentHome} from './parent.js';
import {renderFinanceDashboard} from './finance.js';
export async function renderRoleHome(ctx,items) {
  try { await renderHomeContent(ctx,items); } finally { mountHomeRoleSwitcher(ctx); }
}
async function renderHomeContent(ctx,items) {
  const role=ctx.session.activeRole,exp=ROLE_EXPERIENCE[role];
  if(!exp){ctx.root.innerHTML=empty('Belum ada role aktif. Hubungi administrator.');return;}
  if(['director','deputy_director','head_formal_school','head_boys_dorm','head_girls_dorm'].includes(role))return renderManagementHome(ctx,items);
  if(role==='kesehatan')return renderHealthHome(ctx);
  if(role==='guru_wali')return renderMentorHome(ctx);
  if(role==='mentor_tahsin_tahfiz')return renderTahfizHome(ctx);
  if(role==='guru_mapel')return renderTeacherHome(ctx);
  if(role==='wali_santri') return renderParentHome(ctx);
  if(role==='kasir') return renderFinanceDashboard(ctx);
  const name=ctx.session.profile.displayName||ctx.session.profile.name||'Pengguna';
  const date=localDate(),uid=ctx.session.user.uid;
  const available=new Map(items.map(i=>[i.id,i]));
  const quick=exp.quick.map(id=>available.get(id)).filter(Boolean);
  const students=filterScopedStudents(ctx.master,ctx.session.profile,role);
  ctx.root.innerHTML=`<section class="role-hero"><div><p class="eyebrow light">${escapeHtml(exp.focus)}</p><p class="role-greeting">Assalamu’alaikum,</p><h2>${escapeHtml(name)}</h2><p>${escapeHtml(exp.title)}</p><span class="hero-role">${escapeHtml(ctx.roleName)}</span></div><div class="role-hero-date"><strong>${escapeHtml(date.slice(-2))}</strong><span>${new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</span></div></section>
    <div class="role-section-heading"><div><p class="eyebrow">MULAI HARI ANDA</p><h2>Akses Cepat Hari Ini</h2></div></div>
    <div class="role-quick-grid">${quick.map(i=>`<button type="button" class="role-quick-card" data-home-route="${i.id}"><span class="role-quick-icon">${i.icon}</span><span><strong>${escapeHtml(i.label)}</strong><small>${escapeHtml(exp.focus)}</small></span><b aria-hidden="true">›</b></button>`).join('')}</div>
    <div id="homeEvidence" class="role-evidence">${panel('Fokus Kerja',empty('Memuat ringkasan sesuai role…'))}</div>
    ${['admin','super_admin'].includes(role)?panel('Administrasi Master',`<div class="section-actions"><a class="btn btn-primary" href="../admin/index.html">Master Data</a><a class="btn btn-secondary" href="../admin/accounts.html">Akun & Role</a><a class="btn btn-secondary" href="../admin/validation.html">Validasi Data</a></div>`):''}`;
  ctx.root.querySelectorAll('[data-home-route]').forEach(btn=>btn.onclick=()=>ctx.navigate(btn.dataset.homeRoute));
  const mount=ctx.root.querySelector('#homeEvidence');
  try {
    let content='';
    if(['guru_mapel','mentor_tahsin_tahfiz'].includes(role)) {
      const rec=await getNode(`academic/teacher_attendance/${ctx.yearId}/${ctx.session.profile.staffId||uid}/${date}`);
      const day=new Intl.DateTimeFormat('id-ID',{weekday:'long',timeZone:'Asia/Makassar'}).format(new Date());
      const classIds=new Set(students.map(s=>ctx.master.classAssignments?.[s.id]?.classId).filter(Boolean));
      const schedules=(ctx.master.academicSchedules||[]).filter(s=>s.day===day && classIds.has(s.classId) && (!ctx.session.profile.subjectIds?.length||ctx.session.profile.subjectIds.includes(s.subjectId)));
      content=panel('Hari Ini',`<div class="portal-metrics compact">${metric('Presensi Anda',rec?.status||'Belum tercatat',date)}${metric('Jadwal Hari Ini',String(schedules.length),'Jadwal dalam scope aktif','cyan')}</div><p class="role-hint">${rec?'Lanjutkan presensi santri dan laporan pembelajaran.':'Catat kehadiran sebelum memulai pendampingan.'}</p>`);
    } else if(role==='konselor') {
      const allowed=new Set(students.map(s=>s.id));
      const cases=(await listNode(`boarding/cases/${ctx.yearId}`)).filter(c=>allowed.has(c.studentId));
      content=panel('Perlu Ditindaklanjuti',`<div class="portal-metrics compact">${metric('Kasus Masuk',String(cases.filter(c=>!c.assignedCounselorUid&&!['selesai','tidak_terbukti'].includes(c.status)).length),'Belum ditangani','coral')}${metric('Kasus Aktif Anda',String(cases.filter(c=>c.assignedCounselorUid===uid&&!['selesai','tidak_terbukti'].includes(c.status)).length),'Tanggung jawab Anda')}</div>`);
    } else if(role==='naqib') {
      const reports=(await listNode(`boarding/program_reports/${ctx.yearId}`)).filter(r=>r.naqibUid===uid&&r.date===date);
      const gender=ctx.session.profile.scopeGender||ctx.session.profile.genderScope;
      const schedules=(ctx.master.dailySchedules||[]).filter(s=>dailyForStaff(s,ctx.session.profile,ctx.yearId));
      content=panel('Program & Evidence Hari Ini',`<div class="portal-metrics compact">${metric('Program Terjadwal',String(schedules.length),'Scope asrama aktif')}${metric('Laporan Anda',String(reports.length),date,'cyan')}</div><p class="role-hint">Belum ada laporan berarti belum tercatat, bukan otomatis program tidak berjalan.</p>`);
    } else if(role==='guru_wali') {
      const ids=ctx.session.profile.menteeStudentIds||students.filter(s=>ctx.session.profile.classIds?.includes(ctx.master.classAssignments?.[s.id]?.classId)).map(s=>s.id);
      const records=await Promise.all(ids.map(id=>listNode(`boarding/mentoring/${ctx.yearId}/${id}`)));
      const sessions=records.flat();
      content=panel('Pendampingan Anda',`<div class="portal-metrics compact">${metric('Santri Binaan',String(ids.length),'Penugasan aktif')}${metric('Target Menunggu Evaluasi',String(sessions.filter(s=>s.target&&(!s.targetResultStatus||s.targetResultStatus==='BELUM_DINILAI')).length),'Perbarui hasil pada rekam yang sama','cyan')}</div>`);
    } else {
      content=panel('Ruang Kerja',`<p class="role-hint">${escapeHtml(exp.title)} Buka kontrol untuk meninjau evidence, temuan, dan tindak lanjut dalam lingkup tanggung jawab Anda.</p><div class="portal-metrics compact">${metric('Santri dalam Scope',String(students.length),'Master tahun ajaran aktif')}${metric('Tahun Ajaran',ctx.year?.name||'Belum diatur','Lengkapi master sebelum pencatatan','cyan')}</div>`);
    }
    if(mount.isConnected) mount.innerHTML=content;
  } catch(error) {
    if(mount.isConnected) mount.innerHTML=panel('Ringkasan belum tersedia',`<p>${escapeHtml(error.message||'Koneksi data gagal.')} Akses cepat tetap dapat digunakan.</p>`);
  }
}
