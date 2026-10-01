import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "../../config/firebase-config.js";
import { requireAdmin, logout } from "./auth.js";
import { listNode, setNode } from "./repository.js";
import { escapeHtml, toast } from "./utils.js";
import { ROLE_LABELS } from "./permissions.js";

const provisioningApp = initializeApp(firebaseConfig, "madani-account-provisioning");
const provisioningAuth = getAuth(provisioningApp);
let session;
let pilotConfig;
let profiles = [];
let staff = [];
let students = [];
let classes = [];
let groups = [];

const $ = sel => document.querySelector(sel);

function roleText(role) { return ROLE_LABELS[role] || role || "—"; }
function linkedName(profile) {
  if (profile.staffId) return staff.find(x => x.id === profile.staffId)?.name || profile.staffId;
  if (profile.studentIds?.length) return profile.studentIds.map(id => students.find(x=>x.id===id)?.name || id).join(", ");
  return "—";
}
function statusFor(account) {
  return profiles.find(p => (p.email || "").toLowerCase() === account.email.toLowerCase());
}

async function provision({ name, email, password, role, profile = {} }) {
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(provisioningAuth, email, password);
  } catch (err) {
    if (err?.code === "auth/email-already-in-use") {
      try {
        credential = await signInWithEmailAndPassword(provisioningAuth, email, password);
      } catch (signInErr) {
        throw new Error(`Email ${email} sudah ada di Firebase Auth, tetapi password sementara berbeda. Login/reset password akun tersebut, lalu petakan profilnya secara manual.`);
      }
    } else {
      throw err;
    }
  }
  const uid = credential.user.uid;
  const roles = Array.isArray(profile.roles) && profile.roles.length ? profile.roles : [role];
  const roleFlags = profile.roleFlags || Object.fromEntries(roles.map(r => [r, true]));
  await setNode(`users/${uid}`, {
    ...profile,
    name,
    email,
    role,
    roles,
    roleFlags,
    studentAccess: Object.fromEntries((profile.studentIds || (profile.studentId ? [profile.studentId] : [])).map(id => [id, true])),
    active: profile.active !== false,
    uid,
    updatedAt: Date.now(),
    updatedBy: session.user.uid,
    createdAt: profile.createdAt || Date.now()
  });
  await signOut(provisioningAuth);
  return uid;
}

async function load() {
  [pilotConfig, profiles, staff, students, classes, groups] = await Promise.all([
    fetch("../seed/pilot-accounts.json").then(r => r.json()),
    listNode("users"),
    listNode("staff"),
    listNode("students"),
    listNode("classes"),
    listNode("groups")
  ]);
}

function renderPilot() {
  const rows = pilotConfig.accounts.map(account => {
    const current = statusFor(account);
    return `<tr>
      <td><strong>${escapeHtml(account.name)}</strong><br><small class="muted">${escapeHtml(account.email)}</small></td>
      <td><span class="badge">${escapeHtml(roleText(account.role))}</span></td>
      <td>${escapeHtml(linkedName(account.profile))}</td>
      <td>${current ? '<span class="badge">Profil aktif</span>' : '<span class="badge muted">Belum dibuat</span>'}</td>
      <td><button class="mini-btn" data-create="${escapeHtml(account.key)}">${current ? "Sinkronkan" : "Buat Akun"}</button></td>
    </tr>`;
  }).join("");
  $("#pilotBody").innerHTML = rows;
  $("#pilotPassword").textContent = pilotConfig.temporaryPassword;
  document.querySelectorAll("[data-create]").forEach(btn => btn.addEventListener("click", () => createPilot(btn.dataset.create, btn)));
}

