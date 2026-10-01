const installScene = document.getElementById('installScene');
const loginScene = document.getElementById('loginScene');
const hint = document.getElementById('installHint');
let deferredInstallPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
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
  document.getElementById('continueWebBtn').focus();
};
document.getElementById('togglePassword').onclick = event => {
  const input = document.getElementById('password');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-label', visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  event.currentTarget.setAttribute('aria-pressed', String(visible));
};
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  hint.textContent = 'Pasang sekali, akses MadaniApp langsung dari layar utama perangkat Anda.';
});
document.getElementById('installMainBtn').onclick = async () => {
  if (deferredInstallPrompt) {
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      hint.textContent = choice.outcome === 'accepted' ? 'Instalasi sedang diproses.' : 'Anda dapat memasang aplikasi nanti atau melanjutkan lewat browser.';
    } catch {
      hint.textContent = 'Buka menu browser lalu pilih “Install MadaniApp” atau “Tambahkan ke layar utama”.';
    }
    deferredInstallPrompt = null;
  } else if (isIOS()) {
    hint.innerHTML = 'Di iPhone/iPad: tekan tombol <b>Bagikan</b>, lalu pilih <b>Tambahkan ke Layar Utama.</b>';
  } else {
    hint.textContent = 'Buka menu browser lalu pilih “Install MadaniApp” atau “Tambahkan ke layar utama”.';
  }
};
window.addEventListener('appinstalled', () => showLogin());
if (isStandalone() || (new URLSearchParams(location.search).has('error') || new URLSearchParams(location.search).has('login'))) showLogin();
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
if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register('./sw.js?v=24', { scope: './', updateViaCache: 'none' }).catch(console.warn);
});
