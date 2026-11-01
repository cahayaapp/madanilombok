import {homeHeader} from './home-role-switcher.js';
import {setSidebarOpen,toggleSidebar} from './sidebar-control.js';

// Use the portal header and profile while keeping the desktop admin toolbar.
export function mountAdminHeader(session, navigate = route => { window.location.href = `../app/index.html#${route}`; }) {
  const top = document.querySelector('.admin-console .topbar');
  if (!top) return;
  let host = top.querySelector('.admin-mobile-header');
  if (!host) {
    host = document.createElement('div');
    host.className = 'persistent-home-header admin-mobile-header';
    top.append(host);
  }
  host.innerHTML = homeHeader({session});
  top.classList.add('admin-header-ready');
  host.querySelector('.official-bell').onclick = () => navigate('work-messages');
  host.querySelector('.official-avatar').onclick = () => navigate('work-profile');
}

export function bindAdminDrawer() {
  document.querySelectorAll('#menuButton, [data-admin-menu]').forEach(button => {
    button.setAttribute('aria-controls', 'sidebar');
    button.setAttribute('aria-expanded', 'false');
    button.onclick = toggleSidebar;
  });
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.onclick = () => setSidebarOpen(false);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setSidebarOpen(false);
  });
}
