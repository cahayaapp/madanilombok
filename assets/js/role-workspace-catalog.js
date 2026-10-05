const entry=(id,label,icon='◇')=>({id,label,icon,feature:`workspace.${id}`});
export const WORKSPACE_GROUPS=[
 {label:'Layanan Wali & Pembinaan',items:[entry('parent-deposits','Pantau Penitipan','▣'),entry('deposit-admin','Layanan Penitipan','▣')]},
 {label:'Pembelajaran & Evaluasi',items:[entry('academic-followup','Tindak Lanjut Akademik','↗'),entry('teacher-case','Lapor Kasus / Pelanggaran','!'),entry('teacher-writing','Guru Menulis','✎'),entry('teacher-assessment','Self Asesmen Guru','◇'),entry('education-calendar','Kalender Pendidikan','▦'),entry('teacher-kpi','KPI & Evidence Guru','▥')]},
 {label:'Manajemen',items:[entry('management-control','Kontrol & Kondisi','◉'),entry('management-people','Personil & Penugasan','♙'),entry('management-learning','Pelaksanaan Pembelajaran','▦'),entry('management-materials','Target & Capaian Materi','≡'),entry('management-scores','Progres Input Nilai','◇'),entry('management-reports','Peninjauan & Publikasi Rapor','▤'),entry('management-programs','Program & Pembinaan','◷'),entry('management-mentoring','Pemantauan Guru Wali','◌'),entry('management-history','Riwayat Manajemen','↺'),entry('management-residents','Pengaturan Guru Mukim','⌂'),entry('management-worship','Absensi Ibadah Personil','☾'),entry('management-changes','Perubahan Sistem','↻'),entry('management-findings','Temuan & Tindak Lanjut','!'),entry('management-observation','Observasi','◎'),entry('management-coaching','Pembinaan Personil','◌'),entry('management-escalations','Eskalasi & Keputusan','↗'),entry('management-standards','Standar Kerja','≡'),entry('management-targets','Target & Arah','→'),entry('management-systemic','Masalah Sistemik','◇'),entry('management-kpi','KPI & Evidence Manajemen','▥')]},
 {label:'Lainnya',items:[entry('work-schedule','Jadwal & Ritme Kerja','◷'),entry('work-kpi','KPI — Bukti Kerja','▥'),entry('work-messages','Pesan Internal','<svg viewBox="0 0 24 24" class="chat-menu-icon" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H6l-4 3 1.5-6A8 8 0 1 1 21 11Z"/><path d="M7 10h9M7 14h6"/></svg>'),entry('work-followups','Tindak Lanjut Saya','↗'),entry('work-profile','Profil Saya','♙'),entry('work-guide','Panduan & Manual','?')]}
];
const utilities=['work-schedule','work-kpi','work-messages','work-followups','work-profile','work-guide'];
const teaching=['academic-followup','teacher-case','teacher-writing','teacher-assessment','education-calendar','teacher-kpi'];
const managing=['management-control','management-people','management-history','management-findings','management-observation','management-coaching','management-kpi'];
const leadership=[...managing,'management-learning','management-materials','management-scores','management-reports','management-programs','management-mentoring','management-escalations','management-standards','management-targets','management-systemic','management-changes'];
export const WORKSPACE_GRANTS={
 kesehatan:utilities,
 guru_mapel:[...utilities,...teaching],mentor_tahsin_tahfiz:[...utilities],naqib:utilities,guru_wali:[...utilities],konselor:utilities,kasir:utilities,
 head_formal_school:[...utilities,...managing,'management-residents','management-worship','management-learning','management-materials','management-scores','management-reports','education-calendar'],head_boys_dorm:[...utilities,...managing,'management-worship','management-programs','management-mentoring'],head_girls_dorm:[...utilities,...managing,'management-worship','management-programs','management-mentoring'],
 deputy_director:[...utilities,...leadership],director:[...utilities,...leadership],admin:[...utilities,...leadership,...teaching,'deposit-admin'],super_admin:[...utilities,...leadership,...teaching,'deposit-admin'],wali_santri:['work-profile','work-guide','parent-deposits']
};
// Naqib already has the dedicated naqib-case menu; avoid a duplicate reporting link.
for(const role of Object.keys(WORKSPACE_GRANTS))if(!['wali_santri','naqib'].includes(role))WORKSPACE_GRANTS[role]=[...new Set([...WORKSPACE_GRANTS[role],'teacher-case'])];
export function workspaceFeatures(role){return (WORKSPACE_GRANTS[role]||[]).map(id=>`workspace.${id}`);}
export const MANAGEMENT_ROLES=['head_formal_school','head_boys_dorm','head_girls_dorm','deputy_director','director','admin','super_admin'];
export const LEADERSHIP_ROLES=['deputy_director','director','admin','super_admin'];
