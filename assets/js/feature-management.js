import {ROLE_LABELS} from './permissions.js';
import {featureKey,protectedFeature,setFeatureSwitches} from './feature-switches.js';
import {roleMenuItems,defaultQuick} from './menu-layout.js';
import {bottomRoutes} from './role-experience.js';
import {getNode,patchNode} from './repository.js';
import {escapeHtml as e} from './utils.js';
export async function renderFeatureManagement({root,uid}){
 root.innerHTML='<p role="status">Memuat pengaturan fitur…</p>';
 try{
 const state=await getNode('settings/featureSwitches')||{};
 root.innerHTML='<section class="admin-page-hero"><div><p class="eyebrow">MENU PER ROLE</p><h2>Manajemen Fitur</h2><p>Pilih role, lalu atur fitur aktif dan tempat tampilnya di aplikasi.</p></div></section><div class="panel"><label>Role yang akan diatur<select id="featureRole"><option value="">Pilih role…</option>'+Object.entries(ROLE_LABELS).map(([id,label])=>'<option value="'+id+'">'+e(label)+'</option>').join('')+'</select></label></div><p id="featurePrompt">Pilih role untuk menampilkan pengaturan menunya.</p><form id="featureForm" hidden><div id="featureList"></div><button class="btn btn-primary" type="submit">Simpan Pengaturan</button><p id="featureStatus" role="status"></p></form>';
 const role=root.querySelector('#featureRole'),list=root.querySelector('#featureList'),status=root.querySelector('#featureStatus'),form=root.querySelector('#featureForm');
 const render=()=>{
 form.hidden=!role.value;root.querySelector('#featurePrompt').hidden=!!role.value;status.textContent='';if(!role.value){list.innerHTML='';return;}
 const items=roleMenuItems(role.value),config=state[role.value]?._menus||{},quick=defaultQuick(role.value),seen=new Set();
 const chosen=(section,id,fallback)=>Object.hasOwn(config,section)?Array.isArray(config[section])?config[section].includes(id):config[section]?.[id]===true:fallback;
 const choice=(item,section,checked,locked=false)=>'<label class="feature-choice"><input type="checkbox" '+(section?'data-menu="'+section+'" data-route="'+e(item.id)+'"':'data-feature="'+e(item.feature||'dashboard')+'"')+' '+(checked?'checked ':'')+(locked?'disabled ':'')+'><span><strong>'+e(item.label)+'</strong><small>'+(locked?'Fitur inti · selalu aktif':section?'Tampilkan di bagian ini':'Izinkan akses fitur untuk role ini')+'</small></span></label>';
 const features=items.filter(i=>{const f=i.feature||'dashboard';if(seen.has(f))return false;seen.add(f);return true;});
 list.innerHTML='<section class="panel"><h3>Fitur Aktif</h3><p>Fitur nonaktif tidak dapat dibuka melalui menu maupun tautan langsung. Pengaturan menu di bawah hanya mengatur penempatannya.</p><div class="feature-grid">'+features.map(i=>choice(i,null,protectedFeature(i.feature||'dashboard')||state[role.value]?.[featureKey(i.feature||'dashboard')]!==false,protectedFeature(i.feature||'dashboard'))).join('')+'</div></section>'+[['quick','Akses Cepat','Kartu utama di beranda.'],['other','Menu Lainnya','Kartu menu di bawah Akses Cepat.'],['sidebar','Sidebar Menu','Daftar menu pada panel samping.']].map(([section,title,description])=>'<section class="panel"><h3>'+title+'</h3><p>'+description+'</p><div class="feature-grid">'+items.filter(i=>section==='sidebar'||!['dashboard','parent-home'].includes(i.id)).map(i=>choice(i,section,chosen(section,i.id,section==='sidebar'||(section==='quick'?quick.includes(i.id):!quick.includes(i.id))))).join('')+'</div></section>').join('');
 const defaults=bottomRoutes(role.value,id=>items.some(i=>i.id===id));
 list.insertAdjacentHTML('beforeend','<section class="panel"><h3>Bottom Menu</h3><p>Beranda tetap di tengah dan Lainnya membuka sidebar. Atur tiga posisi lainnya.</p><div class="feature-grid">'+[['schedule','Posisi 1 (kiri)'],['messages','Posisi 2'],['profile','Posisi 4']].map(([slot,label])=>'<label>'+label+'<select data-bottom="'+slot+'"><option value="">Tidak ditampilkan</option>'+items.filter(i=>i.id!=='dashboard').map(i=>'<option value="'+e(i.id)+'" '+((config.bottom?config.bottom[slot]:defaults[slot])===i.id?'selected':'')+'>'+e(i.label)+'</option>').join('')+'</select></label>').join('')+'</div></section>');
 const sync=()=>{const off=new Set([...list.querySelectorAll('[data-feature]')].filter(i=>!i.checked).map(i=>i.dataset.feature));list.querySelectorAll('[data-menu]').forEach(input=>{input.disabled=off.has(items.find(i=>i.id===input.dataset.route)?.feature);});list.querySelectorAll('[data-bottom] option').forEach(option=>{option.disabled=off.has(items.find(i=>i.id===option.value)?.feature);});};
 list.querySelectorAll('[data-feature]').forEach(input=>input.onchange=sync);sync();
 };
 role.onchange=render;render();
 form.onsubmit=async event=>{
 event.preventDefault();if(!role.value)return;const button=form.querySelector('button[type=submit]'),selectedRole=role.value,patch={},next={};
 for(const input of list.querySelectorAll('input[data-feature]:not(:disabled)')){const key=featureKey(input.dataset.feature);next[key]=input.checked;patch['settings/featureSwitches/'+selectedRole+'/'+key]=input.checked;}
 const menus={quick:{},other:{},sidebar:{},bottom:{}};
 for(const input of list.querySelectorAll('[data-menu]'))menus[input.dataset.menu][input.dataset.route]=input.checked;
 for(const select of list.querySelectorAll('[data-bottom]'))menus.bottom[select.dataset.bottom]=select.value;
 patch['settings/featureSwitches/'+selectedRole+'/_menus']=menus;
 button.disabled=true;role.disabled=true;list.querySelectorAll('input,select').forEach(el=>el.disabled=true);status.textContent='Menyimpan…';
 try{patch['settings/featureSwitchAudit/'+selectedRole]={updatedBy:uid,updatedAt:Date.now()};await patchNode('',patch);state[selectedRole]={...state[selectedRole],...next,_menus:menus};setFeatureSwitches(state);render();status.textContent='Pengaturan tersimpan. Pengguna perlu memuat ulang halaman.';}catch(err){render();status.textContent='Gagal menyimpan: '+err.message;}finally{button.disabled=false;role.disabled=false;}
 };
 }catch(err){root.innerHTML='<p role="alert">Pengaturan fitur tidak dapat dimuat: '+e(err.message)+'</p>';}
}
