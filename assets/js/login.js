import { waitForAuth, login, normalizeRoles } from "./auth.js";
import { getNode } from "./repository.js";
import { $, toast } from "./utils.js";

const form=$("#loginForm"),button=$("#loginButton");
function destination(profile){const roles=normalizeRoles(profile);return roles.some(r=>["admin","super_admin"].includes(r))?"./app/index.html":"./app/index.html";}
(async()=>{const existing=await waitForAuth();if(existing){const profile=await getNode(`users/${existing.uid}`);if(profile&&profile.active!==false) location.href=destination(profile);}})();
form?.addEventListener("submit",async event=>{event.preventDefault();button.disabled=true;button.textContent="Memeriksa...";try{const credential=await login($("#email").value.trim(),$("#password").value);const profile=await getNode(`users/${credential.user.uid}`);if(!profile||profile.active===false)throw new Error("Akun belum terdaftar/aktif pada MadaniApp.");location.href=destination(profile);}catch(err){toast(err.message||"Login gagal.","error");}finally{button.disabled=false;button.textContent="Masuk";}});
