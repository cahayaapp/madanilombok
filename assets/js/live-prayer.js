// Solar coordinates and hour-angle equations: https://praytimes.org/calculation
// Local hisab, not an official city timetable; campus parameters are explicit.
export const CAMPUS_TIMEZONE='Asia/Makassar';
export const CAMPUS={latitude:-8.5854457,longitude:116.5755207,offset:8};
const rad=Math.PI/180,sin=x=>Math.sin(x*rad),cos=x=>Math.cos(x*rad);
const fix=(x,n)=>((x%n)+n)%n;
export function campusClock(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:CAMPUS_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,seconds:p.second,minute:+p.hour*60+(+p.minute),second:+p.hour*3600+(+p.minute)*60+(+p.second)};
}
export function followingDate(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export function endOfCampusDay(date){return Date.parse(followingDate(date)+'T00:00:00+08:00');}
export function prayerTimes(date,location=CAMPUS){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Tanggal salat tidak valid.');
 const jd=Date.parse(date+'T04:00:00Z')/86400000+2440587.5,d=jd-2451545;
 const g=fix(357.529+0.98560028*d,360),q=fix(280.459+0.98564736*d,360);
 const L=fix(q+1.915*sin(g)+0.020*sin(2*g),360),e=23.439-0.00000036*d;
 const ra=fix(Math.atan2(cos(e)*sin(L),cos(L))/rad/15,24),decl=Math.asin(sin(e)*sin(L))/rad;
 let eq=q/15-ra;if(eq>12)eq-=24;if(eq< -12)eq+=24;
 const noon=12+location.offset-location.longitude/15-eq;
 const hourAngle=alt=>Math.acos(Math.max(-1,Math.min(1,(sin(alt)-sin(location.latitude)*sin(decl))/(cos(location.latitude)*cos(decl)))))/rad/15;
 const asrAlt=Math.atan(1/(1+Math.tan(Math.abs(location.latitude-decl)*rad)))/rad;
 const times=[['subuh','Subuh',noon-hourAngle(-20)],['zuhur','Zuhur',noon],['asar','Asar',noon+hourAngle(asrAlt)],['magrib','Magrib',noon+hourAngle(-0.833)],['isya','Isya',noon+hourAngle(-18)]];
 return times.map(([id,label,h])=>{const minute=Math.ceil(h*60)+2;return {id,label,minute,time:`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`};});
}
export function nextPrayer(now=new Date(),override){
 const c=campusClock(now),today=override?.date===c.date?validatedPrayers(override.times):prayerTimes(c.date);
 const next=today.find(p=>p.minute*60>c.second);
 return next?{...next,remaining:next.minute*60-c.second,tomorrow:false}:{...prayerTimes(followingDate(c.date))[0],remaining:86400-c.second+prayerTimes(followingDate(c.date))[0].minute*60,tomorrow:true};
}
export function validatedPrayers(times){
 const base=prayerTimes('2026-01-01');let previous=-1;
 return base.map(p=>{const time=times?.[p.id];if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw Error('Jadwal salat belum lengkap.');const [h,m]=time.split(':').map(Number),minute=h*60+m;if(minute<=previous)throw Error('Urutan jadwal salat tidak valid.');previous=minute;return {...p,time,minute};});
}
