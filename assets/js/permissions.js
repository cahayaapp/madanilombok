import { WORKSPACE_GROUPS, workspaceFeatures } from "./role-workspace-catalog.js";
export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  director: "Direktur",
  deputy_director: "Wakil Direktur",
  head_formal_school: "Kepala Sekolah Formal",
  head_boys_dorm: "Kepala Asrama Putra",
  head_girls_dorm: "Kepala Asrama Putri",
  guru_mapel: "Guru Mapel",
  guru_wali: "Guru Wali",
  mentor_tahsin_tahfiz: "Mentor Tahsin Tahfiz",
  naqib: "Naqib",
  konselor: "Konselor",
  kasir: "Kasir",
  wali_santri: "Wali Santri"
};

export const MENU_GROUPS = [
  {
    label: "Utama",
    items: [
      { id: "dashboard", label: "Beranda", icon: "⌂" }
    ]
  },
  {
    label: "Akademik",
    items: [
      { id: "teacher-attendance", label: "Presensi Guru", icon: "✓", feature: "academic.teacher_attendance" },
      { id: "student-attendance", label: "Presensi Santri", icon: "◎", feature: "academic.student_attendance" },
      { id: "quran", label: "Tahsin Tahfiz", icon: "◫", feature: "academic.quran" },
      { id: "grades", label: "Nilai", icon: "◇", feature: "academic.grades" },
      { id: "schedule", label: "Jadwal Pelajaran", icon: "▦", feature: "academic.schedule" },
      { id: "lesson-plans", label: "Rencana Pembelajaran", icon: "≡", feature: "academic.lesson_plans" }
    ]
  },
  {
    label: "Asrama · Naqib",
    items: [
      { id: "naqib-programs", label: "Program Hari Ini", icon: "◷", feature: "boarding.naqib.programs" },
      { id: "naqib-attendance", label: "Presensi Program", icon: "✓", feature: "boarding.naqib.attendance" },
      { id: "naqib-report", label: "Laporan Pelaksanaan", icon: "▤", feature: "boarding.naqib.reports" },
      { id: "naqib-initiative", label: "Inisiatif Santri", icon: "✦", feature: "boarding.naqib.initiatives" },
      { id: "naqib-example", label: "Naqib Teladan", icon: "☆", feature: "boarding.naqib.example" },
      { id: "naqib-assessment", label: "Asesmen Santri", icon: "◈", feature: "boarding.naqib.assessment" },
      { id: "naqib-case", label: "Lapor Kasus", icon: "!", feature: "boarding.naqib.case_report" },
      { id: "naqib-discipline", label: "Skor Kedisiplinan", icon: "±", feature: "boarding.naqib.discipline" },
      { id: "naqib-self", label: "Self Review Naqib", icon: "◉", feature: "boarding.naqib.self_review" },
      { id: "naqib-history", label: "Riwayat Naqib", icon: "↺", feature: "boarding.naqib.history" },
      { id: "naqib-kpi", label: "KPI & Evidence", icon: "▥", feature: "boarding.naqib.kpi" },
      { id: "naqib-guide", label: "Panduan Kerja", icon: "?", feature: "boarding.naqib.guide" }
    ]
  },
  {
    label: "Asrama · Guru Wali",
    items: [
      { id: "mentee-list", label: "Santri Binaan", icon: "♙", feature: "boarding.mentor.students" },
      { id: "mentoring", label: "Mentoring Individu", icon: "◌", feature: "boarding.mentor.session" },
      { id: "mentoring-targets", label: "Target & Hasil", icon: "→", feature: "boarding.mentor.targets" },
      { id: "mentoring-history", label: "Riwayat Mentoring", icon: "↺", feature: "boarding.mentor.history" },
      { id: "mentoring-kpi", label: "KPI & Evidence", icon: "▥", feature: "boarding.mentor.kpi" },
      { id: "mentoring-guide", label: "Panduan", icon: "?", feature: "boarding.mentor.guide" }
    ]
  },
  {
    label: "Asrama · Konselor",
    items: [
      { id: "case-inbox", label: "Kasus Masuk", icon: "!", feature: "boarding.counselor.cases" },
      { id: "case-active", label: "Kasus Aktif", icon: "◉", feature: "boarding.counselor.active" },
      { id: "counseling", label: "Catat Konseling", icon: "◍", feature: "boarding.counselor.session" },
      { id: "case-actions", label: "Tindakan Edukatif", icon: "✓", feature: "boarding.counselor.actions" },
      { id: "discipline-points", label: "Finalisasi Poin", icon: "±", feature: "boarding.counselor.points" },
      { id: "warning-letter", label: "Surat Peringatan", icon: "▧", feature: "boarding.counselor.sp" },
      { id: "case-escalation", label: "Eskalasi", icon: "↗", feature: "boarding.counselor.escalation" },
      { id: "case-history", label: "Riwayat Kasus", icon: "↺", feature: "boarding.counselor.history" },
      { id: "counselor-self", label: "Self Asesmen", icon: "◇", feature: "boarding.counselor.self" },
      { id: "counselor-kpi", label: "KPI & Evidence", icon: "▥", feature: "boarding.counselor.kpi" },
      { id: "counselor-guide", label: "Panduan Kerja", icon: "?", feature: "boarding.counselor.guide" }
    ]
  },
  {
    label: "Wali Santri",
    items: [
      { id: "parent-home", label: "Beranda Anak", icon: "♡", feature: "parent.home" },
      { id: "parent-news", label: "Kabar Ananda", icon: "✦", feature: "parent.news" },
      { id: "parent-calendar", label: "Kalender Wali", icon: "◷", feature: "parent.calendar" },
      { id: "parent-programs", label: "Program Harian", icon: "☷", feature: "parent.programs" },
      { id: "parent-schedule", label: "Jadwal Pembelajaran", icon: "▦", feature: "parent.schedule" },
      { id: "parent-attendance", label: "Kehadiran", icon: "✓", feature: "parent.attendance" },
      { id: "parent-monthly", label: "Laporan Bulanan", icon: "▤", feature: "parent.monthly" },
      { id: "parent-academic", label: "Laporan Akademik & Rapor", icon: "◇", feature: "parent.academic" },
      { id: "parent-quran", label: "Tahsin Tahfiz", icon: "◫", feature: "parent.quran" },
      { id: "parent-character", label: "Laporan Karakter", icon: "☆", feature: "parent.character" },
      { id: "parent-nurturing", label: "Laporan Pembinaan", icon: "⌂", feature: "parent.nurturing" },
      { id: "parent-mentoring", label: "Laporan Mentoring", icon: "◌", feature: "parent.mentoring" },
      { id: "parent-health", label: "Riwayat Kesehatan", icon: "+", feature: "parent.health" },
      { id: "parent-rules", label: "Tata Tertib", icon: "≡", feature: "parent.rules" },
      { id: "parent-permission", label: "Izin Santri", icon: "↗", feature: "parent.permissions" },
      { id: "parent-messages", label: "Pesan", icon: "✉", feature: "parent.messages" },
      { id: "parent-announcements", label: "Informasi Penting", icon: "◒", feature: "parent.announcements" },
      { id: "parent-finance", label: "Keuangan", icon: "Rp", feature: "parent.finance" }
    ]
  },
  {
    label: "Keuangan",
    items: [
      { id: "finance-dashboard", label: "Ringkasan Keuangan", icon: "Rp", feature: "finance.dashboard" },
      { id: "finance-bills", label: "SPP & Tagihan", icon: "▤", feature: "finance.bills" },
      { id: "finance-payments", label: "Pembayaran", icon: "✓", feature: "finance.payments" },
      { id: "finance-wallets", label: "Saldo Santri", icon: "◉", feature: "finance.wallets" },
      { id: "cashier", label: "Kasir Kantin/Koperasi", icon: "▣", feature: "finance.cashier" },
      { id: "finance-products", label: "Produk & Stok", icon: "□", feature: "finance.products" },
      { id: "finance-history", label: "Riwayat Transaksi", icon: "↺", feature: "finance.history" },
      { id: "finance-reports", label: "Laporan Keuangan", icon: "▥", feature: "finance.reports" }
    ]
  },
  ...WORKSPACE_GROUPS
];

