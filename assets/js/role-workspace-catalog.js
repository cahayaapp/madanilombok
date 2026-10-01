const entry=(id,label,icon='◇')=>({id,label,icon,feature:`workspace.${id}`});
export const WORKSPACE_GROUPS=[
 {label:'Layanan Wali & Pembinaan',items:[entry('parent-deposits','Pantau Penitipan','▣'),entry('deposit-admin','Layanan Penitipan','▣')]},
 {label:'Pembelajaran & Evaluasi',items:[entry('academic-followup','Tindak Lanjut Akademik','↗'),entry('teacher-case','Lapor Kasus / Pelanggaran','!'),entry('teacher-writing','Guru Menulis','✎'),entry('teacher-assessment','Self Asesmen Guru','◇'),entry('education-calendar','Kalender Pendidikan','▦'),entry('teacher-kpi','KPI & Evidence Guru','▥')]},
 {label:'Manajemen',items:[entry('management-control','Kontrol & Kondisi','◉'),entry('management-findings','Temuan & Tindak Lanjut','!'),entry('management-observation','Observasi','◎'),entry('management-coaching','Pembinaan Personil','◌'),entry('management-escalations','Eskalasi & Keputusan','↗'),entry('management-standards','Standar Kerja','≡'),entry('management-targets','Target & Arah','→'),entry('management-systemic','Masalah Sistemik','◇'),entry('management-kpi','KPI & Evidence Manajemen','▥')]},
 {label:'Lainnya',items:[entry('work-schedule','Jadwal & Ritme Kerja','◷'),entry('work-kpi','KPI — Bukti Kerja','▥'),entry('work-messages','Pesan Internal','✉'),entry('work-profile','Profil Saya','♙'),entry('work-guide','Panduan & Manual','?')]}
];
const utilities=['work-schedule','work-kpi','work-messages','work-profile','work-guide'];
const teaching=['academic-followup','teacher-case','teacher-writing','teacher-assessment','education-calendar','teacher-kpi'];
const managing=['management-control','management-findings','management-observation','management-coaching','management-kpi'];
const leadership=[...managing,'management-escalations','management-standards','management-targets','management-systemic'];
export const WORKSPACE_GRANTS={
 guru_mapel:[...utilities,...teaching],mentor_tahsin_tahfiz:[...utilities,...teaching],naqib:utilities,guru_wali:[...utilities],konselor:utilities,kasir:utilities,
 head_formal_school:[...utilities,...managing,'education-calendar'],head_boys_dorm:[...utilities,...managing],head_girls_dorm:[...utilities,...managing],
 deputy_director:[...utilities,...leadership],director:[...utilities,...leadership],admin:[...utilities,...leadership,...teaching,'deposit-admin'],super_admin:[...utilities,...leadership,...teaching,'deposit-admin'],wali_santri:['work-profile','work-guide','parent-deposits']
};
export function workspaceFeatures(role){return (WORKSPACE_GRANTS[role]||[]).map(id=>`workspace.${id}`);}
export const MANAGEMENT_ROLES=['head_formal_school','head_boys_dorm','head_girls_dorm','deputy_director','director','admin','super_admin'];
export const LEADERSHIP_ROLES=['deputy_director','director','admin','super_admin'];
