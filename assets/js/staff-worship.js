import {dormPersonnel,personnelGender,personnelRoles} from './boarding-personnel-scope.js';
import {getNode,listNode,saveWorkspaceRecord,transitionWorkspaceRecord} from './repository.js';
import {canAccess} from './permissions.js';
import {managementScope} from './workflow-model.js';
import {localDate} from './role-experience.js';
import {e,mount,action,empty,icon} from './teacher/ui.js';
export const PRAYERS=[['subuh','Subuh'],['dzuhur','Dzuhur'],['ashar','Ashar'],['maghrib','Maghrib'],['isya','Isya']];
export const WORSHIP_STATUSES=['Hadir','Tidak Hadir','Izin','Sakit','Tugas Lembaga','Belum Diisi'];
const authorize=(ctx,r)=>{if(!canAccess(`workspace.${r}`,[ctx.session.activeRole]))throw Error('Role tidak berwenang.');};
async function people(ctx){
 if(['head_boys_dorm','head_girls_dorm'].includes(ctx.session.activeRole))return [...(ctx.master.staff||[])].sort((a,b)=>(a.name||'').localeCompare(b.name||'','id'));
 const role=ctx.session.activeRole,gender=role==='head_boys_dorm'?'L':role==='head_girls_dorm'?'P':'',units=ctx.session.profile.roleScopes?.[role]?.unitIds??ctx.session.profile.unitIds??[];
 const [accounts,duty]=await Promise.all([listNode('users'),getNode('settings/naqibDuty/staff')]);const master={...ctx.master,naqibDuty:duty||{}},candidates=[...accounts,...(ctx.master.staff||[]).filter(s=>!accounts.some(u=>u.staffId===s.id)).map(s=>({staffId:s.id,roles:s.appRoles||[],scopeGender:s.scopeGender,gender:s.gender}))],users=gender?dormPersonnel(candidates,role,master):accounts,map=new Map();for(const u of users){if(u.active===false||u.accessRevoked||!u.staffId)continue;const staff=ctx.master.staff.find(s=>s.id===u.staffId);if(!staff||staff.status==='inactive')continue;if(gender?personnelGender(staff,u,duty?.[staff.id])!==gender:role==='head_formal_school'?!staff.unitIds?.some(id=>units.includes(id)):false)continue;const roles=personnelRoles(u);map.set(staff.id,{...staff,naqib:roles.has('naqib')||duty?.[staff.id]?.active===true});}return [...map.values()];}
