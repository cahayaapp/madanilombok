import { ADMIN_HOME_ROUTES, ADMIN_WORKSPACES, workspaceFor } from './admin-workspaces.js';

// One navigation model for the portal, data editor, and account manager.
export function mountAdminSidebar({ document: doc = document, surface = 'portal', route = 'dashboard', visible = () => true } = {}) {
  const sidebar = doc.getElementById('sidebar');
  const nav = doc.getElementById('navMenu');
  if (!sidebar || !nav) return;
  sidebar.classList.add('admin-sidebar');
  if (!sidebar.querySelector('.system-label')) {
    const block = doc.createElement('div');
    block.className = 'admin-sidebar-system';
    block.innerHTML = '<div class="system-label"><div><strong>Al-Madani Integrated System</strong><small>Akademik · Asrama · Wali · Keuangan</small></div></div>';
    sidebar.querySelector('.sidebar-brand').after(block);
  }
  const items = [
    { id: 'dashboard', title: 'Beranda', icon: '⌂', href: '../app/index.html' },
    ...Object.entries(ADMIN_HOME_ROUTES).map(([id, item]) => ({ id, title: ADMIN_WORKSPACES[item.workspace].title, workspace: item.workspace, icon: item.workspace === 'features' ? '⚙' : '▦', href: item.href.replace('../admin/', './') })),
    { id: 'work-messages', title: 'Pesan Internal', icon: '☏', href: '../app/index.html#work-messages' },
    { id: 'work-profile', title: 'Profil Saya', icon: '♙', href: '../app/index.html#work-profile' },
    { id: 'work-guide', title: 'Panduan', icon: '?', href: '../app/index.html#work-guide' }
  ];
  nav.innerHTML = items.filter(item => visible(item.id)).map(item => {
    const active = surface === 'portal' ? route === item.id : surface === 'accounts' ? item.workspace === 'users' : item.workspace === workspaceFor(route);
    const caption = item.id === 'dashboard' ? 'Utama' : item.id === 'admin-students' ? 'Administrasi' : item.id === 'work-messages' ? 'Lainnya' : '';
    const attrs = surface === 'portal' ? `data-route="${item.id}"` : surface === 'data' && item.workspace && item.workspace !== 'users' ? `data-workspace="${item.workspace}"` : `href="${item.href}"`;
    const tag = attrs.startsWith('href') ? 'a' : 'button';
    return `${caption ? `<div class="nav-caption">${caption}</div>` : ''}<${tag} class="nav-item${active ? ' active' : ''}" ${attrs}><span class="nav-icon" aria-hidden="true">${item.icon}</span><span>${item.title}</span></${tag}>`;
  }).join('');
}
