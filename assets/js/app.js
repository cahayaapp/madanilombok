import {decorateManagement} from './management-layout.js';
import {HEALTH_ROUTES} from './health.js';
import {renderMentorForm,renderMentorHistory} from './mentoring.js';
import {renderTeacherQuran} from './teacher/quran.js';
import {TEACHER_ROUTES} from './teacher/routes.js';
import { PARENT_EXTRA_ROUTES } from "./modules/parent-extras.js";
import { sessionForRole, bottomRoutes } from "./role-experience.js";
import { renderRoleHome } from "./modules/role-home.js";
import { WORKSPACE_ROUTES } from "./modules/workspaces.js";
import { requireSession, logout } from "./auth.js";
import { loadMaster, currentAcademicYearId, currentAcademicYear } from "./app-store.js";
import { MENU_GROUPS, canAccess, roleLabel } from "./permissions.js";
import { escapeHtml, toast } from "./utils.js";
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

export const routes = {
  ...WORKSPACE_ROUTES,
  ...HEALTH_ROUTES,
  ...PARENT_EXTRA_ROUTES,
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
  mentoring: renderMentorForm,
  "mentoring-targets": renderMentorHistory,
  "mentoring-history": renderMentorHistory,
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

async function renderDashboard(ctx) {
  return renderRoleHome(ctx,visibleGroups().flatMap(group=>group.items));
}

let renderVersion=0;
function canRoute(route) {
  return !!route && Object.hasOwn(routeFeature,route) && canAccess(routeFeature[route],[activeRole]);
}
function syncBottomNav() {
  const targets=bottomRoutes(activeRole,canRoute);
  document.querySelectorAll('[data-shell-nav]').forEach(button=>{
    const key=button.dataset.shellNav;
    button.disabled=key!=='more'&&!targets[key];
    const active=key!=='more'&&targets[key]===currentRoute;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
}
async function renderRoute() {
  const version=++renderVersion;
  if(!canRoute(currentRoute)){currentRoute='dashboard';history.replaceState(null,'',`${location.pathname}${location.search}#dashboard`);}
  document.body.dataset.activeRole=activeRole;
  renderNav();syncBottomNav();
  document.getElementById('pageTitle').textContent=routeLabel[currentRoute]||'Beranda';
  const mount=document.createElement('div');
  mount.innerHTML='<div class="loading-card">Memuat ruang kerja…</div>';
  root.replaceChildren(mount);
  const scopedSession=sessionForRole(session,activeRole);
  const ctx={session:scopedSession,master,yearId:currentAcademicYearId(),year:currentAcademicYear(),root:mount,navigate,rerender:renderRoute,roleName:roleLabel([activeRole])};
  try {
    if(currentRoute==='dashboard')await renderDashboard(ctx);
    else if(activeRole==='mentor_tahsin_tahfiz'&&currentRoute==='quran')await renderTeacherQuran(ctx);
    else if(activeRole==='guru_mapel'&&TEACHER_ROUTES[currentRoute])await TEACHER_ROUTES[currentRoute](ctx);
    else await routes[currentRoute](ctx);
    if(currentRoute.startsWith('management-'))decorateManagement(ctx);
  } catch(error) {
    if(version===renderVersion)mount.innerHTML=`<div class="empty-state error-state"><strong>Gagal memuat halaman</strong><p>${escapeHtml(error.message||String(error))}</p><button type="button" class="btn btn-secondary" id="retryRoute">Coba Lagi</button></div>`;
    mount.querySelector('#retryRoute')?.addEventListener('click',renderRoute);
    console.error(error);
  }
}
function navigate(route) {
  if(!canRoute(route))return toast('Menu tidak tersedia untuk role aktif.','warning');
  currentRoute=route;
  history.pushState(null,'',`${location.pathname}${location.search}#${route}`);
  renderRoute();
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.add('hidden');
}
function bindMobileBottomNav() {
  document.querySelectorAll('[data-shell-nav]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.shellNav;
    if(key==='more'){
      document.getElementById('sidebar')?.classList.add('open');
      document.getElementById('sidebarOverlay')?.classList.remove('hidden');
      return;
    }
    const target=bottomRoutes(activeRole,canRoute)[key];
    if(target)navigate(target);
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
  await renderRoute();
}

document.getElementById("logoutButton")?.addEventListener("click",async()=>{await logout();location.href="../index.html";});
document.getElementById("menuButton")?.addEventListener("click",()=>{
 const open=document.getElementById("sidebar")?.classList.toggle("open");
 document.getElementById("sidebarOverlay")?.classList.toggle("hidden",!open);
});
document.getElementById('sidebarOverlay')?.addEventListener('click',()=>{
 document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.add('hidden');
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.add('hidden');}});
  bindMobileBottomNav();
window.addEventListener("hashchange",()=>{const next=(location.hash||"#dashboard").slice(1);if(next!==currentRoute){currentRoute=next;renderRoute();}});
init().catch(err=>{console.error(err);toast(err.message||"Gagal membuka MadaniApp","error");});
