/* Runtime branding dan aktivasi modul untuk seluruh halaman */
(function(){
  const C=window.CAHAYA_CONFIG||{};
  const app=C.app||{}, brand=C.branding||{}, theme=C.theme||{}, terms=C.terminology||{}, modules=C.modules||{};
  const root=document.documentElement;
  const vars={
    '--cahaya-primary':theme.primary,'--cahaya-primary-dark':theme.primaryDark,
    '--cahaya-secondary':theme.secondary,'--cahaya-accent':theme.accent,
    '--cahaya-success':theme.success,'--cahaya-danger':theme.danger
  };
  Object.entries(vars).forEach(([k,v])=>v&&root.style.setProperty(k,v));
  window.CahayaConfig={
    config:C,
    app:key=>app[key],
    term:key=>terms[key]||key,
    module:key=>modules[key]!==false,
    asset(path=''){if(!path)return path;if(/^(https?:|data:|blob:|\/)/i.test(path))return path;const tag=document.currentScript||[...document.scripts].find(s=>/cahaya-config-runtime\.js/.test(s.src));const src=tag?.src||location.href;return new URL('../'+path,new URL(src)).href},
    firebase:()=>C.firebase||{}
  };
  const exact=new Map([
    ['CAHAYA APP',String(app.name||'CAHAYA App').toUpperCase()],
    ['CAHAYA App',app.name||'CAHAYA App'],
    ['CAHAYA Workspace',app.workspaceName||`${app.shortName||'CAHAYA'} Workspace`],
    ['Pesantren Cahaya Fajrul Islam',app.institutionName||'Pesantren Cahaya Fajrul Islam'],
    ['PESANTREN CAHAYA FAJRUL ISLAM',String(app.institutionName||'Pesantren Cahaya Fajrul Islam').toUpperCase()],
    ['Pesantren Cahaya Fajrul Islam Belitung',app.institutionName||'Pesantren Cahaya Fajrul Islam'],
    ['Holistic Islamic School',app.tagline||'Holistic Islamic School'],
    ['HOLISTIC ISLAMIC SCHOOL',String(app.tagline||'Holistic Islamic School').toUpperCase()],
    ['Tahun Ajaran 2026/2027',`Tahun Ajaran ${app.academicYear||'2026/2027'}`]
  ]);
  const phrases=[
    [/Pesantren Cahaya Fajrul Islam Belitung/gi,app.institutionName],
    [/Pesantren Cahaya Fajrul Islam/gi,app.institutionName],
    [/CAHAYA APP/g,String(app.name||'CAHAYA App').toUpperCase()],
    [/CAHAYA App/g,app.name||'CAHAYA App'],
    [/Holistic Islamic School/gi,app.tagline]
  ].filter(x=>x[1]);
  function replaceTextNode(node){
    if(!node?.nodeValue||!node.nodeValue.trim())return;
    let v=node.nodeValue;
    if(exact.has(v.trim())){const lead=v.match(/^\s*/)?.[0]||'',tail=v.match(/\s*$/)?.[0]||'';node.nodeValue=lead+exact.get(v.trim())+tail;return}
    phrases.forEach(([r,to])=>{v=v.replace(r,to)});node.nodeValue=v;
  }
  function applyBranding(scope=document){
    try{
      if(document.title){phrases.forEach(([r,to])=>document.title=document.title.replace(r,to));if(!document.title.includes(app.shortName||''))document.title=`${document.title} • ${app.shortName||app.name}`}
      const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:n=>/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(n.parentElement?.tagName||'')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let n;while(n=walker.nextNode())replaceTextNode(n);
      scope.querySelectorAll?.('img').forEach(img=>{const src=img.getAttribute('src')||'';if(/(?:logofi|logo-pesantren)/i.test(src)&&brand.logo){img.src=window.CahayaConfig.asset(brand.logo);img.alt=brand.logoAlt||app.institutionName||'Logo'}});
      let icon=document.querySelector('link[rel~="icon"]');if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}if(brand.favicon)icon.href=window.CahayaConfig.asset(brand.favicon);
      document.querySelectorAll('[data-cahaya-app-name]').forEach(el=>el.textContent=app.name||'CAHAYA App');
      document.querySelectorAll('[data-cahaya-institution]').forEach(el=>el.textContent=app.institutionName||'');
      document.querySelectorAll('[data-cahaya-tagline]').forEach(el=>el.textContent=app.tagline||'');
    }catch(e){console.warn('Branding runtime:',e)}
  }
  const menuModules={
    academic:['menu-absen-guru','menu-absen-kbm','menu-guru-menulis','menu-prauas','menu-input-soal-uas','menu-nilai','menu-raport','menu-halqah','menu-monitoring-absen-guru'],
    tahfiz:['menu-tahfiz','menu-laporan-murojaah','menu-buku-tahfiz'],
    nurturing:['menu-absen-asrama','menu-disiplin','menu-mentoring','menu-gamifikasi','menu-jadwal-piket','menu-jurnal-piket','menu-usrah'],
    counseling:['menu-antrean-kasus','menu-buku-kasus','menu-evaluasi-kasus'],
    health:['menu-jurnal-kesehatan','menu-pemeriksaan-kesehatan','menu-perizinan-uks','menu-stok-obat'],
    permits:['menu-perizinan-santri'],finance:['menu-pusat-keuangan'],cashier:['menu-kasir'],
    facilities:['menu-jurnal-sarpras','menu-checklist-sarpras','menu-tindak-sarpras'],
    observer:['menu-observer-pembelajaran','menu-observer-pengasuhan','menu-observer-kebersihan','menu-observer-dapur','menu-observer-uks','menu-laporan-observasi'],
    assessment:['menu-asesmen-naqib','menu-asesmen-guru','menu-asesmen-santri','menu-asesmen-sdm'],
    media:['menu-komentar','menu-media'],chat:['menu-chat'],pkl:['menu-jurnal-pkl']
  };
  function applyModules(scope=document){Object.entries(menuModules).forEach(([mod,ids])=>{if(modules[mod]===false)ids.forEach(id=>{const el=scope.getElementById?.(id)||scope.querySelector?.('#'+id);if(el)el.dataset.moduleDisabled='true'})})}
  document.addEventListener('DOMContentLoaded',()=>{applyBranding();applyModules();const ob=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1){applyBranding(node);applyModules(node)}else if(node.nodeType===3)replaceTextNode(node)})));ob.observe(document.body,{childList:true,subtree:true});setTimeout(()=>ob.disconnect(),12000)});
})();
