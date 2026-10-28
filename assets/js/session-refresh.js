import {roleIds} from './user-access-model.js';

// Refresh only the signed-in user's access; never fall back to stale permissions.
export async function refreshRoleSession(session, role, readProfile) {
  const profile = await readProfile(`users/${session.user.uid}`);
  if (!profile || profile.active === false || profile.accessRevoked === true) {
    throw new Error('Akun tidak aktif. Silakan masuk kembali.');
  }
  const roles = roleIds(profile);
  if (!roles.includes(role)) throw new Error('Penugasan role sudah berubah. Silakan masuk kembali.');
  session.profile = profile;
  session.roles = roles;
  return session;
}
