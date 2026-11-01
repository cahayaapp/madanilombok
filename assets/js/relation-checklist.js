import {escapeHtml as e} from './utils.js';
export function relationChecklist(name,options,value=[]){
 const selected=Array.isArray(value)?value:typeof value==='string'?value.split(',').map(v=>v.trim()).filter(Boolean):[];
 const choices=new Map(options.map(o=>[String(o.value),o.label]));
 for(const id of selected)if(!choices.has(String(id)))choices.set(String(id),`${id} (pilihan tersimpan)`);
 return `<div class="relation-checklist">${[...choices].map(([id,label])=>`<label class="relation-checklist-option"><input type="checkbox" name="${e(name)}" value="${e(id)}" ${selected.map(String).includes(id)?'checked':''}><span>${e(label)}</span></label>`).join('')||'<p class="muted">Belum ada pilihan tersedia.</p>'}</div>`;
}
