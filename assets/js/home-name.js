
let nameObserver;
export function fitHomeName(heading){
 nameObserver?.disconnect();
 const fit=()=>{
  if(!heading.isConnected||!heading.clientWidth)return;
  heading.style.removeProperty('font-size');
  heading.style.setProperty('white-space','nowrap','important');
  const maximum=parseFloat(window.getComputedStyle(heading).fontSize)||24;
  let size=maximum;
  while(heading.scrollWidth>heading.clientWidth+1&&size>14){size-=0.5;heading.style.setProperty('font-size',`${size}px`,'important');}
  if(heading.scrollWidth>heading.clientWidth+1){
   heading.style.setProperty('white-space','normal','important');
   while(heading.scrollHeight>size*2.3&&size>10){size-=0.5;heading.style.setProperty('font-size',`${size}px`,'important');}
  }
 };
 fit();
 if(window.ResizeObserver){nameObserver=new window.ResizeObserver(fit);nameObserver.observe(heading.parentElement);}
 document.fonts?.ready.then(fit);
}
