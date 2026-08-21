(function(){
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const slides=$$('[data-ref-slide]'),dots=$$('[data-ref-dot]');let active=0,timer;
  function show(i){if(!slides.length)return;active=(i+slides.length)%slides.length;slides.forEach((x,n)=>x.classList.toggle('is-active',n===active));dots.forEach((x,n)=>x.classList.toggle('is-active',n===active));}
  function autoplay(){clearInterval(timer);timer=setInterval(()=>show(active+1),6500)}
  dots.forEach((d,i)=>d.addEventListener('click',()=>{show(i);autoplay()}));
  $('[data-ref-next]')?.addEventListener('click',()=>{show(active+1);autoplay()});
  $('[data-ref-prev]')?.addEventListener('click',()=>{show(active-1);autoplay()});autoplay();

  $$('.ref-tab-nav button').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.tab;$$('.ref-tab-nav button').forEach(x=>x.classList.toggle('is-active',x===btn));$$('.ref-tab-content').forEach(x=>x.classList.toggle('is-active',x.dataset.panel===key));}));

  function closeVideo(){const m=$('.video-modal');if(!m)return;m.classList.remove('show');m.setAttribute('aria-hidden','true');const f=$('iframe',m);if(f)f.src='';document.body.style.overflow=''}
  $$('.ref-video-card[data-video-id]').forEach(btn=>btn.addEventListener('click',()=>{const m=$('.video-modal'),f=$('iframe',m);if(!m||!f)return;f.src=`https://www.youtube.com/embed/${btn.dataset.videoId}?autoplay=1&rel=0`;m.classList.add('show');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}));
  $('.video-modal')?.addEventListener('click',e=>{if(e.target.classList.contains('video-modal')||e.target.classList.contains('modal-close'))closeVideo()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeVideo()});
})();
