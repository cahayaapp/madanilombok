import {mountAdminHeader,bindAdminDrawer} from './admin-header.js';
import {assertStaffAccountAvailable} from './staff-account-link.js';
import { mountAdminSidebar } from './admin-sidebar.js';
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
import {mountUserManagement} from "./user-management.js";
import {applyUserDraft,revokeUserAccess} from "./user-access-model.js";

mountAdminSidebar({ surface: 'accounts' });
bindAdminDrawer();

const provisioningApp = initializeApp(firebaseConfig, "madani-account-provisioning");
const provisioningAuth = getAuth(provisioningApp);
let session;
let profiles = [];
let staff = [];
let students = [];
let classes = [];
let groups = [];
let units=[],subjects=[],userManager;
const $ = sel => document.querySelector(sel);

async function load() {
  [profiles, staff, students, classes, groups, units, subjects] = await Promise.all([
    listNode("users"),
    listNode("staff"),
    listNode("students"),
    listNode("classes"),
    listNode("groups"),listNode("units"),listNode("subjects")
  ]);
}

function renderProfiles(){userManager?.render();}

async function refresh() {
  profiles = await listNode("users");
  renderProfiles();
}

async function init() {
  session = await requireAdmin();
  mountAdminHeader(session);
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
    save:async(p,d)=>{if(d.staffId!==p.staffId)assertStaffAccountAvailable(d.staffId,await listNode('users'),p.id);return updateAccess(p,(current,eventId)=>applyUserDraft(current,d,master,session.user.uid,p.id,eventId));},
    revoke:p=>updateAccess(p,(current,eventId)=>revokeUserAccess(current,session.user.uid,p.id,eventId)),
    reset:async p=>{await sendPasswordResetEmail(provisioningAuth,p.email);toast('Email reset password dikirim.');},
    create:async(d,password)=>{
      let credential=null,saved=false;
      try{
        assertStaffAccountAvailable(d.staffId,await listNode('users'));
        const initial=applyUserDraft({},d,master,session.user.uid,'new-account',crypto.randomUUID());
        credential=await createUserWithEmailAndPassword(provisioningAuth,d.email.trim(),password);
        const uid=credential.user.uid;
        await setNode(`users/${uid}`,{...initial,uid,email:credential.user.email,createdAt:Date.now(),updatedAt:Date.now(),updatedBy:session.user.uid});saved=true;
        try{await refresh();}catch{toast("User berhasil dibuat. Muat ulang daftar pengguna untuk melihat akun baru.");}
      }catch(error){
        if(credential&&!saved){try{await deleteUser(credential.user);}catch{throw new Error('Akun login terbentuk tetapi profil gagal disimpan. Periksa akun ini sebelum mencoba lagi.');}}
        throw error;
      }finally{await signOut(provisioningAuth);}
    }
  });
  renderProfiles();
  const linkedStaffId=new URLSearchParams(location.search).get('staffId');
  if(linkedStaffId){
    const back=document.createElement('a');back.href='./index.html#staff';back.className='btn btn-secondary';back.textContent='← Kembali ke Data SDM';$('#userManagement').before(back);
    userManager.openForStaff(linkedStaffId);
  }
  $("#logoutButton").addEventListener("click", async () => { await logout(); location.href = "../index.html"; });
}

init().catch(err => {
  console.error(err);
  $("#accountContent").innerHTML = `<div class="empty-state error-state"><strong>Gagal membuka Manajemen Akun</strong><p>${escapeHtml(err.message || String(err))}</p></div>`;
});
