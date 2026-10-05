import {ROLE_EXPERIENCE,localDate} from './role-experience.js';
import {escapeHtml as e} from './utils.js';
export function decorateManagement(ctx){
 ctx.root.classList.add('me-shell','management-page');
 const map={'.portal-section-head':'me-hero','.eyebrow':'me-eyebrow','.panel':'me-panel','.workspace-record':'me-row','.workspace-record-head':'me-row-head','.badge':'me-status','.filter-row':'me-toolbar','.portal-form':'me-form','.btn':'me-btn','.btn-primary':'primary','.empty-state':'me-empty','.portal-metrics':'me-summary','.portal-metric':'me-stat'};
 for(const [selector,name]of Object.entries(map))ctx.root.querySelectorAll(selector).forEach(el=>el.classList.add(name));
}
export function renderManagementHome(ctx,items){
 const experience=ROLE_EXPERIENCE[ctx.session.activeRole],name=ctx.session.profile.name||ctx.session.profile.displayName||ctx.roleName,available=new Map(items.map(i=>[i.id,i])),quick=experience.quick.map(id=>available.get(id)).filter(Boolean),rest=items.filter(i=>i.id.startsWith('management-')&&!quick.some(q=>q.id===i.id));
 ctx.root.innerHTML=`<main class="me-shell"><header class="me-hero"><span class="me-eyebrow">MADANIAPP · ${e(experience.focus.toUpperCase())}</span><h1>${e(name)}</h1><p>${e(experience.title)}</p><div class="me-meta"><span>${e(ctx.roleName)}</span><span>${e(localDate())}</span></div></header><section class="me-section"><div class="me-section-title"><span>PRIORITAS KERJA</span><h2>Mulai dari sini</h2></div><div class="me-grid">${quick.map(i=>card(i,true)).join('')}</div></section><section class="me-section me-menu"><div class="me-section-title"><span>RUANG KERJA</span><h2>${e(ctx.roleName)}</h2></div><div class="me-grid">${rest.map(i=>card(i)).join('')}</div></section></main>`;
 function card(i,primary=false){return `<button class="me-card ${primary?'primary':''}" data-home-route="${e(i.id)}"><span class="me-icon">${i.icon}</span><b>${e(i.label)}</b><small>${e(experience.focus)}</small><em>Buka →</em></button>`;}
 ctx.root.querySelectorAll('[data-home-route]').forEach(b=>b.onclick=()=>ctx.navigate(b.dataset.homeRoute));
}
