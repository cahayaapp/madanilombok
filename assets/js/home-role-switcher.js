import {icon} from './teacher/ui.js';
import {ROLE_LABELS} from './permissions.js';
import {escapeHtml as e} from './utils.js';
export function mountHomeRoleSwitcher(ctx){
 ctx.root.classList.add('home-dashboard');
 ctx.root.querySelectorAll('[data-home-route*="messages"] .role-quick-icon').forEach(icon=>icon.innerHTML='<svg viewBox="0 0 24 24" class="chat-menu-icon" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H6l-4 3 1.5-6A8 8 0 1 1 21 11Z"/><path d="M7 10h9M7 14h6"/></svg>');
 const name=ctx.session.profile.displayName||ctx.session.profile.name||'Pengguna';
 const holder=ctx.root.querySelector('.guru-hub,.me-shell,.mu-shell')||ctx.root;
 ctx.root.querySelectorAll('.brand-row,.hero-greeting,.me-hero,.role-hero,.mu-hero,.teacher-header').forEach(el=>el.remove());
 const now=new Date(),date=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Makassar'}).format(now),hijri=new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Makassar'}).format(now);
 holder.insertAdjacentHTML('afterbegin',`<header class="official-home-header"><div class="official-brand"><img src="../assets/brand/logo.svg" alt="MadaniApp"><div><strong>MADANI<em>APP</em></strong><small>PONDOK PESANTREN AL-MADANI</small></div></div><div class="official-header-actions"><button type="button" class="official-bell" aria-label="Pesan dan pemberitahuan">${icon('bell')}</button><button type="button" class="official-avatar" aria-label="Profil Saya">${ctx.session.profile.photoURL?`<img src="${e(ctx.session.profile.photoURL)}" alt="Foto profil">`:`<span>${e(name[0])}</span>`}</button></div></header><section class="official-greeting"><div class="official-hello">Assalamu’alaikum,</div><div class="official-name-row"><h1>${e(name)}</h1><button type="button" data-role></button></div><p class="official-quote">Ilmu hari ini,<br>untuk generasi<br>esok yang lebih baik</p><div class="official-date">${icon('calendar')}<span>${e(date)} · ${e(hijri)}</span></div></section>`);
 holder.querySelector('.official-avatar').onclick=()=>ctx.navigate('work-profile');
 holder.querySelector('.official-bell').onclick=()=>ctx.navigate(ctx.session.activeRole==='wali_santri'?'parent-messages':'work-messages');
 ctx.root.classList.toggle('home-dense',!!ctx.root.querySelector('.me-menu'));
 let button=holder.querySelector('[data-role]');
 button.classList.add('home-role-button');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label','Ganti role aktif');
 button.textContent=(ROLE_LABELS[ctx.session.activeRole]||ctx.roleName||'Role')+' ▾';
 button.onclick=()=>{
  const dialog=document.createElement('dialog');dialog.className='home-role-dialog';dialog.setAttribute('aria-label','Pilih role aktif');
  dialog.innerHTML=`<header><h2>Pilih Role</h2><button type="button" data-close aria-label="Tutup">×</button></header><p>${ctx.session.roles.length>1?'Pilih ruang kerja sesuai tugas Anda.':'Akun Anda memiliki satu role aktif.'}</p><div>${ctx.session.roles.map(role=>`<button type="button" data-role-choice="${e(role)}" aria-pressed="${role===ctx.session.activeRole}">${e(ROLE_LABELS[role]||role)}${role===ctx.session.activeRole?' ✓':''}</button>`).join('')}</div>`;
  ctx.root.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();button.focus();},{once:true});
  dialog.querySelectorAll('[data-role-choice]').forEach(choice=>choice.onclick=()=>{const role=choice.dataset.roleChoice;if(!ctx.session.roles.includes(role))return;dialog.close();const picker=document.getElementById('rolePicker');if(picker&&role!==ctx.session.activeRole){picker.value=role;picker.dispatchEvent(new Event('change'));}});
  dialog.showModal();
 };
}
