const installScene = document.getElementById('installScene');
const loginScene = document.getElementById('loginScene');
const hint = document.getElementById('installHint');
let deferredInstallPrompt = null;
const displayModes = ['standalone', 'fullscreen', 'minimal-ui'].map(mode => matchMedia(`(display-mode: ${mode})`));
const isStandalone = () => displayModes.some(mode => mode.matches) || navigator.standalone === true;
const installButton = document.getElementById('installMainBtn');
const continueButton = document.getElementById('continueWebBtn');
const backButton = document.getElementById('backInstallBtn');
let installing = false;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function showLogin(focus = false) {
  installScene.classList.add('hidden');
  loginScene.classList.remove('hidden');
  if (focus) loginScene.querySelector('h1').focus();
}
document.getElementById('continueWebBtn').onclick = () => showLogin(true);
document.getElementById('backInstallBtn').onclick = () => {
  loginScene.classList.add('hidden');
  installScene.classList.remove('hidden');
  if (isStandalone()) return showLogin();
  installButton.focus();
};
document.getElementById('togglePassword').onclick = event => {
  const input = document.getElementById('password');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-label', visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  event.currentTarget.setAttribute('aria-pressed', String(visible));
};
function installHelp() {
  if (!window.isSecureContext || !/^https?:$/.test(location.protocol)) return 'Pasang MadaniApp untuk akses langsung dari layar utama perangkat Anda.';
  if (!navigator.onLine) return 'Sambungkan internet untuk memasang aplikasi. Anda tetap dapat membuka halaman masuk.';
  if (isIOS()) return 'Di iPhone/iPad: buka menu Bagikan, pilih Tambahkan ke Layar Utama, lalu Tambah. Jika pilihan belum tersedia, buka halaman ini di Safari.';
  if (/android/i.test(navigator.userAgent)) return 'Buka menu ⋮ browser, lalu pilih Instal aplikasi atau Tambahkan ke layar utama. Jika tidak tersedia, buka halaman ini di Chrome. Jika sudah terpasang, buka ikon MadaniApp di layar utama.';
  return 'Buka menu browser dan pilih Instal MadaniApp. Di Safari Mac, pilih File → Tambahkan ke Dock. Jika sudah terpasang, buka MadaniApp dari daftar aplikasi.';
}
function syncInstallState() {
  const standalone = isStandalone();
  continueButton.hidden = standalone;
  backButton.hidden = standalone;
  installButton.hidden = standalone;
  if (standalone) { deferredInstallPrompt = null; showLogin(); }
  else hint.textContent = deferredInstallPrompt ? 'Pasang sekali, akses MadaniApp langsung dari layar utama perangkat Anda.' : installHelp();
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  syncInstallState();
});
installButton.onclick = async () => {
  if (isStandalone()) return showLogin(true);
  if (installing) return;
  if (!deferredInstallPrompt) { hint.textContent = installHelp(); return; }
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  installing = true;
  installButton.disabled = true;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    hint.textContent = choice.outcome === 'accepted'
      ? 'Permintaan instalasi diterima. Setelah selesai, buka MadaniApp dari ikon aplikasi.'
      : 'Instalasi dibatalkan. Anda dapat mencoba lagi melalui menu browser atau melanjutkan ke halaman masuk.';
  } catch {
    hint.textContent = installHelp();
  } finally {
    installing = false;
    installButton.disabled = false;
  }
};
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hint.textContent = 'MadaniApp berhasil dipasang. Buka melalui ikon aplikasi di perangkat Anda.';
  showLogin();
});
for (const mode of displayModes) mode.addEventListener?.('change', syncInstallState);
window.addEventListener('pageshow', syncInstallState);
window.addEventListener('online', syncInstallState);
window.addEventListener('offline', syncInstallState);
syncInstallState();
if (new URLSearchParams(location.search).has('error') || new URLSearchParams(location.search).has('login')) showLogin();
// Load authentication separately so the install screen and navigation work even offline.
let authModules;
function loadAuth() {
  if (!authModules) authModules = Promise.all([import('./auth.js'), import('./repository.js')]).catch(error => {
    authModules = null;
    throw error;
  });
  return authModules;
}
document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('loginButton');
  const errorBox = document.getElementById('errorMsg');
  button.disabled = true;
  button.textContent = 'Memeriksa…';
  errorBox.classList.add('hidden');
  try {
    const [{ login }, { getNode }] = await loadAuth();
    const credential = await login(document.getElementById('email').value.trim(), document.getElementById('password').value);
    const profile = await getNode(`users/${credential.user.uid}`);
    if (!profile || profile.active === false) throw new Error('Akun belum terdaftar/aktif pada MadaniApp.');
    location.href = './app/index.html';
  } catch (error) {
    errorBox.textContent = error.message || 'Login gagal. Periksa koneksi dan coba kembali.';
    errorBox.classList.remove('hidden');
  } finally {
    button.disabled = false;
    button.textContent = 'Masuk →';
  }
});
loadAuth().then(async ([{ waitForAuth }, { getNode }]) => {
  const user = await waitForAuth();
  if (!user) return;
  const profile = await getNode(`users/${user.uid}`);
  if (profile && profile.active !== false) location.replace('./app/index.html');
}).catch(() => { /* Keep the public install screen available without a connection. */ });
function registerWorker() {
  if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).catch(() => { if (!deferredInstallPrompt) hint.textContent = installHelp(); });
}
if (document.readyState === 'complete') registerWorker();
else window.addEventListener('load', registerWorker, { once: true });
