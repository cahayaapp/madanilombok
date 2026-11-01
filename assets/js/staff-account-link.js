import {escapeHtml as e} from './utils.js';
export function staffAccountState(staffId,profiles){
 if(!Array.isArray(profiles))return {key:'unknown',label:'Status belum tersedia',accounts:[]};
 const accounts=profiles.filter(p=>p.staffId===staffId);
 if(accounts.length>1)return {key:'multiple',label:'Beberapa akun terhubung',accounts};
 if(!accounts.length)return {key:'none',label:'Belum punya akun',accounts};
 const p=accounts[0];
 return {key:p.accessRevoked?'revoked':p.active===false?'inactive':'active',label:p.accessRevoked?'Akses dicabut':p.active===false?'Akun nonaktif':'Akun aktif',accounts};
}
export const staffAccountHref=id=>`./accounts.html?staffId=${encodeURIComponent(id)}`;
export function staffAccountCell(staffId,profiles){
 const state=staffAccountState(staffId,profiles);
 return `<span class="badge staff-account-${state.key}">${e(state.label)}</span>${state.accounts.map(p=>`<small class="staff-account-email">${e(p.email||'Email belum diisi')}</small>`).join('')}`;
}
export function staffAccountAction(staffId,profiles){
 const state=staffAccountState(staffId,profiles);
 return `<a class="mini-btn" href="${e(staffAccountHref(staffId))}">${state.key==='none'?'Buat akun':state.key==='unknown'?'Periksa akun':'Kelola akun'}</a>`;
}
export function renderStaffAccountPrompt(form,staff,close){
 form.innerHTML=`<div class="staff-account-prompt"><span class="badge">SDM tersimpan</span><h3>${e(staff.name)}</h3><p>Data SDM sudah tersimpan. Buat akun aplikasi agar personil ini dapat masuk sesuai role yang Anda tentukan.</p><p class="muted">Bisa dilakukan sekarang atau nanti dari daftar SDM.</p><div class="form-actions"><button type="button" class="btn btn-secondary" data-staff-later>Nanti saja</button><a class="btn btn-primary" href="${e(staffAccountHref(staff.id))}">Buat akun aplikasi</a></div></div>`;
 form.querySelector('[data-staff-later]').onclick=close;
}
export function assertStaffAccountAvailable(staffId,profiles,exceptUid){
 if(staffId&&profiles.some(p=>p.staffId===staffId&&p.id!==exceptUid))throw Error('SDM ini sudah terhubung ke akun. Kelola atau pulihkan akun yang ada.');
}
