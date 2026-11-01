import {ROLE_LABELS} from './permissions.js';
import {roleIds} from './user-access-model.js';

// Quote every field and keep spreadsheet formulas as literal text.
const cell=value=>{
 let text=String(value??'');
 if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
};
export function userExportCsv(profiles,staff=[]){
 const names=new Map(staff.map(person=>[person.id,person.name]));
 const rows=[['ID User','Nama','Email','ID SDM','Nama SDM','Role','Role Utama','Status'],...profiles.map(p=>[
  p.id||p.uid,p.name||p.displayName,p.email,p.staffId,names.get(p.staffId)||'',
  roleIds(p).map(role=>ROLE_LABELS[role]||role).join('; '),
  ROLE_LABELS[p.defaultRole||p.role]||p.defaultRole||p.role||'',
  p.accessRevoked?'Akses dicabut':p.active===false?'Nonaktif':'Aktif'
 ])];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function downloadUserExport(profiles,staff){
 const url=URL.createObjectURL(new Blob([userExportCsv(profiles,staff)],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=`data-user-${new Date().toISOString().slice(0,10)}.csv`;
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
