import {teachingGroups,groupTeacherName} from './group-teachers.js';
import {escapeHtml as e} from './utils.js';
export async function renderTahfizHome(ctx){
 const groups=teachingGroups(ctx.master,ctx.session.profile,'quran');
 ctx.root.innerHTML=`<main class="mu-shell"><header class="mu-hero"><span class="mu-eyebrow">PEMBINA TAHFIZ · MADANIAPP</span><h1>Assalamu’alaikum,<br>${e(ctx.session.profile.name||'Pembina')}</h1><p>Dampingi bacaan, hafalan, dan muroja’ah santri.</p></header><div class="mu-section-title"><h2>Ruang Tahsin & Tahfiz</h2></div><button class="mu-feature primary" id="openQuran" style="width:100%"><i>◫</i><b>Tahsin, Tahfiz & Muroja’ah</b><small>Target hafalan, rentang ayat, penilaian bacaan, setoran, dan riwayat santri.</small><em>Buka →</em></button><div class="mu-section-title"><h2>Halaqah Anda</h2></div><div class="mu-history">${groups.map(g=>`<article class="mu-history-card"><h3>${e(g.name)}</h3><p>${e(groupTeacherName(g,ctx.master.staff))}</p><p>${Object.keys(ctx.master.groupAssignments?.[g.id]||{}).length} santri terhubung</p></article>`).join('')||'<p class="mu-note">Belum ada halaqah yang ditautkan. Penugasan dikelola melalui administrator.</p>'}</div></main>`;
 ctx.root.querySelector('#openQuran').onclick=()=>ctx.navigate('quran');
}