// Scope is an explicit selection by each head, independent of staff gender.
const residentKey=(scope,id)=>`${scope}__${id}`;
function residentSetting(saved,scope,id){
 return saved[residentKey(scope,id)] ?? (saved[id]?.scope===scope?saved[id]:undefined);
}
export async function renderResidentStaff(ctx){authorize(ctx,'management-residents');const ws=mount(ctx,'Pengaturan Guru Mukim','Pilih SDM lintas lembaga/asrama untuk daftar absensi ibadah unit Anda.'),rows=await people(ctx),path=`workspaces/${ctx.yearId}/resident_staff`,saved=await getNode(path)||{},scope=managementScope(ctx.session.activeRole,ctx.session.profile);ws.innerHTML=`<section class="teacher-panel">${rows.map(p=>`<label class="assessment-choice"><input type="checkbox" data-resident="${e(p.id)}" ${residentSetting(saved,scope,p.id)?.resident?'checked':''}><span>${e(p.name)}</span></label>`).join('')||empty('Belum ada Data SDM.')}<button id="saveResidents" class="teacher-primary" ${!rows.length?'disabled':''}>Simpan Pengaturan</button></section>`;action(ctx,ws.querySelector('#saveResidents'),async()=>{for(const el of ws.querySelectorAll('[data-resident]')){const id=el.dataset.resident,previous=residentSetting(saved,scope,id);if(previous?.resident===el.checked||!previous&&!el.checked)continue;await saveWorkspaceRecord(path,residentKey(scope,id),{academicYearId:ctx.yearId,staffId:id,resident:el.checked,scope},ctx.session.user.uid);}await renderResidentStaff(ctx);const notice=document.createElement('p');notice.className='muqim-feedback';notice.setAttribute('role','status');notice.textContent='Penetapan personil mukim berhasil disimpan.';ctx.root.querySelector('.teacher-content').prepend(notice);});}
const STATUS_PATHS=[
 '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
 '<path d="m6 6 12 12M18 6 6 18"/>',
 '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',
 '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18M10 11v3h4v-3"/>'
];
const statusIcon=i=>`<svg viewBox="0 0 24 24" aria-hidden="true">${STATUS_PATHS[i]}</svg>`;
function worshipRow(p,value){return `<article class="muqim-row"><div class="muqim-person"><span class="muqim-avatar">${icon('user')}</span><strong>${e(p.name)}</strong></div><div class="muqim-options" role="group" aria-label="Kehadiran ${e(p.name)}"><select data-person="${e(p.id)}" hidden aria-label="Status ${e(p.name)}">${WORSHIP_STATUSES.map(s=>`<option ${value===s?'selected':''}>${s}</option>`).join('')}</select>${WORSHIP_STATUSES.slice(0,5).map((s,i)=>`<button type="button" class="muqim-status muqim-status-${i}" data-status="${e(s)}" aria-pressed="${value===s}">${statusIcon(i)}<span>${e(s)}</span></button>`).join('')}</div></article>`;}
export async function renderStaffWorship(ctx){
 authorize(ctx,'management-worship');
 const scope=managementScope(ctx.session.activeRole,ctx.session.profile),ws=mount(ctx,'Presensi Ibadah Naqib & Guru Mukim','Lima waktu salat. Kehadiran diisi berdasarkan pengamatan petugas.'),all=await people(ctx);
 ctx.root.querySelector('.teacher-page').classList.add('muqim-page');
 let token=0;
 ws.innerHTML=`<section class="teacher-panel muqim-time"><h2>${icon('calendar')} Informasi Waktu</h2><div class="muqim-fields"><label class="field">Tanggal<input type="date" id="worshipDate" value="${localDate()}" max="${localDate()}"></label><label class="field">Waktu salat<select id="worshipPrayer">${PRAYERS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label></div></section><div id="worshipBody"></div>`;
 async function draw(message=''){
  const request=++token,date=ws.querySelector('#worshipDate').value,prayer=ws.querySelector('#worshipPrayer').value,id=`${date}_${scope}_${prayer}`,path=`workspaces/${ctx.yearId}/staff_worship`,body=ws.querySelector('#worshipBody');
  body.innerHTML=empty('Memuat absensi ibadah…');
  const [saved,settings]=await Promise.all([getNode(`${path}/${id}`),getNode(`workspaces/${ctx.yearId}/resident_staff`)]);
  if(request!==token)return;
  const roster=all.filter(s=>residentSetting(settings||{},scope,s.id)?.resident===true);
  body.innerHTML=`<section class="teacher-panel muqim-attendance"><div class="muqim-heading"><div><h2>${icon('people')} Kehadiran Petugas</h2><p>Pilih keterangan kehadiran setiap petugas pada waktu salat ini.</p></div><button id="presentAll" class="teacher-secondary" ${roster.length?'':'disabled'}>${icon('check')} Tandai Semua Hadir</button></div><div class="muqim-table-head"><span>Nama Petugas</span><span>Keterangan Kehadiran</span></div><div class="muqim-roster">${roster.map(p=>worshipRow(p,saved?.attendance?.[p.id]||'Belum Diisi')).join('')||empty('Belum ada personil dipilih untuk unit ini. Buka Tetapkan Personil Mukim.')}</div><p class="muqim-feedback" role="status">${e(message)}</p><footer class="muqim-footer"><button class="teacher-secondary" id="residentSettings">Tetapkan Personil Mukim</button><button id="saveWorship" class="teacher-primary" ${roster.length?'':'disabled'}>${icon('check')} Simpan Absensi Ibadah →</button></footer></section>`;
  const sync=row=>row.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===row.querySelector('[data-person]').value)));
  body.querySelectorAll('.muqim-row').forEach(row=>{row.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{row.querySelector('[data-person]').value=b.dataset.status;sync(row);});});
  body.querySelector('#presentAll').onclick=()=>body.querySelectorAll('.muqim-row').forEach(row=>{row.querySelector('[data-person]').value='Hadir';sync(row);});
  body.querySelector('#residentSettings').onclick=()=>ctx.navigate('management-residents');
  action(ctx,body.querySelector('#saveWorship'),async()=>{
   if(request!==token||!date||date>localDate())throw Error('Tanggal belum berlangsung atau pilihan berubah.');
   const attendance=Object.fromEntries([...body.querySelectorAll('[data-person]')].map(el=>[el.dataset.person,el.value]));
   if(Object.values(attendance).some(v=>!WORSHIP_STATUSES.includes(v)))throw Error('Status tidak valid.');
   const currentSettings=await getNode(`workspaces/${ctx.yearId}/resident_staff`)||{};
   if(roster.some(p=>residentSetting(currentSettings,scope,p.id)?.resident!==true))throw Error('Penetapan personil berubah. Pilih ulang waktu salat untuk memuat daftar terbaru.');
   const data={academicYearId:ctx.yearId,date,prayer,scope,attendance,version:(saved?.version||0)+1};
   try{
    if(saved)await transitionWorkspaceRecord(path,id,current=>{if((current.version||0)!==(saved.version||0))throw Error('Absensi berubah. Muat ulang.');return {...current,...data};},ctx.session.user.uid);
    else await saveWorkspaceRecord(path,id,data,ctx.session.user.uid);
   }catch(ex){if(/permission.denied/i.test(ex.code||ex.message))throw Error('Penyimpanan ditolak oleh aturan database. Hubungi Administrator untuk memeriksa aturan muqim dan akses unit akun Anda.');throw ex;}
   if(request===token)await draw('Absensi ibadah berhasil disimpan.');
  });
 }
 for(const id of ['worshipDate','worshipPrayer'])ws.querySelector('#'+id).onchange=()=>draw().catch(ex=>ctx.root.querySelector('.teacher-errors').textContent=ex.message);
 await draw();
}
