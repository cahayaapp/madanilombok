// Fit vertically without scaling the page width, text, or touch targets as a whole.
export function fitHomeViewport(holder){
 if(!holder||typeof ResizeObserver==='undefined')return;
 let frame=0;
 const root=holder.parentElement;
 const fit=()=>{
  if(!holder.isConnected){observer.disconnect();return;}
  const available=root.clientHeight;if(!available)return;
  holder.style.removeProperty('transform');holder.style.removeProperty('transform-origin');
  holder.style.width='100%';
  holder.classList.toggle('home-compact',available<760||holder.querySelectorAll('.premium-menu').length>12);
  let density=1;holder.style.setProperty('--home-density',density);
  // Preserve desktop fitting; mobile must always occupy the full available width.
  if(typeof matchMedia==='function'&&matchMedia('(min-width:901px)').matches){
   const needed=Math.max(holder.scrollHeight,holder.getBoundingClientRect().height);
   holder.style.transform=`scale(${Math.min(1,available/needed)})`;
   holder.style.transformOrigin='top center';return;
  }
  for(let i=0;i<6&&holder.scrollHeight>available+1;i++){
   density=Math.max(.55,density*available/holder.scrollHeight);
   holder.style.setProperty('--home-density',density.toFixed(3));
   if(density===.55)break;
  }
 };
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);});
 observer.observe(root);observer.observe(holder);fit();
 document.fonts?.ready.then(()=>{if(holder.isConnected)fit();});
}
