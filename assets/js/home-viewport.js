// Fit vertically without scaling the page width, text, or touch targets as a whole.
export function fitHomeViewport(holder){
 if(!holder||typeof ResizeObserver==='undefined')return;
 let frame=0;
 const root=holder.parentElement;
 const nav=document.querySelector?.('.mobile-bottom-nav');
 const fit=()=>{
  if(!holder.isConnected){observer.disconnect();return;}
  let available=root.clientHeight;
  const navBox=nav?.getBoundingClientRect();
  if(navBox?.height>0&&root.getBoundingClientRect){
   const top=root.getBoundingClientRect().top;
   const parentHeight=root.parentElement?.clientHeight||Infinity;
   available=Math.max(1,Math.min(parentHeight,navBox.top-top-12));
   root.style.setProperty('height',`${available}px`,'important');
   root.style.setProperty('max-height',`${available}px`,'important');
  }else if(root.style){
   root.style.removeProperty('height');root.style.removeProperty('max-height');available=root.clientHeight;
  }
  if(!available)return;
  holder.style.removeProperty('transform');holder.style.removeProperty('transform-origin');
  holder.style.width='100%';root.classList?.remove('home-needs-scroll');
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
  // At extreme screen sizes/zoom, keep every action reachable instead of clipping it.
  root.classList?.toggle('home-needs-scroll',holder.scrollHeight>available+1);
 };
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);});
 observer.observe(root);observer.observe(holder);if(nav)observer.observe(nav);fit();
 document.fonts?.ready.then(()=>{if(holder.isConnected)fit();});
}
