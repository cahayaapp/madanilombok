import {teachingGroups} from './group-teachers.js';
// Navigation and role composition are data-only; no Firebase reads or writes here.
export const ROLE_EXPERIENCE = {
  kesehatan:{title:'Pelayanan kesehatan dan UKS santri.',focus:'Kesehatan / UKS',primary:'health-examination',quick:['health-journal','health-examination','health-permits','health-stock'],schedule:'work-schedule'},
  guru_mapel: {title:'Siap mengajar dan mendampingi hari ini.', focus:'Pembelajaran', primary:'teacher-attendance', quick:['teacher-attendance','student-attendance','lesson-plans','grades'], schedule:'schedule', kpi:'teacher-kpi'},
  mentor_tahsin_tahfiz: {title:'Dampingi bacaan dan perkembangan hafalan santri.', focus:'Tahsin & Tahfiz', primary:'quran', quick:['quran','work-schedule','work-profile','work-guide'], schedule:'work-schedule', kpi:'work-kpi'},
  naqib: {title:'Kawal program, dampingi santri, catat perkembangannya.', focus:'Program hari ini', primary:'naqib-programs', quick:['naqib-programs','naqib-attendance','naqib-report','naqib-case'], schedule:'naqib-programs', kpi:'naqib-kpi'},
  guru_wali: {title:'Satu pendampingan, satu langkah perbaikan.', focus:'Santri binaan', primary:'mentee-list', quick:['mentee-list','mentoring','mentoring-targets','mentoring-history'], schedule:'work-schedule', kpi:'mentoring-kpi'},
  konselor: {title:'Tangani kasus dengan tabayyun dan tindak lanjut.', focus:'Antrean kasus', primary:'case-inbox', quick:['case-inbox','case-active','counseling','case-escalation'], schedule:'work-schedule', kpi:'counselor-kpi'},
  head_formal_school: {title:'Pantau pembelajaran dan tuntaskan temuan pendidikan.', focus:'Kontrol pendidikan', primary:'management-control', quick:['management-control','management-findings','management-observation','management-coaching'], schedule:'work-schedule', kpi:'management-kpi'},
  head_boys_dorm: {title:'Kawal mutu program dan pembinaan asrama putra.', focus:'Kontrol asrama putra', primary:'management-control', quick:['management-control','management-findings','management-observation','management-coaching'], schedule:'work-schedule', kpi:'management-kpi'},
  head_girls_dorm: {title:'Kawal mutu program dan pembinaan asrama putri.', focus:'Kontrol asrama putri', primary:'management-control', quick:['management-control','management-findings','management-observation','management-coaching'], schedule:'work-schedule', kpi:'management-kpi'},
  deputy_director: {title:'Evaluasi kendali divisi dan tindak lanjuti eskalasi.', focus:'Supervisi', primary:'management-control', quick:['management-control','management-escalations','management-standards','management-coaching'], schedule:'work-schedule', kpi:'management-kpi'},
  director: {title:'Arahkan prioritas dan putuskan eskalasi pesantren.', focus:'Arah & keputusan', primary:'management-control', quick:['management-control','management-escalations','management-targets','management-systemic'], schedule:'work-schedule', kpi:'management-kpi'},
  admin: {title:'Kelola master data dan layanan administrasi.', focus:'Administrasi', primary:'management-control', quick:['management-control','work-messages','work-profile','work-guide'], schedule:'work-schedule', kpi:'work-kpi'},
  super_admin: {title:'Jaga konfigurasi, akses, dan kualitas data pesantren.', focus:'Administrasi sistem', primary:'management-control', quick:['management-control','work-messages','work-profile','work-guide'], schedule:'work-schedule', kpi:'work-kpi'},
  kasir: {title:'Layani transaksi sesuai unit kasir Anda.', focus:'Kasir', primary:'cashier', quick:['cashier','finance-products','finance-history','finance-dashboard'], schedule:'work-schedule', kpi:'work-kpi'},
  wali_santri: {title:'Ikuti kabar dan perkembangan Ananda.', focus:'Ananda', primary:'parent-home', quick:['parent-news','parent-attendance','parent-permission','parent-finance'], schedule:'parent-calendar', kpi:'parent-monthly'}
};
export function effectiveProfile(session) {
  const role=session.activeRole;
  const profile={...session.profile,...(session.profile?.roleScopes?.[role]||{})};
  if(role==='head_boys_dorm') profile.scopeGender=profile.genderScope='L';
  if(role==='head_girls_dorm') profile.scopeGender=profile.genderScope='P';
  return profile;
}
export function localDate(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part=key=>parts.find(p=>p.type===key).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function sessionForRole(session,role) {
  if(!session.roles.includes(role)) throw new Error('Role tidak ditugaskan pada akun ini.');
  const scoped={...session,activeRole:role};
  return {...scoped,profile:effectiveProfile(scoped)};
}
export function filterScopedStudents(master,profile,role) {
  let rows=master.students||[];
  if(role==='mentor_tahsin_tahfiz'){const groups=teachingGroups(master,profile,'quran');return rows.filter(s=>groups.some(g=>master.groupAssignments?.[g.id]?.[s.id]));}
  if(role==='wali_santri') return rows.filter(s=>(profile.studentIds||[profile.studentId]).includes(s.id));
  if(role==='guru_wali')return rows.filter(s=>{const a=master.mentorAssignments?.[s.id];return a?!!profile.staffId&&a.status==='active'&&a.mentorStaffId===profile.staffId:!!profile.menteeStudentIds?.includes(s.id);});
  const gender=profile.scopeGender||profile.genderScope;
  if(gender) rows=rows.filter(s=>s.gender===gender);
  if(profile.unitIds?.length) rows=rows.filter(s=>profile.unitIds.includes(s.unitId));
  if(profile.classIds?.length) rows=rows.filter(s=>profile.classIds.includes(master.classAssignments?.[s.id]?.classId));
  if(role==='guru_wali') {
    if(profile.menteeStudentIds?.length) rows=rows.filter(s=>profile.menteeStudentIds.includes(s.id));
    else if(!profile.classIds?.length) rows=[];
  }
  if(profile.groupIds?.length) rows=rows.filter(s=>profile.groupIds.some(id=>master.groupAssignments?.[id]?.[s.id]));
  return rows;
}
export function bottomRoutes(role,canRoute) {
  const exp=ROLE_EXPERIENCE[role]||{};
  const safe=(id,fallback)=>canRoute(id)?id:(canRoute(fallback)?fallback:null);
  return {schedule:safe(exp.schedule,'work-schedule'),kpi:null,home:'dashboard',messages:safe(role==='wali_santri'?'parent-messages':'work-messages',null)};
}
