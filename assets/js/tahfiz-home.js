import {teachingGroups} from './group-teachers.js';
import {escapeHtml as e} from './utils.js';
export async function renderTahfizHome(ctx){
 const groups=teachingGroups(ctx.master,ctx.session.profile,'quran');
 ctx.root.innerHTML=`<main class="mu-shell"><header class="mu-hero"><span class="mu-eyebrow">PEMBINA TAHFIZ · MADANIAPP</span><h1>Assalamu’alaikum,<br>${e(ctx.session.profile.name||'Pembina')}</h1><p>Dampingi bacaan dan hafalan santri.</p></header><div class="mu-section-title"><h2>Menu Tahfiz</h2></div><div class="mu-home-grid"><button type="button" class="mu-feature primary" data-quran-route="quran-ziyadah"><i aria-hidden="true">＋</i><b>Ziyadah</b><small>Catat tambahan hafalan dan bacaan santri.</small><em>Buka →</em></button><button type="button" class="mu-feature secondary" data-quran-route="quran-murojaah"><i aria-hidden="true">↻</i><b>Muroja’ah</b><small>Catat pengulangan hafalan harian, pekanan, dan bulanan.</small><em>Buka →</em></button></div><p class="mu-note">${groups.length?`${groups.length} halaqah binaan terhubung.`:'Belum ada halaqah yang ditautkan. Penugasan dikelola melalui administrator.'}</p></main>`;
 ctx.root.querySelectorAll('[data-quran-route]').forEach(button=>button.onclick=()=>ctx.navigate(button.dataset.quranRoute));
}
