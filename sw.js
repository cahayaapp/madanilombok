const CACHE='madani-v112-admin-design';
const CORE=['./assets/js/mobile-layout.js','./','./index.html','./app/index.html','./assets/css/app.css','./assets/css/portal.css','./assets/css/teacher.css?v=29','./assets/css/cahaya-clone.css','./assets/css/mentoring.css?v=66','./assets/css/health.css?v=39','./assets/css/management.css?v=39','./assets/css/entry.css?v=43','./assets/css/brand-theme.css?v=62','./assets/js/entry.js?v=44','./assets/brand/logo.svg','./assets/brand/ornaments.svg','./assets/brand/home-mosque.svg','./assets/brand/home-waves.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('madani-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url),local=url.origin===self.location.origin;
 const asset=local&&(request.mode==='navigate'||/\.(?:html|js|css|svg|png|jpg|jpeg|webp|ico|woff2?|json|webmanifest)$/.test(url.pathname));
 const sdk=url.origin==='https://www.gstatic.com'&&url.pathname.startsWith('/firebasejs/');
 if(!asset&&!sdk)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);
   if(response.ok){event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));return response;}
   return await cache.match(request)||response;
  }catch(error){
   const cached=await cache.match(request);if(cached)return cached;
   throw error;
  }
 })());
});