function renderProfiles() {
  $("#profileBody").innerHTML = profiles.length ? profiles.map(p => `<tr>
    <td><strong>${escapeHtml(p.name || "Tanpa nama")}</strong><br><small class="muted">${escapeHtml(p.email || p.id)}</small></td>
    <td>${escapeHtml(roleText(p.role))}</td>
    <td>${escapeHtml(linkedName(p))}</td>
    <td>${p.active === false ? '<span class="badge red">Nonaktif</span>' : '<span class="badge">Aktif</span>'}</td>
    <td><button class="mini-btn" data-reset="${escapeHtml(p.email || "")}" ${p.email ? "" : "disabled"}>Kirim Reset Password</button></td>
  </tr>`).join("") : '<tr><td colspan="5" style="text-align:center;padding:28px" class="muted">Belum ada profil user.</td></tr>';
  document.querySelectorAll("[data-reset]").forEach(btn => btn.addEventListener("click", async () => {
    if (!btn.dataset.reset) return;
    try { await sendPasswordResetEmail(provisioningAuth, btn.dataset.reset); toast("Email reset password dikirim."); }
    catch (err) { toast(err.message || "Gagal mengirim reset password", "error"); }
  }));
}

async function refresh() {
  profiles = await listNode("users");
  renderPilot();
  renderProfiles();
}

async function createPilot(key, btn) {
  const account = pilotConfig.accounts.find(x => x.key === key);
  if (!account) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Memproses…";
  try {
    await provision({ ...account, password: pilotConfig.temporaryPassword });
    toast(`${account.name} siap digunakan.`);
    await refresh();
  } catch (err) {
    console.error(err);
    toast(err.message || "Gagal membuat akun", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function createAll() {
  const btn = $("#createAllButton");
  btn.disabled = true;
  const result = [];
  for (const account of pilotConfig.accounts) {
    if (account.role === "super_admin" && statusFor(account)) { result.push(`${account.email}: sudah ada`); continue; }
    try {
      await provision({ ...account, password: pilotConfig.temporaryPassword });
      result.push(`${account.email}: OK`);
    } catch (err) {
      result.push(`${account.email}: ${err.message || "gagal"}`);
    }
  }
  toast("Proses akun pilot selesai. Lihat status di tabel.");
  console.table(result);
  await refresh();
  btn.disabled = false;
}

function fillSelect(select, rows, labelFn = x => x.name || x.id) {
  select.innerHTML = '<option value="">— Tidak dipilih —</option>' + rows.map(x => `<option value="${escapeHtml(x.id)}">${escapeHtml(labelFn(x))}</option>`).join("");
}

async function createCustom(event) {
  event.preventDefault();
  const btn = $("#customButton");
  btn.disabled = true;
  try {
    const role = $("#customRole").value;
    const profile = {
      staffId: $("#customStaff").value || undefined,
      roles: [role],
      roleFlags: { [role]: true },
      classIds: $("#customClass").value ? [$("#customClass").value] : undefined,
      groupIds: $("#customGroup").value ? [$("#customGroup").value] : undefined,
      studentIds: $("#customStudent").value ? [$("#customStudent").value] : undefined,
      genderScope: $("#customGender").value || undefined,
      financeUnit: $("#customFinanceUnit").value || undefined,
      active: true
    };
    Object.keys(profile).forEach(k => profile[k] === undefined && delete profile[k]);
    await provision({
      name: $("#customName").value.trim(),
      email: $("#customEmail").value.trim(),
      password: $("#customPassword").value,
      role,
      profile
    });
    toast("Akun berhasil dibuat.");
    event.target.reset();
    $("#customPassword").value = pilotConfig.temporaryPassword;
    await refresh();
  } catch (err) {
    console.error(err);
    toast(err.message || "Gagal membuat akun", "error");
  } finally { btn.disabled = false; }
}

async function init() {
  session = await requireAdmin();
  $("#adminName").textContent = session.profile.name || session.user.email;
  await load();
  renderPilot();
  renderProfiles();
  fillSelect($("#customStaff"), staff);
  fillSelect($("#customStudent"), students);
  fillSelect($("#customClass"), classes);
  fillSelect($("#customGroup"), groups);
  $("#customPassword").value = pilotConfig.temporaryPassword;
  $("#createAllButton").addEventListener("click", createAll);
  $("#customAccountForm").addEventListener("submit", createCustom);
  $("#logoutButton").addEventListener("click", async () => { await logout(); location.href = "../index.html"; });
}

init().catch(err => {
  console.error(err);
  $("#accountContent").innerHTML = `<div class="empty-state error-state"><strong>Gagal membuka Manajemen Akun</strong><p>${escapeHtml(err.message || String(err))}</p></div>`;
});
