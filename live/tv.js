import {validateLiveSnapshot,LIVE_BUCKETS,bucket} from '../assets/js/live-model.js?v=4';
import {campusClock,prayerTimes,nextPrayer} from '../assets/js/live-prayer.js';

const $=id=>document.getElementById(id),unit=document.documentElement.dataset.unit;
if(!['putra','putri','gabungan'].includes(unit))throw Error('Pilih unit tayangan.');
const feed=`https://madanilombok-f692d-default-rtdb.firebaseio.com/madani_live/${unit}.json`;
const params=new URLSearchParams(location.search),demo=params.get('demo')==='1';
const channels=['Renungan','Salat','Setoran','Guru','Santri','Konselor'];
const quotes=[
 'Satu ayat yang dijaga hari ini menjadi bekal untuk esok.',
 'Ilmu tumbuh saat kita berani bertanya dan tekun mengulang.',
 'Ringankan langkah temanmu. Kebaikan kecil bisa menguatkan banyak hati.',
 'Saat hafalan terasa sulit, mulai lagi dari satu ayat.',
 'Jaga niat, rapikan langkah, lalu tuntaskan yang sudah dimulai.'
];
const categories={
 Setoran:['quran',{submitted:'Sudah setoran',pending:'Belum tercatat setoran'}],
 Guru:['teachers',{present:'Guru hadir',excused:'Guru izin / sakit',absent:'Guru tidak hadir',missing:'Guru belum absen',upcoming:'Guru · jadwal berikutnya'}],
 Santri:['students',{present:'Santri hadir',excused:'Santri izin',sick:'Santri sakit',absent:'Santri alfa',pending:'Santri belum tercatat presensi'}],
 Konselor:['counselor',{pemula:'Menghadap Konselor Pemula',madya:'Menghadap Konselor Madya'}]
};
const info={Setoran:'Setoran Al-Qur’an hari ini',Guru:'Presensi mengajar hari ini',Santri:'Presensi final terakhir hari ini',Konselor:'Panggilan konselor hari ini'};
const populations={Setoran:'peserta Al-Qur’an',Guru:'guru dalam rekap',Santri:'santri aktif',Konselor:'santri yang dipanggil'};
const time=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Makassar',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const calendar=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Makassar',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const percent=new Intl.NumberFormat('id-ID',{style:'percent',maximumFractionDigits:1});
const number=new Intl.NumberFormat('id-ID');
let snapshot=null,slides=[],position=0,quoteIndex=0,paused=false,currentDay='',lastClock='',prayerKey='',fetching=false,sourceDown=false,nextSlide=0;
function element(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function demoSnapshot(){
 const now=new Date(),section=(statuses,prefix)=>{const rows=statuses.flatMap((status,s)=>Array.from({length:['present','submitted','pemula'].includes(status)?16:3},(_,i)=>({name:`${prefix} Contoh ${s+1}.${i+1}`,label:'Data demonstrasi',status,...(status==='submitted'?{tahfizLines:(i+1)*3}:{})})));return {total:rows.length,rows,...(statuses.includes('submitted')?{totalTahfizLines:rows.reduce((sum,r)=>sum+(r.tahfizLines||0),0)}:{})};};
 return {version:1,enabled:true,unit,date:campusClock(now).date,updatedAt:+now,expiresAt:+now+3600000,...Object.fromEntries(Object.entries(LIVE_BUCKETS).map(([key,statuses])=>[key,section(statuses,key==='teachers'?'Guru':'Santri')]))};
}
function build(){
 const old=slides[position],pages=[{channel:'Renungan'},{channel:'Salat'}],size=innerWidth<=650?8:12;
 for(const [channel,[section,labels]]of Object.entries(categories)){
  if(!snapshot?.[section]){pages.push({channel});continue;}
  for(const [status,title]of Object.entries(labels)){
   const list=bucket(snapshot,section,status);
   for(let start=0;start<Math.max(1,list.length);start+=size)pages.push({channel,title,list,start,size,total:snapshot[section].total});
  }
 }
 slides=pages;const match=slides.findIndex(s=>s.channel===old?.channel&&s.title===old?.title&&s.start===old?.start);position=match<0?0:match;
 paint();
}
function paint(){
 const s=slides[position];if(!s)return;
 const scene=element('article','scene'),heading=text=>scene.append(element('h1','',text)),description=text=>scene.append(element('p','meta',text));
 scene.append(element('p','kicker',s.channel==='Renungan'?'Renungan hari ini':s.channel==='Salat'?'Kampus Al-Madani':info[s.channel]));
 if(s.channel==='Renungan'){
  scene.classList.add('quote');heading(quotes[quoteIndex%quotes.length]);scene.append(element('div','rule'));
 }else if(s.channel==='Salat'){
  const p=nextPrayer();heading('Menjelang '+p.label);scene.append(element('strong','big-time',p.time+' WITA'));description(p.tomorrow?'Subuh berikutnya · besok':'Waktu salat berikutnya');
 }else if(!snapshot?.[categories[s.channel][0]]){heading(s.channel==='Setoran'?'Setoran Al-Qur’an':s.channel==='Konselor'?'Panggilan konselor':'Presensi '+s.channel.toLowerCase());description(sourceDown?'Koneksi ringkasan belum tersedia. Layar akan mencoba lagi.':'Menunggu ringkasan hari ini.');}
 else{
  heading(s.title);const count=s.list.length,summary=element('p','meta'),stamp=time.format(new Date(snapshot.updatedAt));
  if(s.total)summary.append(element('strong','share',percent.format(count/s.total)),document.createTextNode(` · ${count} dari ${s.total} ${populations[s.channel]}`));else summary.textContent=`0 ${populations[s.channel]}`;
  if(s.channel==='Setoran'&&snapshot.quran.totalTahfizLines!==undefined)summary.append(document.createTextNode(` · Tahfiz hari ini: ${number.format(snapshot.quran.totalTahfizLines)} baris tercatat`));
  summary.append(document.createTextNode(` · ${sourceDown||Date.now()-snapshot.updatedAt>75*60000?'Pembaruan tertunda · data pukul ':'Data pukul '}${stamp} WITA${count>s.size?` · Halaman ${s.start/s.size+1}/${Math.ceil(count/s.size)}`:''}`));scene.append(summary);
  if(count){const grid=element('div','names');s.list.slice(s.start,s.start+s.size).forEach((r,i)=>{const label=element('div','person',r.name);label.style.setProperty('--i',i);const detail=[r.label,...(s.channel==='Setoran'&&r.tahfizLines!==undefined?[`Tahfiz ${number.format(r.tahfizLines)} baris`]:[])].filter(Boolean).join(' · ');if(detail)label.append(element('small','',detail));grid.append(label);});scene.append(grid);}
  else description('Belum ada nama pada kategori ini.');
 }
 $('stage').replaceChildren(scene);for(const button of $('channels').children){if(button.textContent===s.channel)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
 nextSlide=Date.now()+(s.list?.length?13000:9000);
}
function advance(step=1){position=(position+step+slides.length)%slides.length;if(slides[position].channel==='Renungan')quoteIndex++;paint();}
async function updateFeed(){
 if(fetching||demo)return;fetching=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(feed,{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok){if(response.status===401||response.status===403)snapshot=null;throw Error('HTTP '+response.status);}
  const data=await response.json();if(data?.unit!==unit)throw Error('Ringkasan unit belum tersedia.');snapshot=validateLiveSnapshot(data);sourceDown=false;
 }catch{sourceDown=true;}
 finally{clearTimeout(timer);fetching=false;if(snapshot&&snapshot.date!==campusClock().date)snapshot=null;build();}
}
function tick(){
 const now=new Date(),c=campusClock(now);
 if(c.date!==currentDay){currentDay=c.date;snapshot=demo?demoSnapshot():null;$('date').textContent=calendar.format(now);prayerKey='';build();updateFeed();}
 if(c.time!==lastClock){lastClock=c.time;$('clock').textContent=c.time;}
 const p=nextPrayer(now),signature=c.date+p.id+p.tomorrow;
 if(prayerKey!==signature){prayerKey=signature;$('prayers').replaceChildren(...prayerTimes(c.date).map(t=>{const item=element('div','prayer'+(p.id===t.id&&!p.tomorrow?' active':''));item.append(element('small','',t.label),element('strong','',t.time));return item;}));if(slides[position]?.channel==='Salat')paint();}
 if(snapshot&&snapshot.expiresAt<=+now){snapshot=null;build();}
 if(!paused&&Date.now()>=nextSlide)advance();
}
function togglePause(){paused=!paused;document.body.classList.toggle('paused',paused);const b=$('pause');b.textContent=paused?'▶':'Ⅱ';b.title=paused?'Lanjutkan tayangan':'Jeda tayangan';b.setAttribute('aria-label',b.title);nextSlide=Date.now()+10000;}
for(const channel of channels){const b=element('button','',channel);b.onclick=()=>{position=slides.findIndex(s=>s.channel===channel);paint();};$('channels').append(b);}
$('next').onclick=()=>advance();$('pause').onclick=togglePause;$('full').hidden=!document.fullscreenEnabled;
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await document.documentElement.requestFullscreen();await navigator.wakeLock?.request('screen');}}catch{}};
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')advance();if(e.key==='ArrowLeft')advance(-1);if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();togglePause();}});
window.matchMedia('(max-width:650px)').addEventListener('change',build);$('demoBanner').hidden=!demo;
tick();setInterval(tick,1000);setInterval(updateFeed,300000);
