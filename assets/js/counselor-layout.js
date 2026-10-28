import {icon} from './teacher/ui.js';
import {escapeHtml as e} from './utils.js';
const pages = new Set(['case-inbox','case-active','counseling','case-actions','discipline-points','warning-letter','case-escalation','case-history','counselor-self','counselor-guide']);
export function decorateCounselorPage(ctx, route) {
  if (!pages.has(route)) return;
  const root = ctx.root;
  root.classList.add('counselor-workspace');
  const header = root.querySelector('.portal-section-head, .teacher-header');
  if (!header) return;
  const title = header.querySelector('h1,h2')?.textContent || 'Konseling';
  if (!root.querySelector('.counselor-breadcrumb')) {
    const nav = document.createElement('nav');
    nav.className = 'counselor-breadcrumb'; nav.setAttribute('aria-label','Jejak navigasi');
    nav.innerHTML = '<button type="button">PONDOK PESANTREN AL-MADANI</button><span aria-hidden="true">›</span><span>Konselor</span><span aria-hidden="true">›</span><strong>'+e(title)+'</strong>';
    nav.querySelector('button').onclick = () => ctx.navigate('dashboard');
    header.before(nav);
  }
  header.classList.add('counselor-hero');
  let eyebrow = header.querySelector('.eyebrow');
  if (!eyebrow) { eyebrow=document.createElement('p'); eyebrow.className='eyebrow'; header.querySelector('h1,h2').before(eyebrow); }
  eyebrow.textContent='Ruang Kerja · Konselor';
  if (!header.querySelector('.page-heading-icon')) {
    const visual=document.createElement('span'); visual.className='page-heading-icon'; visual.innerHTML=icon('book'); visual.setAttribute('aria-hidden','true'); header.prepend(visual);
  }
  const referral=root.querySelector('.counselor-attendance-panel'), table=root.querySelector('.table-card');
  if (referral && table) table.before(referral);
  root.querySelectorAll('.data-table').forEach(table => {
    const headers=Array.from(table.querySelectorAll('thead th'),h=>h.textContent);
    table.querySelectorAll('tbody tr').forEach(row=>Array.from(row.cells).forEach((cell,i)=>{if(cell.colSpan===1)cell.dataset.label=headers[i]||'';}));
    const cell=table.querySelector('tbody td[colspan]');
    if (cell && cell.textContent.trim()==='Belum ada data.') {
      cell.classList.add('counselor-empty-cell');
      cell.innerHTML='<div class="counselor-empty"><span class="counselor-empty-art" aria-hidden="true">'+icon('book')+icon('search')+'</span><h3>'+e(route==='case-inbox'?'Belum ada data kasus masuk':'Belum ada data '+title.toLowerCase())+'</h3><p>'+e(route==='case-inbox'?'Laporan yang sesuai unit dan tingkat konselor akan tampil di sini. Periksa presensi untuk meninjau temuan Alfa atau Terlambat.':'Data yang tersedia sesuai akses Anda akan tampil di sini.')+'</p></div>';
    }
  });
}
