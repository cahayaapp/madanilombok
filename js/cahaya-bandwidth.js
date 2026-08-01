(function(global){
  'use strict';
  const VERSION='2026-07-30-v1';
  const PREFIX='cahaya_bw_cache_';
  const DAY=86400000;
  const DEFAULT_TTL=5*60000;
  const MASTER_TTL=24*60*60000;
  const registry=[];
  const pathRules={
    'cahaya_app/master_usrah':{ttl:MASTER_TTL},
    'cahaya_app/master_akademik':{ttl:MASTER_TTL},
    'cahaya_app/data_santri':{ttl:MASTER_TTL},
    'cahaya_app/master_program_harian':{ttl:MASTER_TTL},
    'cahaya_app/master_ruang_kelas':{ttl:MASTER_TTL},
    'cahaya_app/jadwal_pelajaran':{ttl:6*60*60000},
    'cahaya_app/jadwal_piket_naqib':{ttl:6*60*60000},
    'kalender_pendidikan':{ttl:60*60000},
    'cahaya_app/pengaturan_media':{ttl:30*60000},
    'cahaya_app/absensi_program_harian':{dateField:'tanggal',days:45,limit:900,ttl:3*60000},
    'cahaya_app/absensi_pembelajaran':{dateField:'tanggal',days:45,limit:650,ttl:3*60000},
    'cahaya_app/setoran_tahfiz':{dateField:'tanggal',days:120,limit:900,ttl:5*60000},
    'cahaya_app/nilai_ujian_bulanan':{dateField:'tanggal_ujian',days:150,limit:1000,ttl:10*60000},
    'cahaya_app/nilai_ujian':{dateField:'tanggal',days:120,limit:1000,ttl:10*60000},
    'cahaya_app/asesmen_cahaya_santri':{dateField:'tanggalAsesmen',days:150,limit:500,ttl:10*60000},
    'cahaya_app/log_lapor_inisiatif':{dateField:'tanggal',days:60,limit:600,ttl:5*60000},
    'cahaya_app/poin_manual':{dateField:'tanggal',days:60,limit:600,ttl:5*60000},
    'cahaya_app/laporan_penindakan':{dateField:'tanggalPenindakan',days:120,limit:600,ttl:5*60000},
    'cahaya_app/pemeriksaan_kesehatan':{dateField:'tanggalPemeriksaan',days:180,limit:500,ttl:5*60000},
    'cahaya_app/perizinan_santri':{dateField:'tanggalPengajuan',days:365,limit:500,ttl:5*60000},
    'observasi_lapangan':{dateField:'tanggal',days:60,limit:250,ttl:5*60000},
    'cahaya_app/jurnal_piket_naqib':{dateField:'tanggal',days:60,limit:250,ttl:5*60000},
    'cahaya_app/jurnal_kesehatan':{dateField:'tanggal',days:60,limit:200,ttl:5*60000},
    'cahaya_app/jurnal_sarpras':{dateField:'tanggal',days:60,limit:200,ttl:5*60000},
    'cahaya_app/jurnal_sarpras_harian':{dateField:'tanggal',days:60,limit:200,ttl:5*60000},
    'cahaya_app/jurnal_keamanan_kebersihan':{dateField:'tanggal',days:60,limit:200,ttl:5*60000},
    'cahaya_app/checklist_harian_sarpras':{dateField:'tanggal',days:90,limit:250,ttl:5*60000},
    'cahaya_app/tindak_lanjut_sarpras':{dateField:'tanggalTindakan',days:180,limit:300,ttl:5*60000},
    'cahaya_app/tindak_lanjut_sdm':{dateField:'tanggal',days:180,limit:300,ttl:5*60000},
    'cahaya_app/keuangan/transaksi_kantin':{dateField:'tanggal',days:45,limit:500,ttl:2*60000},
    'cahaya_app/keuangan/pembayaran':{dateField:'tanggal',days:180,limit:500,ttl:5*60000},
    'cahaya_app/interaksi_cerita':{limit:250,ttl:60000},
    'cahaya_app/pesan_meta':{limit:300,ttl:60000}
  };
  function localDate(d=new Date()){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
  function addDays(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d)}
  function monthRange(value){if(!/^\d{4}-\d{2}$/.test(value||''))return null;const [y,m]=value.split('-').map(Number);const end=new Date(y,m,0).getDate();return{start:`${value}-01`,end:`${value}-${String(end).padStart(2,'0')}`}}
  function pageRange(){
    const start=document.getElementById('startDate')?.value||document.getElementById('dateFrom')?.value||'';
    const end=document.getElementById('endDate')?.value||document.getElementById('dateTo')?.value||'';
    if(start&&end)return{start:start<=end?start:end,end:start<=end?end:start};
    const day=document.getElementById('dateFilter')?.value||document.getElementById('tanggalFilter')?.value||'';
    if(/^\d{4}-\d{2}-\d{2}$/.test(day))return{start:day,end:day};
    const month=document.getElementById('monthFilter')?.value||document.getElementById('filterPeriode')?.value||'';
    return monthRange(month);
  }
  function optionsFor(path,overrides={}){
    const base={...(pathRules[path]||{})};
    const opts={...base,...overrides};
    if(opts.dateField&&!opts.start&&!opts.end){
      const page=overrides.usePageRange===false?null:pageRange();
      if(page){opts.start=page.start;opts.end=page.end}
      else {const end=localDate();opts.end=end;opts.start=addDays(end,-Math.max(1,(opts.days||45)-1))}
    }
    return opts;
  }
  function safeKey(s){return btoa(unescape(encodeURIComponent(s))).replace(/[^a-zA-Z0-9]/g,'').slice(0,120)}
  function cacheKey(path,opts){return PREFIX+safeKey(VERSION+'|'+path+'|'+JSON.stringify({start:opts.start,end:opts.end,limit:opts.limit,orderBy:opts.dateField||opts.orderByChild||''}))}
  function loadCache(key,ttl){try{const v=JSON.parse(sessionStorage.getItem(key)||localStorage.getItem(key)||'null');if(v&&Date.now()-v.t<(ttl||DEFAULT_TTL))return v.v}catch(e){}return undefined}
  function saveCache(key,value,ttl){try{const raw=JSON.stringify({t:Date.now(),v:value});if((ttl||0)>=60*60000)localStorage.setItem(key,raw);else sessionStorage.setItem(key,raw)}catch(e){}}
  function fakeSnapshot(value,key=null){return{key,val:()=>value,exists:()=>value!==null&&value!==undefined&&(typeof value!=='object'||Object.keys(value).length>0),forEach(cb){if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>cb(fakeSnapshot(v,k)))}}}
  function applyCompatQuery(ref,opts){let q=ref;const field=opts.orderByChild||opts.dateField;if(field){q=q.orderByChild(field);if(opts.start!==undefined)q=q.startAt(opts.start);if(opts.end!==undefined)q=q.endAt(opts.end)}else if(opts.orderByKey){q=q.orderByKey();if(opts.start!==undefined)q=q.startAt(opts.start);if(opts.end!==undefined)q=q.endAt(opts.end)}if(opts.equalTo!==undefined)q=q.equalTo(opts.equalTo);if(opts.limit)q=q.limitToLast(Number(opts.limit));return q}
  async function readCompat(database,path,overrides={}){
    const opts=optionsFor(path,overrides),ck=cacheKey(path,opts),cached=overrides.noCache?undefined:loadCache(ck,opts.ttl);
    if(cached!==undefined)return fakeSnapshot(cached);
    const snap=await applyCompatQuery(database.ref(path),opts).once('value');
    const value=snap.val();saveCache(ck,value,opts.ttl);record(path,value,'read');return snap;
  }
  function listenCompat(database,path,overrides,callback,error){
    const opts=optionsFor(path,overrides||{}),q=applyCompatQuery(database.ref(path),opts);
    const handler=s=>{record(path,s.val(),'listen');callback(s)};q.on('value',handler,error);const off=()=>q.off('value',handler);registry.push(off);return off;
  }
  function record(path,value,mode){try{const bytes=new Blob([JSON.stringify(value||{})]).size;const key='cahaya_bw_usage_'+localDate();const current=JSON.parse(localStorage.getItem(key)||'{"bytes":0,"reads":0}');current.bytes+=bytes;current.reads+=1;current.last={path,bytes,mode,time:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(current));}catch(e){}}
  function clearCaches(){Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>localStorage.removeItem(k));Object.keys(sessionStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>sessionStorage.removeItem(k))}
  function stopAll(){while(registry.length){try{registry.pop()()}catch(e){}}}
  global.CahayaBandwidth={VERSION,optionsFor,readCompat,listenCompat,fakeSnapshot,clearCaches,stopAll,localDate,addDays,monthRange,pageRange,record};
  global.addEventListener('pagehide',stopAll,{once:true});
})(window);
