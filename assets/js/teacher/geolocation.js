export function locationError(error){
 globalThis.window?.dispatchEvent?.(new globalThis.window.CustomEvent("madani-location-failed",{detail:{code:error?.code}}));
 if(error?.code===1)return Error('Izin lokasi MadaniApp ditolak. Izinkan Lokasi untuk situs ini di Chrome dan izin Lokasi untuk Chrome/MadaniApp di pengaturan perangkat, lalu coba lagi.');
 if(error?.code===2)return Error('Lokasi perangkat belum dapat ditemukan. Aktifkan lokasi akurat, nyalakan Wi-Fi atau data seluler, lalu coba di area yang lebih terbuka.');
 if(error?.code===3)return Error('Pencarian lokasi terlalu lama. Pastikan lokasi akurat aktif dan koneksi tersedia, lalu tekan Absen lagi.');
 return Error('Lokasi belum dapat dibaca. Periksa izin lokasi browser dan perangkat, lalu coba lagi.');
}
export async function attendanceCoordinates({nav=globalThis.navigator,secure=globalThis.isSecureContext}={}){
 if(secure===false)throw Error('Presensi membutuhkan koneksi HTTPS. Buka https://app.almadanilombok.com lalu coba lagi.');
 if(!nav?.geolocation)throw Error('Browser ini tidak menyediakan lokasi. Buka MadaniApp di Chrome dengan izin lokasi aktif.');
 const read=options=>new Promise((resolve,reject)=>nav.geolocation.getCurrentPosition(p=>{globalThis.window?.dispatchEvent?.(new globalThis.window.CustomEvent("madani-location-ready"));resolve(p.coords);},reject,options));
 try{return await read({enableHighAccuracy:true,timeout:25000,maximumAge:0});}
 catch(error){
  // Network location can work on tablets without a GPS fix. The same zone validation still applies.
  if(error?.code!==2&&error?.code!==3)throw locationError(error);
  try{return await read({enableHighAccuracy:false,timeout:20000,maximumAge:0});}catch(retry){throw locationError(retry);}
 }
}
