import {minimartLocal} from '../minimart-environment.js';
async function request(path, body) {
  if (!minimartLocal) throw Error('Minimart tersedia untuk pengujian lokal. Backend produksi belum diaktifkan.');
  const {auth} = await import('../firebase.js');
  const user = auth.currentUser;
  if (!user) throw Error('Silakan masuk kembali.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/minimart/${path}`, {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify(body),signal:controller.signal});
    const data = await response.json();
    if (!response.ok) { const error = Error(data.error || 'Permintaan ditolak.'); error.definitive = response.status === 400 || response.status === 403; throw error; }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Error('Koneksi terputus. Status belum pasti; tekan Periksa / Ulangi untuk ID transaksi yang sama.');
    throw error;
  } finally { clearTimeout(timer); }
}
export const minimartAPI = {parent:args=>request('parent',args),state:args=>request('state',args), execute:operation=>request('execute',{operation})};
