const key='madani.location.ready.v1';
export function createLocationOnboarding({nav,storage,show,hide,now=Date.now}){
 let busy=false,permission,lastCheck=0;
 const remembered=()=>{try{return storage.getItem(key)==='yes';}catch{return false;}};
 const remember=value=>{try{if(value)storage.setItem(key,'yes');else storage.removeItem(key);}catch{}};
 const fail=error=>{if(error?.code===1)remember(false);show(error?.code===1?'denied':error?.code===2?'unavailable':'timeout');};
 const success=()=>{remember(true);hide();};
 async function request(){
  if(busy)return;busy=true;lastCheck=now();
  try{await new Promise((resolve,reject)=>{if(!nav.geolocation)return reject({code:2});nav.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:0,timeout:20000});});success();}
  catch(error){fail(error);}finally{busy=false;}
 }
 async function check(force=false){
  if(busy||(!force&&lastCheck&&now()-lastCheck<60000))return;
  lastCheck=now();
  try{const next=await nav.permissions?.query({name:'geolocation'});if(next&&permission!==next){if(permission)permission.onchange=null;permission=next;permission.onchange=()=>{void check(true);};}}catch{/* Safari may not expose Permissions API. */}
  if(permission?.state==='denied'){remember(false);show('denied');return;}
  if(permission?.state==='prompt'||(!permission&&!remembered())){show('first');return;}
  await request();
 }
 return {check,request,fail,success};
}
export function mountLocationOnboarding({win=window,doc=document,nav=navigator}={}){
 if(doc.getElementById('madaniLocationDialog')||win.location.protocol==='file:')return;
 let dialog,controller;
 const copy={first:['Aktifkan lokasi perangkat','MadaniApp membutuhkan izin lokasi untuk memverifikasi posisi saat presensi. Aktifkan GPS/lokasi perangkat, lalu pilih Izinkan pada permintaan browser.'],denied:['Izinkan akses lokasi','Izin lokasi belum diberikan atau telah dicabut. Buka pengaturan situs/browser → Lokasi → Izinkan. Pastikan izin Lokasi untuk browser/MadaniApp dan lokasi perangkat juga aktif.'],unavailable:['Lokasi belum tersedia','Pastikan GPS/lokasi perangkat aktif. Nyalakan lokasi akurat dan Wi-Fi atau data seluler, lalu coba kembali.'],timeout:['Lokasi belum terbaca','Pencarian lokasi belum berhasil. Periksa GPS/lokasi perangkat dan koneksi, lalu coba kembali.']};
 function hide(){if(dialog?.open)dialog.close();}
 function show(reason){
  if(!dialog){dialog=doc.createElement('dialog');dialog.id='madaniLocationDialog';dialog.className='madani-location-dialog';dialog.setAttribute('aria-labelledby','madaniLocationTitle');dialog.setAttribute('aria-describedby','madaniLocationCopy');dialog.innerHTML='<div class="location-symbol" aria-hidden="true">⌖</div><h2 id="madaniLocationTitle"></h2><p id="madaniLocationCopy"></p><p class="location-note">Izin tersimpan di browser ini. Lokasi tetap diperiksa kembali saat presensi.</p><p role="status" class="location-status"></p><div class="location-actions"><button type="button" data-location-enable>Aktifkan & Izinkan Lokasi</button><button type="button" data-location-later>Nanti</button></div>';doc.body.append(dialog);dialog.querySelector('[data-location-later]').onclick=hide;dialog.querySelector('[data-location-enable]').onclick=async()=>{const button=dialog.querySelector('[data-location-enable]'),status=dialog.querySelector('[role=status]');button.disabled=true;status.textContent='Memeriksa lokasi…';try{if(win.isSecureContext===false){status.textContent='Buka MadaniApp melalui HTTPS untuk mengizinkan lokasi.';return;}await controller.request();status.textContent='';}finally{button.disabled=false;}};}
  const [title,text]=copy[reason]||copy.first;dialog.querySelector('h2').textContent=title;dialog.querySelector('#madaniLocationCopy').textContent=text;
  if(!dialog.open)dialog.showModal();
 }
 let storage;try{storage=win.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}
 controller=createLocationOnboarding({nav,storage,show,hide});
 doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')void controller.check();});
 win.addEventListener('pageshow',()=>void controller.check());
 win.addEventListener('madani-location-failed',e=>controller.fail(e.detail));
 win.addEventListener('madani-location-ready',()=>controller.success());
 void controller.check(true);
 return controller;
}
