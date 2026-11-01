// Credentials exist only in the current page until downloaded or discarded.
export function downloadNewUserCredentials({email,password}){
 const cell=value=>{
  let text=String(value??'');
  if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 const csv='\uFEFF'+[['Email','Password awal'],[email,password]].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='akun-user-baru.csv';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
