import {escapeHtml as e} from './utils.js';
import {icon} from './teacher/ui.js';
import {ADMIN_HOME_ROUTES,ADMIN_WORKSPACES} from './admin-workspaces.js';
const active=r=>!r.mergedInto&&(!r.status||r.status==='active');
const colors=['#1677b8','#164e80','#f4b442','#ffe5a0','#e9951c','#8ec5eb'];
export function adminHomeData(master={},yearId='',now=new Date()){
 const students=(master.students||[]).filter(active),classes=(master.classes||[]).filter(active),staff=(master.staff||[]).filter(active);
 const classRows=classes.map(c=>({...c,L:0,P:0,other:0}));
 const dorms=new Map();let unplaced=0;
 for(const s of students){
  const assignment=master.classAssignments?.[s.id];
  const c=assignment?.status==='inactive'?null:classRows.find(c=>c.id===assignment?.classId);
  if(c)c[s.gender==='L'?'L':s.gender==='P'?'P':'other']++;else unplaced++;
  const placement=master.roomAssignments?.[s.id];
  const room=placement?.status==='inactive'?null:(master.rooms||[]).find(r=>r.id===placement?.roomId);
  const dorm=(master.dormitories||[]).find(d=>d.id===room?.dormitoryId);
  const key=dorm?.id||'unassigned',label=dorm?.name||(s.boardingStatus==='boarding'?'Belum ditempatkan':'Nonasrama / belum ditempatkan');
  // Use a distinct bucket for nonboarding students, retaining every active student.
  const bucket=key==='unassigned'?label:key;
  if(!dorms.has(bucket))dorms.set(bucket,{name:label,count:0});dorms.get(bucket).count++;
 }
 const day=new Intl.DateTimeFormat('id-ID',{weekday:'long',timeZone:'Asia/Makassar'}).format(now).replace('Minggu','Ahad');
 const today=(master.dailySchedules||[]).filter(r=>active(r)&&(!r.academicYearId||r.academicYearId===yearId)&&(!r.day||['Setiap Hari','Harian','Setiap hari','daily','all',day,day==='Ahad'?'Minggu':day].includes(r.day))).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));
 const updates=[['students','Santri','admin-students'],['staff','SDM','admin-staff'],['academicSchedules','Jadwal pelajaran','admin-lessons'],['dailySchedules','Program asrama','admin-programs']].flatMap(([key,label,route])=>(master[key]||[]).filter(r=>Number.isFinite(Number(r.updatedAt))&&Number(r.updatedAt)>0).map(r=>({label,name:r.name||r.title||label,time:Number(r.updatedAt),route}))).sort((a,b)=>b.time-a.time).slice(0,5);
 return {students,staff,classRows,unplaced,dorms:[...dorms.values()],today,updates,rooms:(master.rooms||[]).filter(active),groups:(master.groups||[]).filter(active)};
}
export function upgradeAdminHome(ctx,items){
 const host=ctx.root.querySelector('.premium-home');if(!host)return;
 host.classList.add('admin-overview');
 const allMenus=host.querySelector('[data-all-menus]');
 if(allMenus)allMenus.remove();
 host.querySelectorAll('.premium-section').forEach(el=>el.remove());
 const m=ctx.master||{},d=adminHomeData(m,ctx.yearId),allowed=new Set(items.map(i=>i.id));
 const link=(route,label='Lihat detail →')=>allowed.has(route)?`<button type="button" data-home-route="${route}">${e(label)}</button>`:'';
 const card=(title,sub,route,body)=>`<section class="ao-card"><header><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${link(route)}</header>${body}</section>`;
 const metrics=[['Total Santri',d.students.length,'user','admin-students'],['Kelas Putra',d.classRows.filter(c=>c.L>0||c.gender==='L'||c.genderScope==='L').length,'graduate','admin-school'],['Kelas Putri',d.classRows.filter(c=>c.P>0||c.gender==='P'||c.genderScope==='P').length,'graduate','admin-school'],['Halaqah Aktif',d.groups.length,'book','admin-boarding'],['Kamar Aktif',d.rooms.length,'home','admin-boarding']];
 const max=Math.max(1,...d.classRows.map(c=>Math.max(c.L,c.P,c.other)));
 const bars=`<div class="ao-bars">${d.classRows.map(c=>`<div class="ao-bar-group"><div class="ao-bar-pair">${[['L','Putra'],['P','Putri'],['other','Belum diisi']].filter(([k])=>k!=='other'||c.other).map(([k,label])=>`<div class="ao-bar-col"><b>${c[k]}</b><span class="ao-bar ${k}" style="height:${Math.round(c[k]/max*112)}px" role="img" aria-label="${e(c.name)}: ${c[k]} ${label}"></span></div>`).join('')}</div><span>${e(c.name||c.id)}</span></div>`).join('')||'<p class="ao-empty">Belum ada kelas aktif.</p>'}</div><p class="ao-legend"><i></i> Putra <i></i> Putri</p><p class="ao-note">${d.unplaced} santri belum ditempatkan di kelas. Kelas campuran masuk kedua hitungan.</p>`;
 let accumulated=0;const stops=d.dorms.map((row,i)=>{const start=accumulated;accumulated+=row.count/Math.max(1,d.students.length)*100;return `${colors[i%colors.length]} ${start}% ${accumulated}%`;});
 const donut=`<div class="ao-composition"><div class="ao-donut" style="background:${stops.length?`conic-gradient(${stops.join(',')})`:'#e9efeb'}" role="img" aria-label="Komposisi ${d.students.length} santri berdasarkan penempatan asrama"><div><b>${d.students.length}</b><span>Santri</span></div></div><ul>${d.dorms.map((r,i)=>`<li><i style="background:${colors[i%colors.length]}"></i><span>${e(r.name)}</span><b>${r.count}</b></li>`).join('')||'<li>Belum ada santri aktif.</li>'}</ul></div>`;
 const roleCount=role=>d.staff.filter(s=>(Array.isArray(s.roles)?s.roles:[]).includes(role)).length;
 const personnel=`<div class="ao-staff-total"><span>${icon('user')}</span><div><b>${d.staff.length}</b><small>Personil aktif</small></div></div><ul class="ao-staff-list">${[['Guru Mapel','guru_mapel'],['Naqib / Naqibah','naqib'],['Konselor','konselor'],['Guru Wali','guru_wali']].map(([name,role])=>`<li><span>${e(name)}</span><b>${roleCount(role)}</b></li>`).join('')}</ul><p class="ao-note">Satu personil dapat memiliki beberapa peran.</p>`;
 const schedule=`<ol class="ao-timeline">${d.today.slice(0,5).map(s=>`<li><time>${e(s.startTime||'—')}</time><span>${e((m.programs||[]).find(p=>p.id===s.programId)?.name||s.title||s.name||'Program asrama')}</span></li>`).join('')||'<li class="ao-empty">Belum ada program terjadwal hari ini.</li>'}</ol><p class="ao-note">WITA · ${d.today.length} program hari ini</p>`;
 const updates=`<ul class="ao-updates">${d.updates.map(r=>`<li>${icon('check')}<div>${link(r.route,r.name)}<small>${e(r.label)} · ${e(new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Makassar'}).format(new Date(r.time)))}</small></div></li>`).join('')||'<li class="ao-empty">Belum ada waktu pembaruan yang tercatat.</li>'}</ul><p class="ao-note">Pembaruan master data · WITA</p>`;
 const quick=`<div class="ao-quick">${Object.entries(ADMIN_HOME_ROUTES).filter(([id])=>allowed.has(id)).map(([id,{workspace}],i)=>`<button type="button" class="ao-quick-tile" data-home-route="${id}"><span>${icon(['user','user','book','home','calendar','check','settings','user'][i])}</span><b>${e(ADMIN_WORKSPACES[workspace].title)}</b><small>${e(ADMIN_WORKSPACES[workspace].description)}</small></button>`).join('')}</div>`;
 host.insertAdjacentHTML('beforeend',`<div class="ao-intro"><h1>Beranda</h1><p>Ringkasan aktivitas dan data utama MadaniApp · ${e(ctx.year?.name||'Tahun ajaran belum diatur')}</p></div><section class="ao-metrics">${metrics.map(([label,count,symbol,route])=>`<article><div><b>${count}</b><span>${label}</span></div><span class="ao-metric-icon">${icon(symbol)}</span>${link(route,'Lihat data →')}</article>`).join('')}</section><div class="ao-grid">${card('Komposisi Santri','Berdasarkan kelas','admin-school',bars)}${card('Komposisi Santri','Berdasarkan asrama','admin-boarding',donut)}${card('Data SDM','','admin-staff',personnel)}${card('Jadwal Hari Ini','','admin-programs',schedule)}${card('Pembaruan Terbaru','','admin-students',updates)}${card('Akses Cepat','','',quick)}</div>`);
 const roleButton=host.querySelector('[data-role]');if(roleButton){roleButton.classList.add('ao-role-switch');host.querySelector('.ao-intro').append(roleButton);}
 if(allMenus){allMenus.textContent='Semua menu →';host.querySelector('.ao-quick').after(allMenus);}
 host.querySelectorAll('[data-home-route]').forEach(b=>b.onclick=()=>ctx.navigate(b.dataset.homeRoute));
}
