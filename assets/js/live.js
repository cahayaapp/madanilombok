import {campusClock,prayerTimes,nextPrayer,followingDate,validatedPrayers} from './live-prayer.js';
import {LIVE_FEED_URL,validateLiveSnapshot,bucket} from './live-model.js';
const $=id=>document.getElementById(id);
const quotes=[
 ['Langkah kecil hari ini,','cahaya besar esok hari.','Teruslah belajar. Kebaikan yang dilakukan dengan tekun akan menemukan jalannya.'],
 ['Hafalan tumbuh dari','hati yang istiqamah.','Satu ayat yang diulang dengan sabar adalah satu langkah menuju kedekatan dengan Al-Qur’an.'],
 ['Ilmu membuka jalan.','Adab menerangi langkah.','Belajar menjadi lebih baik, bukan hanya menjadi lebih tahu.'],
 ['Tak harus sempurna.','Teruslah bertumbuh.','Sempurnakan niat, kuatkan ikhtiar, dan syukuri setiap kemajuan.'],
 ['Kebaikan sederhana,','pengaruh luar biasa.','Senyum, salam, dan pertolongan kecil dapat menjadi awal perubahan besar.'],
 ['Setiap pertemuan','menyimpan pelajaran.','Hadirkan perhatian, dengarkan dengan hati, dan pulanglah membawa ilmu yang bermanfaat.'],
 ['Jangan lelah','menjadi lebih baik.','Hari ini adalah kesempatan baru untuk memperbaiki langkah dan menebar manfaat.'],
 ['Bersama Al-Qur’an,','hati menemukan arah.','Luangkan waktu untuk membaca, mengulang, memahami, dan mengamalkannya.']
];
const scenes=[{name:'Inspirasi',eyebrow:'SEJENAK UNTUK BERTUMBUH',duration:22000},{name:'Setoran Al-Qur’an',eyebrow:'AL-QUR’AN · SETORAN HARI INI',duration:36000},{name:'Kehadiran guru',eyebrow:'DEDIKASI · GURU & PEMBINA HARI INI',duration:36000},{name:'Kehadiran santri',eyebrow:'PERHATIAN · PRESENSI SANTRI TERKINI',duration:42000}];
const params=new URLSearchParams(location.search),demo=params.get('demo')==='1';
let snapshot=null,scene=Math.max(0,Math.min(3,Number(params.get('scene'))||0)),started=performance.now(),paused=false,pausedAt=0,transitioning=false,lastPage=-1,quoteIndex=0,lastDate='',lastPrayerMinute=-1,refreshing=false,controlsTimer,wakeLock;
const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
const count=(section,status)=>snapshot?bucket(snapshot,section,status).length:null;
const number=v=>v===null?'—':String(v);
function inspiration(){
 const [first,second,subtitle]=quotes[quoteIndex%quotes.length],layout=document.createElement('div');layout.className='quote-layout';
 const main=document.createElement('div');main.className='quote-main';main.append(text('span','“','quote-mark'));
 const heading=text('h1',first+' ','quote-text');heading.append(text('em',second));main.append(heading,text('p',subtitle,'quote-subtitle'),text('div','PENGINGAT MADANI','quote-attribution'));
 const card=document.createElement('aside');card.className='inspiration-card';card.append(text('span','✦','card-star'),text('small','SANTRI SUDAH\nSETORAN HARI INI'),text('strong',number(count('quran','submitted'))),text('small',snapshot?'dari '+snapshot.quran.total+' santri halaqah':'Menunggu data hari ini'),text('span','Satu ayat,\nsejuta kebaikan.'));
 layout.append(main,card);return layout;
}
function statusCard(section,status,title,color,symbol,page){
 const rows=bucket(snapshot,section,status),size=4,pages=Math.max(1,Math.ceil(rows.length/size)),index=page%pages;
 const card=document.createElement('article');card.className='status-card '+color;
 const head=document.createElement('div');head.className='status-head';const label=text('div','','status-label');label.append(text('span',symbol,'status-symbol'),text('span',title));head.append(label,text('strong',snapshot?String(rows.length):'—','status-count'));card.append(head);
 const list=document.createElement('div');list.className='people-list';
 for(const [i,r]of rows.slice(index*size,index*size+size).entries()){
  const item=document.createElement('div');item.className='person-row';item.style.setProperty('--i',i);const avatar=text('span',r.name.split(/\s+/).slice(0,2).map(s=>s[0]).join(''),'person-avatar');
  const name=text('div',r.name,'person-name');name.title=r.name;if(r.label)name.append(text('small',r.label));item.append(avatar,name);list.append(item);
 }
 if(!rows.length)list.append(text('p',snapshot?'Belum ada nama pada status ini.':'Menunggu sinkronisasi data hari ini.','empty-list'));
 const foot=document.createElement('div');foot.className='card-pagination';foot.append(text('span',rows.length?`${index*size+1}–${Math.min((index+1)*size,rows.length)} dari ${rows.length}`:'—'),text('b',pages>1?`${index+1} / ${pages}`:''));card.append(list,foot);return card;
}
function dataScene(page){
 const fragment=document.createDocumentFragment(),head=document.createElement('div');head.className='data-heading';const copy=document.createElement('div');
 const configs={1:['Tumbuh bersama','Al-Qur’an.','Santri halaqah aktif · Nama dihitung satu kali per hari','quran'],2:['Hadir untuk','menuntun.','Guru dan pembina yang memiliki jadwal hari ini','teachers'],3:['Setiap santri,','satu perhatian.','Status final terakhir yang tercatat hari ini · KBM & asrama','students']};
 const [title,accent,sub,section]=configs[scene],h=text('h1',title+' ');h.append(text('em',accent));copy.append(h,text('p',sub));
 const total=text('div','ORANG','total-badge');total.prepend(text('b',snapshot?String(snapshot[section].total):'—'));head.append(copy,total);fragment.append(head);
 const cards=document.createElement('div');cards.className='data-columns';
 const definitions=scene===1?[['submitted','Sudah Setoran','positive','✓'],['pending','Belum Setoran','gold','◷']]:scene===2?[['present','Hadir Mengajar','positive','✓'],['excused','Izin / Sakit','soft','↗'],['absent','Tidak Hadir','rose','–'],['missing','Belum Absen','gold','◷']]:[['present','Hadir','positive','✓'],['excused','Izin','soft','↗'],['sick','Sakit','gold','✧'],['absent','Alfa','rose','–']];
 cards.style.setProperty('--columns',definitions.length);cards.dataset.columns=definitions.length;for(const [id,label,color,symbol]of definitions)cards.append(statusCard(section,id,label,color,symbol,page));fragment.append(cards);
 const note=document.createElement('div');note.className='pending-note';
 const left=scene===2?`${number(count('teachers','upcoming'))} guru belum memasuki waktu jadwalnya.`:scene===3?`${number(count('students','pending'))} santri belum memiliki presensi final hari ini.`:'Setoran Tahsin, Tahfiz, dan Muroja’ah yang sudah tersimpan.';
 note.append(text('span',left),text('span','Daftar berganti otomatis'));fragment.append(note);return fragment;
}
function renderScene(){
 const page=paused&&lastPage>=0?lastPage:Math.floor(Date.now()/7000);lastPage=page;$('sceneEyebrow').textContent=scenes[scene].eyebrow;$('sceneNumber').textContent=String(scene+1).padStart(2,'0');
 $('sceneContent').replaceChildren(scene===0?inspiration():dataScene(page));
 for(const b of $('sceneNavigation').children)b.classList.toggle('active',Number(b.dataset.scene)===scene);
}
async function changeScene(index){
 if(transitioning)return;transitioning=true;const content=$('sceneContent');content.classList.remove('entering');content.classList.add('exiting');
 await new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:450));
 const target=(index+scenes.length)%scenes.length;if(target===0)quoteIndex++;scene=target;started=performance.now();if(paused)pausedAt=started;renderScene();content.classList.remove('exiting');content.classList.add('entering');transitioning=false;
}
for(const [index,s]of scenes.entries()){
 const b=document.createElement('button');b.dataset.scene=index;b.title=s.name;b.setAttribute('aria-label',s.name);b.onclick=()=>changeScene(index);$('sceneNavigation').append(b);
}
function renderPrayer(now){
 const c=campusClock(now),prayers=prayerTimes(c.date),next=nextPrayer(now);
 $('nextPrayer').textContent=next.label;$('nextTime').textContent=`${next.tomorrow?'Besok · ':''}${next.time} WITA`;
 const n=next.remaining;$('countdown').textContent=[Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(' : ');
 if(c.minute!==lastPrayerMinute||c.date!==lastDate){lastPrayerMinute=c.minute;$('prayerTimes').replaceChildren(...prayers.map(p=>{const slot=document.createElement('div');slot.className='prayer-slot'+(p.id===next.id&&!next.tomorrow?' active':'');slot.append(text('b',p.label),text('time',p.time));return slot;}));}
}
function syncLabel(now){
 const el=$('syncState');el.classList.remove('connected','stale');
 if(demo){el.classList.add('stale');el.replaceChildren(text('span',''),document.createTextNode('Pratinjau · bukan data operasional'));return;}
 if(!snapshot){el.replaceChildren(text('span',''),document.createTextNode(navigator.onLine?'Menunggu siaran admin':'Koneksi terputus'));return;}
 const age=Math.max(0,Math.floor((now-snapshot.updatedAt)/1000));el.classList.add(age>180?'stale':'connected');
 el.replaceChildren(text('span',''),document.createTextNode(age>180?`Sinkronisasi tertunda · ${Math.floor(age/60)} menit`:`Data hari ini · ${age<60?'baru diperbarui':Math.floor(age/60)+' menit lalu'}`));
}
function tick(){
 const now=new Date(),c=campusClock(now);$('clock').textContent=c.time;$('seconds').textContent=c.seconds;renderPrayer(now);
 if(c.date!==lastDate){
  lastDate=c.date;$('dateLine').textContent=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Makassar',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
  try{$('hijriLine').textContent=new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura',{timeZone:'Asia/Makassar',day:'numeric',month:'long',year:'numeric'}).format(now);}catch{$('hijriLine').textContent='Lombok Timur · Indonesia';}
  if(snapshot?.date!==c.date){snapshot=null;renderScene();if(demo)loadDemo();else refresh();}
 }
 if(snapshot?.expiresAt<=+now){snapshot=null;renderScene();}syncLabel(+now);
 const elapsed=(paused?pausedAt:performance.now())-started,progress=Math.min(100,elapsed/scenes[scene].duration*100);document.documentElement.style.setProperty('--scene-progress',progress+'%');
 if(!paused&&elapsed>=scenes[scene].duration)changeScene(scene+1);
 const page=Math.floor(Date.now()/7000);if(!paused&&scene>0&&page!==lastPage&&!transitioning)renderScene();
}
async function refresh(){
 if(refreshing||demo)return;refreshing=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch(LIVE_FEED_URL,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!response.ok){if([401,403].includes(response.status)){snapshot=null;renderScene();}throw Error('Siaran belum tersedia.');}
  snapshot=validateLiveSnapshot(await response.json());renderScene();
 }catch{if(snapshot?.date!==campusClock().date||snapshot?.expiresAt<=Date.now())snapshot=null;syncLabel(Date.now());}
 finally{clearTimeout(timer);refreshing=false;}
}
function loadDemo(){
 const names=['Ahmad Farhan','Zahra Azzahra','Muhammad Naufal','Aisyah Humaira','Rizky Maulana','Fatimah Zahira','Yusuf Ramadhan','Nadia Safitri','Fikri Hidayat','Salma Khairunnisa','Ibrahim Fathur','Hana Putri'];
 const roster=Array.from({length:48},(_,i)=>({name:names[i%names.length]+(i>=12?' '+String(i+1):''),label:['XI TJKT','X DKV','8 Putra','7 Putri'][i%4]}));
 const section=(rows,statuses)=>({total:rows.length,rows:rows.map((r,i)=>({...r,status:statuses[i%statuses.length]}))});
 snapshot={version:1,enabled:true,date:campusClock().date,updatedAt:Date.now(),expiresAt:Date.parse(followingDate(campusClock().date)+'T00:00:00+08:00'),quran:section(roster,['submitted','submitted','submitted','pending']),teachers:section(names.slice(0,9).map((name,i)=>({name:['Ustadz ','Ustadzah '][i%2]+name,label:['SMK · Guru Mapel','SMP · Guru Mapel','Pembina Tahfiz'][i%3]})),['present','present','excused','missing']),students:section(roster,['present','present','present','present','excused','sick','absent','pending'])};renderScene();
}
function showControls(){clearTimeout(controlsTimer);$('tvControls').classList.add('shown');controlsTimer=setTimeout(()=>$('tvControls').classList.remove('shown'),3500);}
function togglePause(){paused=!paused;if(paused)pausedAt=performance.now();else started+=performance.now()-pausedAt;document.body.classList.toggle('paused',paused);$('pauseScene').textContent=paused?'▶':'Ⅱ';$('pauseScene').setAttribute('aria-label',paused?'Lanjutkan pergantian tampilan':'Jeda pergantian tampilan');showControls();}
async function fullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();if('wakeLock'in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request('screen');}catch{showControls();}}
document.addEventListener('pointermove',showControls,{passive:true});document.addEventListener('pointerdown',showControls,{passive:true});
$('pauseScene').onclick=togglePause;$('nextScene').onclick=()=>changeScene(scene+1);$('previousScene').onclick=()=>changeScene(scene-1);$('fullscreen').onclick=fullscreen;
document.addEventListener('keydown',ev=>{if(ev.target.closest('button,a,input,textarea'))return;if(ev.code==='Space'){ev.preventDefault();togglePause();}else if(ev.key==='ArrowRight')changeScene(scene+1);else if(ev.key==='ArrowLeft')changeScene(scene-1);else if(ev.key.toLowerCase()==='f')fullscreen();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();refresh();}});window.addEventListener('online',refresh);window.addEventListener('resize',renderScene);
if(demo){$('demoBanner').hidden=false;loadDemo();}renderScene();$('sceneContent').classList.add('entering');tick();if(!demo)refresh();setInterval(tick,1000);setInterval(refresh,20000);
