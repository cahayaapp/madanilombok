import {icon} from './teacher/ui.js';
import {escapeHtml as e} from './utils.js';
import {ROLE_EXPERIENCE} from './role-experience.js';

const QUICK_DESCRIPTIONS={
 'school-mentoring':'Pantau pembinaan guru wali sepekan terakhir',
 'dorm-teacher-attendance':'Pantau kehadiran pembina dan guru pondok',
 'dorm-teacher-punctuality':'Pantau ketepatan waktu pembina dan guru',
 'dorm-quran-daily':'Pantau setoran dan hasil hafalan harian',
 'admin-data':'Kelola database dan penempatan', 'admin-accounts':'Kelola pengguna dan hak akses', 'admin-import':'Masukkan dan sinkronkan data', 'admin-validation':'Periksa kelengkapan dan relasi data',
 'school-teacher-attendance':'Pantau kehadiran guru', 'school-teacher-punctuality':'Pantau ketepatan waktu guru',
 'school-student-attendance':'Pantau kehadiran siswa', 'school-student-punctuality':'Lihat keterlambatan siswa',
 'dorm-student-attendance':'Pantau kehadiran program', 'dorm-student-punctuality':'Lihat keterlambatan santri',
 'dorm-counselor':'Pantau penanganan kasus', 'management-worship':'Catat ibadah personil',
 'management-control':'Tinjau kondisi tiap unit', 'management-escalations':'Tindak lanjuti eskalasi',
 'management-standards':'Kelola standar kerja', 'management-coaching':'Pantau pembinaan personil',
 'management-targets':'Pantau capaian target', 'management-systemic':'Tinjau masalah lintas unit',
 'work-messages':'Baca dan kirim pesan', 'work-profile':'Kelola profil dan sandi', 'work-guide':'Baca panduan penggunaan',
 'cashier':'Catat transaksi penjualan', 'finance-products':'Kelola produk dan stok', 'finance-history':'Telusuri riwayat transaksi', 'finance-dashboard':'Lihat ringkasan keuangan',
 'parent-news':'Ikuti kabar Ananda', 'parent-attendance':'Lihat kehadiran Ananda', 'parent-permission':'Ajukan izin untuk Ananda', 'parent-finance':'Lihat tagihan dan pembayaran',
 'case-inbox':'Tinjau kasus masuk', 'case-active':'Lanjutkan penanganan kasus', 'counseling':'Catat sesi konseling', 'case-escalation':'Kelola eskalasi kasus',
 'health-journal':'Lihat riwayat kesehatan', 'health-examination':'Catat pemeriksaan santri', 'health-permits':'Kelola izin kesehatan', 'health-stock':'Pantau persediaan obat',
 'naqib-programs':'Lihat kegiatan dalam piket', 'naqib-attendance':'Catat kehadiran program', 'naqib-report':'Catat pelaksanaan kegiatan', 'naqib-initiative':'Catat inisiatif santri',
 'quran-ziyadah':'Catat tambahan hafalan', 'quran-murojaah':'Catat pengulangan hafalan',
 'teacher-attendance':'Catat kehadiran mengajar', 'student-attendance':'Catat kehadiran santri',
 'mentoring':'Catat pembinaan santri', 'mentoring-history':'Tinjau riwayat pembinaan',
};

