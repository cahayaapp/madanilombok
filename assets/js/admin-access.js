// Administrative surfaces are shared; operational roles and finance grants stay distinct.
export const UNIT_ADMIN_ROLES=['head_formal_school','head_boys_dorm','head_girls_dorm'];
export const ADMIN_ACCESS_ROLES=['admin','super_admin',...UNIT_ADMIN_ROLES];
export const hasAdminAccess=roles=>Array.isArray(roles)&&roles.some(role=>ADMIN_ACCESS_ROLES.includes(role));
export const ADMIN_DATA_HREF='../admin/index.html#students';
export function openAdminData(ctx){
 if(!UNIT_ADMIN_ROLES.includes(ctx.session.activeRole)||!ctx.session.roles.includes(ctx.session.activeRole)||ctx.session.profile?.active===false||ctx.session.profile?.accessRevoked===true)throw Error('Akses administrasi tidak tersedia.');
 ctx.root.innerHTML='<div class="empty-state"><p>Membuka Administrasi MadaniApp…</p><a class="btn btn-primary" href="'+ADMIN_DATA_HREF+'">Buka halaman Admin</a></div>';
 (ctx.openPage||((href)=>window.location.assign(href)))(ADMIN_DATA_HREF);
}
