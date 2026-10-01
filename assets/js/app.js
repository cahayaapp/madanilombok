import { requireSession, logout } from "./auth.js";
import { loadMaster, currentAcademicYearId, currentAcademicYear } from "./app-store.js";
import { MENU_GROUPS, canAccess, roleLabel } from "./permissions.js";
import { getNode, listNode } from "./repository.js";
import { escapeHtml, toast } from "./utils.js";
import { metric, pageHeader, panel, badge, rupiah } from "./modules/common.js";
import {
  renderTeacherAttendance, renderStudentAttendance, renderQuran, renderGrades, renderSchedule, renderLessonPlans
} from "./modules/academic.js";
import {
  renderNaqibPrograms, renderNaqibAttendance, renderNaqibReport, renderNaqibInitiative, renderNaqibExample, renderNaqibAssessment, renderNaqibCase, renderNaqibDiscipline, renderNaqibSelf, renderNaqibHistory, renderNaqibKpi, renderNaqibGuide,
  renderMenteeList, renderMentoring, renderMentoringTargets, renderMentoringHistory, renderMentoringKpi, renderMentoringGuide,
  renderCaseInbox, renderCaseActive, renderCounseling, renderCaseActions, renderDisciplinePoints, renderWarningLetter, renderCaseEscalation, renderCaseHistory, renderCounselorSelf, renderCounselorKpi, renderCounselorGuide
} from "./modules/boarding.js";
import {
  renderFinanceDashboard, renderBills, renderPayments, renderWallets, renderProducts, renderCashier, renderFinanceHistory, renderFinanceReports
} from "./modules/finance.js";
import {
  renderParentHome, renderParentNews, renderParentCalendar, renderParentPrograms, renderParentSchedule, renderParentAttendance, renderParentMonthly, renderParentAcademic, renderParentQuran, renderParentCharacter, renderParentNurturing, renderParentMentoring, renderParentHealth, renderParentRules, renderParentPermission,
  renderParentMessages, renderParentAnnouncements, renderParentFinance
} from "./modules/parent.js";

let session;
let master;
let currentRoute = "dashboard";
let activeRole = "";
const root = document.getElementById("content");

const routes = {
  "teacher-attendance": renderTeacherAttendance,
  "student-attendance": renderStudentAttendance,
  quran: renderQuran,
  grades: renderGrades,
  schedule: renderSchedule,
  "lesson-plans": renderLessonPlans,
  "naqib-programs": renderNaqibPrograms,
  "naqib-attendance": renderNaqibAttendance,
  "naqib-report": renderNaqibReport,
  "naqib-initiative": renderNaqibInitiative,
  "naqib-example": renderNaqibExample,
  "naqib-assessment": renderNaqibAssessment,
  "naqib-case": renderNaqibCase,
  "naqib-discipline": renderNaqibDiscipline,
  "naqib-self": renderNaqibSelf,
  "naqib-history": renderNaqibHistory,
  "naqib-kpi": renderNaqibKpi,
  "naqib-guide": renderNaqibGuide,
  "mentee-list": renderMenteeList,
  mentoring: renderMentoring,
  "mentoring-targets": renderMentoringTargets,
  "mentoring-history": renderMentoringHistory,
  "mentoring-kpi": renderMentoringKpi,
  "mentoring-guide": renderMentoringGuide,
  "case-inbox": renderCaseInbox,
  "case-active": renderCaseActive,
  counseling: renderCounseling,
  "case-actions": renderCaseActions,
  "discipline-points": renderDisciplinePoints,
  "warning-letter": renderWarningLetter,
  "case-escalation": renderCaseEscalation,
  "case-history": renderCaseHistory,
  "counselor-self": renderCounselorSelf,
  "counselor-kpi": renderCounselorKpi,
  "counselor-guide": renderCounselorGuide,
  "finance-dashboard": renderFinanceDashboard,
  "finance-bills": renderBills,
  "finance-payments": renderPayments,
  "finance-wallets": renderWallets,
  cashier: renderCashier,
  "finance-products": renderProducts,
  "finance-history": renderFinanceHistory,
  "finance-reports": renderFinanceReports,
  "parent-home": renderParentHome,
  "parent-news": renderParentNews,
  "parent-calendar": renderParentCalendar,
  "parent-programs": renderParentPrograms,
  "parent-schedule": renderParentSchedule,
  "parent-attendance": renderParentAttendance,
  "parent-monthly": renderParentMonthly,
  "parent-academic": renderParentAcademic,
  "parent-quran": renderParentQuran,
  "parent-character": renderParentCharacter,
  "parent-nurturing": renderParentNurturing,
  "parent-mentoring": renderParentMentoring,
  "parent-health": renderParentHealth,
  "parent-rules": renderParentRules,
  "parent-permission": renderParentPermission,
  "parent-messages": renderParentMessages,
  "parent-announcements": renderParentAnnouncements,
  "parent-finance": renderParentFinance
};

