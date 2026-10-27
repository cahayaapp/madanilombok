export function setSidebarOpen(open){
 const sidebar=document.getElementById('sidebar');if(!sidebar)return;
 sidebar.classList.toggle('open',open);
 document.getElementById('sidebarOverlay')?.classList.toggle('hidden',!open);
 document.querySelectorAll('[aria-controls="sidebar"]').forEach(button=>button.setAttribute('aria-expanded',String(open)));
}
export function toggleSidebar(){setSidebarOpen(!document.getElementById('sidebar')?.classList.contains('open'));}