// Move existing action nodes so quick actions retain their original handlers.
export function arrangeHome(ctx,items=[]){
 const root=ctx.root;
 const combinedLabels={'school-teacher-attendance':'Kehadiran & Kedisiplinan Guru','school-student-attendance':'Kehadiran & Kedisiplinan Siswa','dorm-student-attendance':'Kehadiran & Kedisiplinan Santri','dorm-teacher-attendance':'Kehadiran & Kedisiplinan Pembina'};
 const candidates=[...root.querySelectorAll('.hub-quick-card,.role-quick-card,.me-card.primary,.mu-feature')];
 const route=b=>b.dataset.homeRoute||b.dataset.quick||b.dataset.route||b.dataset.quranRoute||b.dataset.go;
 const available=items.filter(i=>!['dashboard','parent-home'].includes(i.id)&&!i.id.endsWith('-punctuality'));
 const make=i=>{const b=document.createElement('button');b.type='button';b.dataset.homeRoute=i.id;b.innerHTML=`<b>${e(i.label)}</b>`;b.onclick=()=>ctx.navigate(i.id);return b;};
 const monitorHome=['head_formal_school','head_boys_dorm','head_girls_dorm'].includes(ctx.session.activeRole);
 const limit=monitorHome?Infinity:4;
 const quick=candidates.slice(0,limit);
 if(!quick.length)for(const id of ROLE_EXPERIENCE[ctx.session.activeRole]?.quick||[]){const item=available.find(i=>i.id===id);if(item&&quick.length<limit)quick.push(make(item));}
 if(!quick.length)quick.push(...available.slice(0,4).map(make));
 const used=new Set(quick.map(route));
 const label=b=>(b.querySelector('strong,b')?.textContent||b.textContent).trim().toLowerCase();
 const labels=new Set(quick.map(label));
 const rest=[...root.querySelectorAll('.hub-menu-card,.me-menu .me-card')].filter(b=>!used.has(route(b))&&!labels.has(label(b))); 
 for(const b of rest){used.add(route(b));labels.add(label(b));}
 for(const i of available)if(!used.has(i.id)&&!labels.has(i.label.trim().toLowerCase())){rest.push(make(i));used.add(i.id);labels.add(i.label.trim().toLowerCase());}
 const styleCard=(b,index,primary)=>{
  const title=combinedLabels[route(b)]||b.querySelector('strong,b')?.textContent.trim()||b.textContent.trim();
  const sub=combinedLabels[route(b)]?'Pantau kehadiran dan ketepatan waktu':QUICK_DESCRIPTIONS[route(b)]||b.querySelector('small')?.textContent.trim()||'Buka ruang kerja Anda';
  const symbol=b.querySelector('svg')?.outerHTML||icon(/izin|sakit/i.test(title)?'cross':/presensi|hadir/i.test(title)?'check':/jadwal/i.test(title)?'calendar':/nilai|hasil/i.test(title)?'chart':/guru|santri|personil/i.test(title)?'user':'book');
  b.classList.add(primary?'premium-quick':'premium-menu');
  b.style.setProperty('--tile-index',index%4);
  b.innerHTML=`<span class="premium-icon">${symbol}</span><b>${e(title)}</b>${primary?`<small>${e(sub)}</small><span class="premium-arrow" aria-hidden="true">→</span>`:''}`;
  return b;
 };
 quick.forEach((b,i)=>styleCard(b,i,true));rest.forEach((b,i)=>styleCard(b,i,false));
 const preserved=document.createElement('div');
 while(root.firstChild)preserved.append(root.firstChild);
 root.innerHTML='<main class="premium-home"><section class="premium-section"><div class="premium-section-head"><h2>Akses Cepat Hari Ini</h2><button type="button" data-all-menus>Lihat Semua →</button></div><div class="premium-quick-grid"></div></section><section class="premium-section premium-workspace naqib-workspace-menu"><div class="premium-section-head"><h2>Menu Lainnya</h2><button type="button" data-all-menus>Semua menu →</button></div><div class="premium-menu-grid"></div></section></main>';
 const holder=root.querySelector('.premium-home');
 if(monitorHome){holder.classList.add('premium-monitor-home');holder.querySelector('.premium-section-head h2').textContent='Pantau Operasional Harian';}
 quick.forEach(b=>holder.querySelector('.premium-quick-grid').append(b));
 const menuGrid=holder.querySelector('.premium-menu-grid');
 // Eight compact shortcuts; the complete role menu remains reachable in the dialog.
 rest.slice(0,8).forEach(b=>menuGrid.append(b));
 const openDialog=(title,content)=>{const d=document.createElement('dialog');d.className='home-role-dialog premium-home-dialog';d.innerHTML=`<header><h2>${e(title)}</h2><button type="button" data-close aria-label="Tutup">×</button></header>`;d.append(content);root.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();};
 holder.querySelectorAll('[data-all-menus]').forEach(b=>b.onclick=()=>{const list=document.createElement('div');list.className='premium-all-menus';for(const item of available)list.append(styleCard(make(item),0,false));const summary=document.createElement('button');summary.type='button';summary.textContent='Ringkasan & Informasi';summary.onclick=()=>openDialog('Ringkasan & Informasi',preserved);list.append(summary);openDialog('Semua Menu',list);});
}