const academicAll = [
  "academic.teacher_attendance","academic.student_attendance","academic.quran","academic.grades","academic.schedule","academic.lesson_plans"
];
const naqibAll = [
  "boarding.naqib.programs","boarding.naqib.attendance","boarding.naqib.reports","boarding.naqib.initiatives",
  "boarding.naqib.example","boarding.naqib.assessment","boarding.naqib.case_report","boarding.naqib.discipline",
  "boarding.naqib.self_review","boarding.naqib.history","boarding.naqib.kpi","boarding.naqib.guide"
];
const mentorAll = ["boarding.mentor.students","boarding.mentor.session","boarding.mentor.targets","boarding.mentor.history","boarding.mentor.kpi","boarding.mentor.guide"];
const counselorAll = [
  "boarding.counselor.cases","boarding.counselor.active","boarding.counselor.session","boarding.counselor.actions","boarding.counselor.points",
  "boarding.counselor.sp","boarding.counselor.escalation","boarding.counselor.history","boarding.counselor.self","boarding.counselor.kpi","boarding.counselor.guide"
];
const parentAll = [
  "parent.home","parent.news","parent.calendar","parent.programs","parent.schedule","parent.attendance","parent.monthly","parent.academic","parent.quran",
  "parent.character","parent.nurturing","parent.mentoring","parent.health","parent.rules","parent.permissions","parent.messages","parent.announcements","parent.finance"
];
const financeAll = [
  "finance.dashboard","finance.bills","finance.payments","finance.wallets","finance.cashier","finance.products",
  "finance.history","finance.reports"
];

export const ROLE_FEATURES = {
  guru_mapel: ["academic.teacher_attendance","academic.student_attendance","academic.grades","academic.schedule","academic.lesson_plans"],
  mentor_tahsin_tahfiz: ["academic.teacher_attendance","academic.quran","academic.schedule"],
  naqib: naqibAll,
  guru_wali: mentorAll,
  konselor: counselorAll,
  kasir: ["finance.dashboard","finance.cashier","finance.products","finance.history"],
  wali_santri: parentAll,
  head_formal_school: ["academic.schedule"],
  head_boys_dorm: [],
  head_girls_dorm: [],
  deputy_director: [...financeAll],
  director: [...financeAll],
  admin: [...academicAll,...naqibAll,...mentorAll,...counselorAll,...financeAll],
  super_admin: [...academicAll,...naqibAll,...mentorAll,...counselorAll,...financeAll]
};

export function featuresForRoles(roles = []) {
  const out = new Set(["dashboard"]);
  roles.forEach(role => [...(ROLE_FEATURES[role] || []), ...workspaceFeatures(role)].forEach(feature => out.add(feature)));
  return out;
}

export function canAccess(feature, roles = []) {
  if (!feature) return false;
  if (feature === "dashboard") return roles.some(role => Object.hasOwn(ROLE_LABELS,role));
  return featuresForRoles(roles).has(feature);
}

export function roleLabel(roles = []) {
  if (!roles.length) return "Pengguna";
  return roles.map(r => ROLE_LABELS[r] || r).join(" · ");
}
