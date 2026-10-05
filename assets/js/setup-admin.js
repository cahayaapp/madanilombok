import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig, appConfig } from "../../config/firebase-config.js";

const app = initializeApp(firebaseConfig, "madani-first-admin-setup");
const auth = getAuth(app);
const db = getDatabase(app);
const rootPath = appConfig.databaseRoot;
const form = document.getElementById("setupForm");
const button = document.getElementById("setupButton");
const statusBox = document.getElementById("setupStatus");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const nameEl = document.getElementById("name");

function show(message, type="info") {
  statusBox.className = `notice ${type === "error" ? "" : "info"}`;
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
}

async function existingProfiles() {
  const snap = await get(ref(db, `${rootPath}/users`));
  return snap.exists() ? snap.val() : null;
}

async function init() {
  try {
    const profiles = await existingProfiles();
    if (profiles && Object.keys(profiles).length) {
      show("MadaniApp sudah memiliki profil pengguna. Setup super admin pertama dikunci. Silakan login dengan akun admin yang sudah ada.");
      button.disabled = true;
      button.textContent = "Setup sudah selesai";
      document.getElementById("loginLink").classList.remove("hidden");
    }
  } catch (err) {
    // RTDB root requires auth; before first login, a permission error is expected.
    console.info("Pre-check users dilewati:", err?.code || err?.message || err);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = "Membuat akun…";
  statusBox.classList.add("hidden");
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  const name = nameEl.value.trim() || "Administrator Al-Madani";
  try {
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err?.code === "auth/email-already-in-use") {
        credential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw err;
      }
    }
    const uid = credential.user.uid;
    const usersSnap = await get(ref(db, `${rootPath}/users`));
    if (usersSnap.exists() && !usersSnap.child(uid).exists()) {
      throw new Error("Database sudah memiliki user lain. Demi keamanan, halaman setup tidak boleh membuat admin baru.");
    }
    const profile = {
      name,
      email,
      role: "super_admin",
      roles: ["super_admin"],
      roleFlags: { super_admin: true },
      active: true,
      setupAccount: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await set(ref(db, `${rootPath}/users/${uid}`), profile);
    show("Super Admin berhasil dibuat. Anda sudah login sebagai admin. Lanjutkan ke Manajemen Akun untuk mengelola akun pengguna.");
    button.textContent = "Berhasil";
    document.getElementById("continueLink").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    const message = err?.code === "auth/operation-not-allowed"
      ? "Firebase Authentication Email/Password belum diaktifkan. Aktifkan provider Email/Password di Firebase Console, lalu coba lagi."
      : (err?.message || "Setup gagal.");
    show(message, "error");
    button.disabled = false;
    button.textContent = "Buat Super Admin Pertama";
  }
});

init();
