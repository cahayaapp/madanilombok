// Fit the complete home menu to the available viewport; never remove destinations.
export function fitHomeViewport(holder){
 if(!holder||typeof ResizeObserver==='undefined')return;
 let frame=0;
 const root=holder.parentElement;
 const fit=()=>{
  if(!holder.isConnected){observer.disconnect();return;}
  holder.style.transform='none';holder.style.width='100%';
  const available=root.clientHeight;
  if(!available)return;
  holder.classList.toggle('home-compact',available<760||holder.querySelectorAll('.premium-menu').length>12);
  const needed=Math.max(holder.scrollHeight,holder.getBoundingClientRect().height);
  const scale=Math.min(1,available/needed);
  holder.style.transform=`scale(${scale})`;
  holder.style.transformOrigin='top center';
 };
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);});
 observer.observe(root);observer.observe(holder);
 fit();
 document.fonts?.ready.then(()=>{if(holder.isConnected)fit();});
}
