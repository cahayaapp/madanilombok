import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "../../config/firebase-config.js";
import { requireAdmin, logout } from "./auth.js";
import { listNode, setNode, transitionWorkspaceRecord } from "./repository.js";
import { escapeHtml, toast } from "./utils.js";
import {buildStaffAccountPlan} from "./staff-account-plan.js";
import {mountUserManagement} from "./user-management.js";
import {applyUserDraft,revokeUserAccess} from "./user-access-model.js";
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
let units=[],subjects=[],userManager;
let staffPlan=[];
let staffCredentials=[];
let staffProvisioning=false;
let staffCredentialsDownloaded=false;
window.addEventListener("beforeunload",event=>{if(staffProvisioning||(staffCredentials.length&&!staffCredentialsDownloaded)){event.preventDefault();event.returnValue="";}});
let staffSuggestions=[],confirmedLeadership=[];

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

async function provision({name,email,password,role,profile={}}){
  let credential=null,saved=false;
  try{
    credential=await createUserWithEmailAndPassword(provisioningAuth,email,password);
    const uid=credential.user.uid,roles=Array.isArray(profile.roles)&&profile.roles.length?profile.roles:[role];
    await setNode(`users/${uid}`,{...profile,name,email,role,roles,defaultRole:profile.defaultRole||role,roleFlags:Object.fromEntries(roles.map(r=>[r,true])),studentAccess:Object.fromEntries((profile.studentIds||(profile.studentId?[profile.studentId]:[])).map(id=>[id,true])),active:profile.active!==false,uid,updatedAt:Date.now(),updatedBy:session.user.uid,createdAt:Date.now()});
    saved=true;return uid;
  }catch(error){
    if(credential&&!saved){try{await deleteUser(credential.user);}catch{throw new Error('Akun Auth terbentuk tetapi profil gagal disimpan. Periksa akun sebelum mencoba lagi.');}}
    throw error;
  }finally{await signOut(provisioningAuth);}
}