const routeFeature = Object.fromEntries(MENU_GROUPS.flatMap(g => g.items.map(i => [i.id, i.feature || "dashboard"])));
const routeLabel = Object.fromEntries(MENU_GROUPS.flatMap(g => g.items.map(i => [i.id, i.label])));

function visibleGroups() {
  return MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => item.id === "dashboard" || canAccess(item.feature, [activeRole]))
  })).filter(group => group.items.length);
}

function renderNav() {
  const nav=document.getElementById("navMenu");
  nav.innerHTML=visibleGroups().map(group=>`<div class="nav-caption">${escapeHtml(group.label)}</div>${group.items.map(item=>`<button class="nav-item ${item.id===currentRoute?"active":""}" data-route="${item.id}"><span class="nav-icon">${item.icon}</span><span>${escapeHtml(item.label)}</span></button>`).join("")}`).join("");
  nav.querySelectorAll("[data-route]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.route)));
}

function findFirstRoute() {
  const first=visibleGroups().flatMap(g=>g.items).find(i=>i.id!=="dashboard");
  return first?.id || "dashboard";
}

async function renderDashboard() {
  const [cases, payments, transactions] = await Promise.all([
    listNode(`boarding/cases/${currentAcademicYearId()}`),
    listNode(`finance/payments/${currentAcademicYearId()}`),
    listNode(`finance/cashier_transactions/${currentAcademicYearId()}`)
  ]);
  const activeCases=cases.filter(c=>c.status!=="selesai").length;
  const paymentTotal=payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const salesTotal=transactions.filter(t=>t.status==="paid").reduce((s,t)=>s+Number(t.total||0),0);
  const name=session.profile.name||session.profile.displayName||session.user.email||"Pengguna";
  root.innerHTML=`
    <section class="portal-hero">
      <div><p class="eyebrow light">Pondok Pesantren Al-Madani</p><h2>Assalāmu‘alaikum, ${escapeHtml(name)}</h2><p>Satu sistem untuk menghubungkan pendidikan, kehidupan asrama, pembinaan santri, layanan wali santri, dan keuangan Al-Madani.</p><div class="hero-role">${escapeHtml(roleLabel([activeRole]))}</div></div>
      <div class="hero-orb"><span>${new Date().toLocaleDateString("id-ID",{day:"2-digit"})}</span><small>${new Date().toLocaleDateString("id-ID",{month:"short",year:"numeric"})}</small></div>
    </section>
    <div class="portal-metrics dashboard-metrics">
      ${metric("Santri Master",String(master.students?.length||0),"TK–SMK","blue")}
      ${metric("SDM Master",String(master.staff?.length||0),"baseline awal","cyan")}
      ${metric("Kasus Aktif",String(activeCases),"perlu tindak lanjut","coral")}
      ${metric("Pembayaran",rupiah(paymentTotal),"periode aktif","violet")}
      ${metric("Penjualan Kasir",rupiah(salesTotal),"periode aktif","mint")}
    </div>
    <div class="portal-grid two" style="margin-top:18px">
      ${panel("Akses Sesuai Peran", `<div class="quick-grid">${visibleGroups().flatMap(g=>g.items).filter(i=>i.id!=="dashboard").slice(0,8).map(i=>`<button class="quick-card" data-quick="${i.id}"><span>${i.icon}</span><strong>${escapeHtml(i.label)}</strong><small>${escapeHtml(gLabelFor(i.id))}</small></button>`).join("")}</div>`)}
      ${panel("Struktur Al-Madani", `<div class="structure-summary"><div><span>Direktur</span><strong>AH</strong></div><div><span>Kepala Sekolah Formal</span><strong>Akademik TK–SMK</strong></div><div><span>Kepala Asrama Putra</span><strong>Mhs</strong></div><div><span>Kepala Asrama Putri</span><strong>Nrl</strong></div><p>Guru Wali digunakan sebagai pengganti Mentor untuk mentoring individu. Naqib mendampingi operasional asrama; penanganan kasus formal berada di Konselor.</p></div>`)}
    </div>`;
  root.querySelectorAll("[data-quick]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.quick)));
}

function gLabelFor(route){for(const g of MENU_GROUPS) if(g.items.some(i=>i.id===route)) return g.label;return "MadaniApp";}

async function renderRoute() {
  renderNav();
  document.getElementById("pageTitle").textContent=routeLabel[currentRoute]||"Beranda";
  if(currentRoute==="dashboard") return renderDashboard();
  const feature=routeFeature[currentRoute];
  if(!canAccess(feature,[activeRole])){
    currentRoute=findFirstRoute();
    history.replaceState(null,"",`#${currentRoute}`);
    return renderRoute();
  }
  const handler=routes[currentRoute];
  if(!handler){root.innerHTML=pageHeader("Fitur belum tersedia","Route belum terhubung.");return;}
  root.innerHTML=`<div class="loading-card">Memuat ${escapeHtml(routeLabel[currentRoute]||"fitur")}…</div>`;
  try {
    session.activeRole=activeRole;
    await handler({session,master,yearId:currentAcademicYearId(),year:currentAcademicYear(),root,navigate,rerender:renderRoute});
  } catch(err) {
    console.error(err); root.innerHTML=`<div class="empty-state error-state"><strong>Gagal memuat halaman</strong><p>${escapeHtml(err.message||String(err))}</p></div>`;
  }
}

function navigate(route) {
  currentRoute=route;
  location.hash=route;
  renderRoute();
  document.getElementById("sidebar")?.classList.remove("open");
}


function preferredScheduleRoute(){
  const candidates=["schedule","naqib-programs","parent-schedule","parent-programs"];
  return candidates.find(id=>{const f=routeFeature[id];return f&&canAccess(f,[activeRole])})||"dashboard";
}
function preferredKpiRoute(){
  const byRole={naqib:"naqib-kpi",guru_wali:"mentoring-kpi",konselor:"counselor-kpi"};
  const r=byRole[activeRole];return r&&canAccess(routeFeature[r],[activeRole])?r:"dashboard";
}
function preferredMessageRoute(){
  return canAccess(routeFeature["parent-messages"],[activeRole])?"parent-messages":"dashboard";
}
function bindMobileBottomNav(){
  document.querySelectorAll('[data-shell-nav]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.shellNav;
    if(key==='more'){document.getElementById('sidebar')?.classList.add('open');return;}
    const target=key==='home'?"dashboard":key==='schedule'?preferredScheduleRoute():key==='kpi'?preferredKpiRoute():preferredMessageRoute();
    navigate(target);
    document.querySelectorAll('[data-shell-nav]').forEach(x=>x.classList.toggle('active',x===btn));
  }));
}

