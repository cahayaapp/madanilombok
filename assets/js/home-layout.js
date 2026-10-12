import {icon} from './teacher/ui.js';
import {escapeHtml as e} from './utils.js';
import {ROLE_EXPERIENCE} from './role-experience.js';

// Move existing action nodes so quick actions retain their original handlers.
export function arrangeHome(ctx,items=[]){
 const root=ctx.root;
 const candidates=[...root.querySelectorAll('.hub-quick-card,.role-quick-card,.me-card.primary,.mu-feature')];
 const route=b=>b.dataset.homeRoute||b.dataset.quick||b.dataset.route||b.dataset.quranRoute||b.dataset.go;
 const available=items.filter(i=>!['dashboard','parent-home'].includes(i.id));
 const make=i=>{const b=document.createElement('button');b.type='button';b.dataset.homeRoute=i.id;b.innerHTML=`<b>${e(i.label)}</b>`;b.onclick=()=>ctx.navigate(i.id);return b;};
 const quick=candidates.slice(0,4);
 if(!quick.length)for(const id of ROLE_EXPERIENCE[ctx.session.activeRole]?.quick||[]){const item=available.find(i=>i.id===id);if(item&&quick.length<4)quick.push(make(item));}
 if(!quick.length)quick.push(...available.slice(0,4).map(make));
 const used=new Set(quick.map(route));
 const label=b=>(b.querySelector('strong,b')?.textContent||b.textContent).trim().toLowerCase();
 const labels=new Set(quick.map(label));
 const rest=[...root.querySelectorAll('.hub-menu-card,.me-menu .me-card')].filter(b=>!used.has(route(b))&&!labels.has(label(b))); 
 for(const b of rest){used.add(route(b));labels.add(label(b));}
 for(const i of available)if(!used.has(i.id)&&!labels.has(i.label.trim().toLowerCase())){rest.push(make(i));used.add(i.id);labels.add(i.label.trim().toLowerCase());}
 const styleCard=(b,index,primary)=>{
  const title=b.querySelector('strong,b')?.textContent.trim()||b.textContent.trim();
  const sub=b.querySelector('small')?.textContent.trim()||'Buka ruang kerja Anda';
  const symbol=b.querySelector('svg')?.outerHTML||icon(/izin|sakit/i.test(title)?'cross':/presensi|hadir/i.test(title)?'check':/jadwal/i.test(title)?'calendar':/nilai|hasil/i.test(title)?'chart':/guru|santri|personil/i.test(title)?'user':'book');
  b.classList.add(primary?'premium-quick':'premium-menu');
  b.style.setProperty('--tile-index',index%4);
  b.innerHTML=`<span class="premium-icon">${symbol}</span><b>${e(title)}</b>${primary?`<small>${e(sub)}</small><span class="premium-arrow" aria-hidden="true">→</span>`:''}`;
  return b;
 };
 quick.forEach((b,i)=>styleCard(b,i,true));rest.forEach((b,i)=>styleCard(b,i,false));
 const preserved=document.createElement('div');
 while(root.firstChild)preserved.append(root.firstChild);
 root.innerHTML='<main class="premium-home"><section class="premium-section"><div class="premium-section-head"><h2>Akses Cepat Hari Ini</h2><button type="button" data-all-menus>Lihat Semua →</button></div><div class="premium-quick-grid"></div></section><section class="premium-section premium-workspace naqib-workspace-menu"><div class="premium-section-head"><h2>Menu Lainnya</h2><button type="button" data-all-menus>Semua menu →</button></div><div class="premium-menu-grid"></div></section></main>';
 const holder=root.querySelector('.premium-home');
 quick.forEach(b=>holder.querySelector('.premium-quick-grid').append(b));
 const menuGrid=holder.querySelector('.premium-menu-grid');
 // Eight compact shortcuts; the complete role menu remains reachable in the dialog.
 rest.slice(0,8).forEach(b=>menuGrid.append(b));
 const openDialog=(title,content)=>{const d=document.createElement('dialog');d.className='home-role-dialog premium-home-dialog';d.innerHTML=`<header><h2>${e(title)}</h2><button type="button" data-close aria-label="Tutup">×</button></header>`;d.append(content);root.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();};
 holder.querySelectorAll('[data-all-menus]').forEach(b=>b.onclick=()=>{const list=document.createElement('div');list.className='premium-all-menus';for(const item of available)list.append(styleCard(make(item),0,false));const summary=document.createElement('button');summary.type='button';summary.textContent='Ringkasan & Informasi';summary.onclick=()=>openDialog('Ringkasan & Informasi',preserved);list.append(summary);openDialog('Semua Menu',list);});
}
