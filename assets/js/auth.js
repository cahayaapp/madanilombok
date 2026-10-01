import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "./firebase.js";
import { getNode } from "./repository.js";

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function waitForAuth() {
  return new Promise(resolve => {
    const stop = onAuthStateChanged(auth, user => {
      stop();
      resolve(user);
    });
  });
}

export function normalizeRoles(profile = {}) {
  const roles = new Set();
  if (profile.role) roles.add(profile.role);
  if (Array.isArray(profile.roles)) profile.roles.forEach(r => roles.add(r));
  if (profile.roles && !Array.isArray(profile.roles) && typeof profile.roles === "object") {
    Object.entries(profile.roles).forEach(([key, value]) => value && roles.add(key));
  }
  if (profile.roleFlags && typeof profile.roleFlags === "object") {
    Object.entries(profile.roleFlags).forEach(([key, value]) => value && roles.add(key));
  }
  return [...roles];
}

export async function requireSession() {
  const user = await waitForAuth();
  if (!user) {
    window.location.href = "../index.html";
    throw new Error("Belum login");
  }
  const profile = await getNode(`users/${user.uid}`);
  if (!profile || profile.active === false) {
    await signOut(auth);
    window.location.href = "../index.html?error=unauthorized";
    throw new Error("Akun belum aktif di MadaniApp");
  }
  return { user, profile, roles: normalizeRoles(profile) };
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!session.roles.some(r => ["admin", "super_admin"].includes(r))) {
    window.location.href = "../app/index.html";
    throw new Error("Akses admin tidak tersedia");
  }
  return session;
}
