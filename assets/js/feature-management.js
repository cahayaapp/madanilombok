import {MENU_GROUPS,ROLE_LABELS,featuresForRoles} from './permissions.js';
import {featureKey,protectedFeature,setFeatureSwitches} from './feature-switches.js';
import {getNode,patchNode} from './repository.js';
import {escapeHtml as e} from './utils.js';
export async function renderFeatureManagement({root,uid}){
 root.innerHTML='<p role="status">Memuat pengaturan fitur…</p>';
 try{
 const state=await getNode('settings/featureSwitches')||{};
 root.innerHTML='<section class="admin-page-hero"><div><p class="eyebrow">AKSES PER ROLE</p><h2>Manajemen Fitur</h2><p>Atur fitur yang sudah tersedia untuk setiap role. Penonaktifan tidak menghapus data atau penugasan.</p></div></section><div class="toolbar"><label>Role <select id="featureRole">'+Object.entries(ROLE_LABELS).map(([id,label])=>'<option value="'+id+'">'+e(label)+'</option>').join('')+'</select></label></div><p>Beranda, pengelolaan Admin, profil, panduan, dan fitur keuangan tetap aktif. Pengaturan berlaku setelah halaman pengguna dimuat ulang.</p><form id="featureForm"><div id="featureList"></div><button class="btn btn-primary" type="submit">Simpan Pengaturan</button><p id="featureStatus" role="status"></p></form>';
 const role=root.querySelector('#featureRole'),list=root.querySelector('#featureList'),status=root.querySelector('#featureStatus');
 const render=()=>{const grants=featuresForRoles([role.value]),seen=new Set();status.textContent='';
 list.innerHTML=MENU_GROUPS.map(group=>{const items=group.items.filter(item=>{const f=item.feature||'dashboard';if(!grants.has(f)||seen.has(f))return false;seen.add(f);return true;});return items.length?'<section class="panel"><h3>'+e(group.label)+'</h3><div class="feature-grid">'+items.map(item=>{const f=item.feature||'dashboard',locked=protectedFeature(f);return '<label class="feature-choice"><input type="checkbox" data-feature="'+e(f)+'" '+(locked||state[role.value]?.[featureKey(f)]!==false?'checked ':'')+(locked?'disabled ':'')+'><span><strong>'+e(item.label)+'</strong><small>'+(locked?'Fitur inti · selalu aktif':'Aktifkan untuk role ini')+'</small></span></label>';}).join('')+'</div></section>':'';}).join('');};
 role.onchange=render;render();
 root.querySelector('#featureForm').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),selectedRole=role.value,patch={},next={};for(const input of list.querySelectorAll('input[data-feature]:not(:disabled)')){const key=featureKey(input.dataset.feature);next[key]=input.checked;patch['settings/featureSwitches/'+selectedRole+'/'+key]=input.checked;}
 button.disabled=true;role.disabled=true;status.textContent='Menyimpan…';
 try{patch['settings/featureSwitchAudit/'+selectedRole]={updatedBy:uid,updatedAt:Date.now()};await patchNode('',patch);state[selectedRole]={...state[selectedRole],...next};setFeatureSwitches(state);status.textContent='Pengaturan tersimpan. Pengguna perlu memuat ulang halaman.';}catch(err){status.textContent='Gagal menyimpan: '+err.message;}finally{button.disabled=false;role.disabled=false;}
 };
 }catch(err){root.innerHTML='<p role="alert">Pengaturan fitur tidak dapat dimuat: '+e(err.message)+'</p>';}
}