async function load() {
  [pilotConfig, profiles, staff, students, classes, groups, units, subjects] = await Promise.all([
    fetch("../seed/pilot-accounts.json").then(r => r.json()),
    listNode("users"),
    listNode("staff"),
    listNode("students"),
    listNode("classes"),
    listNode("groups"),listNode("units"),listNode("subjects")
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
      <td><button class="mini-btn" data-create="${escapeHtml(account.key)}" ${current?"disabled":""}>${current ? "Sudah ada" : "Buat Akun"}</button></td>
    </tr>`;
  }).join("");
  $("#pilotBody").innerHTML = rows;
  $("#pilotPassword").textContent = pilotConfig.temporaryPassword;
  document.querySelectorAll("[data-create]").forEach(btn => btn.addEventListener("click", () => createPilot(btn.dataset.create, btn)));
}

function renderProfiles(){userManager?.render();}

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
    if(statusFor(account))throw new Error("Akun sudah ada. Gunakan Edit pada Manajemen User untuk mengubah akses.");
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
    if (statusFor(account)) { result.push(`${account.email}: sudah ada`); continue; }
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

function renderStaffPlan(){
  const domain=$('#staffEmailDomain').value.trim().toLowerCase().replace(/^@/,'');
  const validDomain=/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain);
  staffPlan=buildStaffAccountPlan(staff,profiles,classes,staffSuggestions,confirmedLeadership,domain||'madaniapp');
  const labels={ready:'Siap dibuat',existing:'Sudah ada',inactive:'SDM nonaktif',needs_role:'Menunggu role',identity_mismatch:'Identitas perlu diperiksa'};
  $('#staffPlanBody').innerHTML=staffPlan.map(row=>`<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.email)}</td><td>${escapeHtml(row.roles.map(roleText).join(', ')||'Belum ditetapkan')}</td><td>${escapeHtml(labels[row.status])}</td></tr>`).join('');
  $('#staffPlanSummary').textContent=`${staffPlan.length} SDM · ${staffPlan.filter(x=>x.status==='ready').length} siap dibuat. Email menggunakan nama akhir; angka membedakan nama yang sama.`;
  $('#createStaffButton').disabled=staffProvisioning||!validDomain||!staffPlan.some(x=>x.status==='ready');
}
function temporaryStaffPassword(){
 const values=crypto.getRandomValues(new Uint8Array(18));
 return 'M!'+Array.from(values,n=>n.toString(16).padStart(2,'0')).join('');
}
function downloadStaffCredentials(){
 if(!staffCredentials.length)return;
 const cell=value=>`"${String(value??'').replaceAll('"','""')}"`;
 const content='\uFEFF'+[['Nama','Email','Password sementara','Role'],...staffCredentials.map(r=>[r.name,r.email,r.password,r.roles.map(roleText).join(', ')])].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='akun-sdm-madani.csv';a.click();staffCredentialsDownloaded=true;setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function createAllStaff(){
 if(staffProvisioning||$('#createStaffButton').disabled)return;
 staffProvisioning=true;$('#createStaffButton').disabled=true;
 const results=[];
 try{
  await load();renderStaffPlan();
  for(const row of staffPlan.filter(x=>x.status==='ready')){
   let credential=null,profileSaved=false;
   const password=temporaryStaffPassword();
   try{
    credential=await createUserWithEmailAndPassword(provisioningAuth,row.email,password);
    const now=Date.now(),uid=credential.user.uid;
    await setNode(`users/${uid}`,{uid,name:row.name,email:row.email,staffId:row.staffId,role:row.role,roles:row.roles,roleFlags:Object.fromEntries(row.roles.map(r=>[r,true])),roleScopes:row.roleScopes,unitIds:row.unitIds,active:true,accountKind:'staff',createdAt:now,updatedAt:now,updatedBy:session.user.uid});
    profileSaved=true;
    staffCredentialsDownloaded=false;
    staffCredentials.push({name:row.name,email:row.email,password,roles:row.roles});
    $('#downloadStaffCredentials').disabled=false;
    results.push(`${row.email}: dibuat`);
   }catch(error){
    let rollback='';
    if(credential&&!profileSaved){try{await deleteUser(credential.user);rollback=' Akun baru dibatalkan karena profil gagal disimpan.';}catch{rollback=' Akun Auth terbentuk tetapi profil gagal; perlu diperbaiki admin.';}}
    results.push(`${row.email}: ${error.code==='auth/email-already-in-use'?'Email sudah digunakan; akun lama tidak diubah.':error.message||'Gagal'}${rollback}`);
    if(['auth/invalid-email','auth/operation-not-allowed','auth/too-many-requests','auth/network-request-failed'].includes(error.code))break;
   }finally{try{await signOut(provisioningAuth);}catch{}}
   $('#staffProvisionResult').textContent=results.join('\n');
  }
  await refresh();
 }catch(error){results.push(error.message||'Gagal memuat data SDM.');}
 finally{
  staffProvisioning=false;renderStaffPlan();$('#staffProvisionResult').textContent=results.join('\n');
  $('#downloadStaffCredentials').disabled=!staffCredentials.length;
 }
}

async function init() {
  session = await requireAdmin();
  $("#adminName").textContent = session.profile.name || session.user.email;
  await load();
  const master={staff,students,classes,groups,units,subjects};
  const updateAccess=async(p,change)=>{
    const eventId=crypto.randomUUID();
    await transitionWorkspaceRecord('users',p.id,current=>{
      if((current.accessVersion||0)!==(p.accessVersion||0)||(current.updatedAt||0)!==(p.updatedAt||0))throw new Error('Profil sudah diperbarui oleh admin lain. Muat ulang sebelum menyimpan.');
      return change(current,eventId);
    },session.user.uid);
    await refresh();
  };
  userManager=mountUserManagement({root:$('#userManagement'),getProfiles:()=>profiles,master,actorUid:session.user.uid,reload:refresh,
    save:(p,d)=>updateAccess(p,(current,eventId)=>applyUserDraft(current,d,master,session.user.uid,p.id,eventId)),
    revoke:p=>updateAccess(p,(current,eventId)=>revokeUserAccess(current,session.user.uid,p.id,eventId)),
    reset:async p=>{await sendPasswordResetEmail(provisioningAuth,p.email);toast('Email reset password dikirim.');},
    create:async(d,password)=>{
      let credential=null,saved=false;
      try{
        const initial=applyUserDraft({},d,master,session.user.uid,'new-account',crypto.randomUUID());
        credential=await createUserWithEmailAndPassword(provisioningAuth,d.email.trim(),password);
        const uid=credential.user.uid;
        await setNode(`users/${uid}`,{...initial,uid,email:credential.user.email,createdAt:Date.now(),updatedAt:Date.now(),updatedBy:session.user.uid});saved=true;
        await refresh();
      }catch(error){
        if(credential&&!saved){try{await deleteUser(credential.user);}catch{throw new Error('Akun login terbentuk tetapi profil gagal disimpan. Periksa akun ini sebelum mencoba lagi.');}}
        throw error;
      }finally{await signOut(provisioningAuth);}
    }
  });
  renderPilot();
  renderProfiles();
  const [suggestions,leadership]=await Promise.all([fetch('../seed/role-assignment-suggestions.json').then(r=>r.json()),fetch('../seed/leadership-assignments.json').then(r=>r.json())]);
  staffSuggestions=suggestions.people||[];confirmedLeadership=leadership.assignments||[];
  renderStaffPlan();
  $('#staffEmailDomain').addEventListener('input',renderStaffPlan);
  $('#createStaffButton').addEventListener('click',createAllStaff);
  $('#downloadStaffCredentials').addEventListener('click',downloadStaffCredentials);
  $("#createAllButton").addEventListener("click", createAll);
  $("#logoutButton").addEventListener("click", async () => { await logout(); location.href = "../index.html"; });
}

init().catch(err => {
  console.error(err);
  $("#accountContent").innerHTML = `<div class="empty-state error-state"><strong>Gagal membuka Manajemen Akun</strong><p>${escapeHtml(err.message || String(err))}</p></div>`;
});
