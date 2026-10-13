// Supply column labels for the stacked mobile table layout, including dynamic views.
export function labelMobileTables(root=document){
 for(const table of root.querySelectorAll('table')){
  const headers=[...(table.tHead?.rows[table.tHead.rows.length-1]?.cells||[])].map(c=>c.textContent.trim());
  if(!headers.length)continue;
  table.classList.add('mobile-stack-table');
  for(const body of table.tBodies)for(const row of body.rows){let column=0;for(const cell of row.cells){
   const label=cell.colSpan>1?'':headers[column]||'';
   if(cell.dataset.mobileLabel!==label)cell.dataset.mobileLabel=label;
   column+=cell.colSpan;
  }}
 }
}
if(typeof document!=='undefined'){
 let scheduled=false;
 const scan=()=>{scheduled=false;labelMobileTables();};
 new MutationObserver(records=>{if(!scheduled&&records.some(r=>r.type==='childList')){scheduled=true;requestAnimationFrame(scan);}}).observe(document.documentElement,{childList:true,subtree:true});
 scan();
}