async function init() {
  session=await requireSession();
  master=await loadMaster();
  const year=currentAcademicYear();
  document.getElementById("activeYearLabel").textContent=year ? `${year.name} · ${year.semesterLabel||`Semester ${year.semester||""}`}` : "Belum diatur";
  document.getElementById("userName").textContent=session.profile.name||session.profile.displayName||session.user.email;
  const storedRole=sessionStorage.getItem("madaniActiveRole");
  activeRole=(storedRole&&session.roles.includes(storedRole)?storedRole:null)||session.profile.defaultRole||session.roles[0]||"";
  if(!session.roles.includes(activeRole)) activeRole=session.roles[0]||"";
  const rolePicker=document.getElementById("rolePicker");
  rolePicker.innerHTML=session.roles.map(r=>`<option value="${escapeHtml(r)}" ${r===activeRole?"selected":""}>${escapeHtml(roleLabel([r]))}</option>`).join("");
  rolePicker.disabled=session.roles.length<=1;
  rolePicker.addEventListener("change",()=>{activeRole=rolePicker.value;sessionStorage.setItem("madaniActiveRole",activeRole);currentRoute="dashboard";location.hash="dashboard";renderRoute();});
  const adminLink=document.getElementById("adminLink");
  if(session.roles.some(r=>["admin","super_admin"].includes(r))) adminLink.classList.remove("hidden");
  currentRoute=(location.hash||"#dashboard").slice(1);
  if(currentRoute!=="dashboard" && !canAccess(routeFeature[currentRoute],[activeRole])) currentRoute="dashboard";
  renderRoute();
}

document.getElementById("logoutButton")?.addEventListener("click",async()=>{await logout();location.href="../index.html";});
document.getElementById("menuButton")?.addEventListener("click",()=>document.getElementById("sidebar")?.classList.toggle("open"));
  bindMobileBottomNav();
window.addEventListener("hashchange",()=>{const next=(location.hash||"#dashboard").slice(1);if(next!==currentRoute){currentRoute=next;renderRoute();}});
init().catch(err=>{console.error(err);toast(err.message||"Gagal membuka MadaniApp","error");});
