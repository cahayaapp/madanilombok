// Shared first-paint screen; no account data or artificial loading percentage.
(()=>{
 // A full splash belongs to application entry, not each internal document.
 try{
  if(sessionStorage.getItem('madaniSplashShown')==='1')return;
  sessionStorage.setItem('madaniSplashShown','1');
 }catch{
  // If storage is unavailable, a same-origin navigation is still internal.
  try{if(document.referrer&&new URL(document.referrer).origin===location.origin)return;}catch{}
 }
 const base=new URL('../',document.currentScript.src);
 const splash=document.createElement('div');splash.id='appSplash';splash.setAttribute('role','status');splash.setAttribute('aria-live','polite');
 splash.innerHTML=`<div class="splash-content"><img class="splash-logo" src="${new URL('brand/logo.svg',base)}" alt=""><h1>MADANI<span>APP</span></h1><p class="splash-institution">PONDOK PESANTREN AL-MADANI</p><p class="splash-motto">Ilmu hari ini, untuk generasi<br>esok yang lebih baik</p><div class="splash-dots" aria-hidden="true"><i></i><i></i><i></i></div><p class="splash-status">Memuat aplikasi…</p><button class="splash-continue" hidden type="button">Lanjutkan ke aplikasi</button></div>`;
 document.body.prepend(splash);
 let closed=false;
 const close=()=>{if(closed)return;closed=true;clearTimeout(timeout);splash.remove();};
 const timeout=setTimeout(()=>{splash.querySelector('.splash-status').textContent='Memuat lebih lama dari biasanya.';splash.querySelector('button').hidden=false;},12000);
 splash.querySelector('button').onclick=close;
 window.addEventListener('madani:ready',close,{once:true});
 window.addEventListener('error',close,{once:true});
 window.addEventListener('pageshow',event=>{if(event.persisted)close();});
})();
