(function(){
  const cms=window.AlMadaniCMS;
  const data=cms?cms.getData():{};
  const site=data.site||{};
  const $=(s,c=document)=>c.querySelector(s);
  const $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  function setText(){
    const hero=$('[data-hero-title]');if(hero&&site.heroTitle){const parts=String(site.heroTitle).split(/\.\s*/).filter(Boolean);if(parts.length>1){hero.innerHTML=`<span class="grad-text">${escapeHtml(parts[0])}.</span><br>${escapeHtml(parts.slice(1).join('. '))}${String(site.heroTitle).trim().endsWith('.')?'.':''}`}else{hero.textContent=site.heroTitle}}
    $$('[data-site]').forEach(el=>{const key=el.dataset.site;if(site[key]!==undefined)el.textContent=site[key]||''});
    $$('[data-site-href]').forEach(el=>{const key=el.dataset.siteHref;if(site[key])el.href=site[key]});
    $$('[data-site-img]').forEach(el=>{const key=el.dataset.siteImg;if(site[key])el.src=site[key]});
    document.title=document.body.dataset.title?`${document.body.dataset.title} · ${site.name}`:site.name;
  }
  function activeNav(){
    $$('.navlinks a,.mobile-menu a').forEach(a=>{const href=(a.getAttribute('href')||'').toLowerCase();if((path==='index.html'&&href==='index.html')||href===path)a.classList.add('active')});
  }
  function mobile(){
    const b=$('.mobile-toggle'),m=$('.mobile-menu');if(!b||!m)return;
    b.addEventListener('click',()=>{m.classList.toggle('show');b.setAttribute('aria-expanded',m.classList.contains('show')?'true':'false')});
    $$('a',m).forEach(a=>a.addEventListener('click',()=>m.classList.remove('show')));
  }
  function renderStats(){
    const host=$('[data-stats]');if(!host)return;
    host.innerHTML=(data.stats||[]).map(x=>`<div class="stat-item"><strong>${x.value}</strong><span>${x.label}</span></div>`).join('');
  }
  function renderPrograms(){
    const host=$('[data-programs]');if(!host)return;
    host.innerHTML=(data.programs||[]).map((x,i)=>`<article class="program-card reveal"><span class="program-no">0${i+1}</span><div class="program-icon">${x.code}</div><h3>${x.title}</h3><p>${x.desc}</p><a class="arrow" href="pendidikan.html">Pelajari program →</a></article>`).join('');
  }
  function renderFacilities(){
    const host=$('[data-facilities]');if(!host)return;
    host.innerHTML=(data.facilities||[]).map((x,i)=>`<div class="facility reveal"><span>${String(i+1).padStart(2,'0')}</span><strong>${x}</strong></div>`).join('');
  }
  function renderNews(limit){
    const host=$('[data-news]');if(!host)return;
    let items=data.news||[];if(limit)items=items.slice(0,limit);
    host.innerHTML=items.map((n,i)=>`<article class="news-card reveal"><div class="news-thumb"><img src="${n.image}" alt="${escapeHtml(n.title)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/spmb-students.webp'"><span class="tag">${n.category}</span></div><div class="news-body"><div class="meta">${n.date}</div><h3>${n.title}</h3><p>${n.excerpt}</p><a href="${n.url}" target="_blank" rel="noopener">Lihat dokumentasi →</a></div></article>`).join('');
  }
  function renderVideos(){
    const host=$('[data-videos]');if(!host)return;
    const v=data.videos||[];if(!v.length)return;
    const thumb=x=>`https://i.ytimg.com/vi/${x.id}/maxresdefault.jpg`;
    const card=(x,cls)=>`<article class="${cls}" data-video-id="${x.id}" tabindex="0" role="button" aria-label="Putar ${escapeHtml(x.title)}"><img src="${thumb(x)}" alt="${escapeHtml(x.title)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/spmb-students.webp'"><span class="play">▶</span><div class="video-copy"><h3>${x.title}</h3><span>${x.meta}</span></div></article>`;
    host.innerHTML=`${card(v[0],'video-feature')}${v.length>1?`<div class="video-stack">${v.slice(1,3).map(x=>card(x,'video-card')).join('')}</div>`:''}`;
    $$('[data-video-id]',host).forEach(el=>{const go=()=>openVideo(el.dataset.videoId);el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
  }
  function openVideo(id){
    let modal=$('.video-modal');if(!modal){modal=document.createElement('div');modal.className='video-modal';modal.innerHTML='<div class="video-dialog"><button class="modal-close" aria-label="Tutup video">×</button><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.classList.contains('modal-close'))closeVideo()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeVideo()})}
    $('iframe',modal).src=`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;modal.classList.add('show');document.body.style.overflow='hidden';
  }
  function closeVideo(){const modal=$('.video-modal');if(!modal)return;modal.classList.remove('show');const f=$('iframe',modal);if(f)f.src='';document.body.style.overflow=''}
  function renderTahfiz(){
    const t=data.tahfiz||{};const host=$('[data-tahfiz-tracks]');if(host)host.innerHTML=(t.tracks||[]).map((x,i)=>`<article class="step reveal"><div class="step-no">0${i+1}</div><h3>${x.title}</h3><p>${x.desc}</p></article>`).join('');
    $$('[data-tahfiz]').forEach(el=>{const key=el.dataset.tahfiz;if(t[key])el.textContent=t[key]});
  }
  function renderSpmb(){
    const s=data.spmb||{};$$('[data-spmb]').forEach(el=>{const key=el.dataset.spmb;if(s[key])el.textContent=s[key]});
    const req=$('[data-spmb-requirements]');if(req)req.innerHTML=(s.requirements||[]).map(x=>`<div class="feature-item"><span class="check">✓</span><div><strong>${x}</strong></div></div>`).join('');
    const con=$('[data-spmb-contacts]');if(con)con.innerHTML=(s.contacts||[]).map(x=>`<div class="contact-card"><span class="cicon">WA</span><div><strong>Kontak Pendaftaran</strong><span>${x}</span></div></div>`).join('');
  }
  function reveal(){
    const els=$$('.reveal');if(!('IntersectionObserver'in window)){els.forEach(x=>x.classList.add('in'));return}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});els.forEach(x=>io.observe(x));
  }
  function copyYear(){$$('[data-year]').forEach(x=>x.textContent=new Date().getFullYear())}
  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  setText();activeNav();mobile();renderStats();renderPrograms();renderFacilities();renderNews(document.body.dataset.newsLimit?Number(document.body.dataset.newsLimit):0);renderVideos();renderTahfiz();renderSpmb();copyYear();requestAnimationFrame(reveal);
})();
