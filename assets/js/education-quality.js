import {getNode} from './repository.js';
import {educationQuality,qualityScope,percent} from './education-quality-model.js';
import {pageHeader,panel,metric,escapeHtml as e} from './modules/common.js';
import {localDate} from './role-experience.js';
import {icon} from './teacher/ui.js';
const sources={attendance:'academic/teaching_attendance',learning:'academic/learning_sessions',boarding:'boarding/program_attendance',leaves:'academic/teacher_leaves',cases:'boarding/cases',exams:'academic/exam_sessions',followups:'academic/exam_followups',mentoring:'boarding/mentoring',quran:'academic/quran_records',quranTargets:'academic/quran_targets',materials:'academic/material_targets',observations:'academic/teacher_observations',calendar:'parent/calendar'};
const ratio=(label,n,d,detail)=>metric(label,percent(n,d)===null?'—':percent(n,d)+'%',`${n} / ${d} · ${detail}`,'green');
const pending=why=>`<p class="role-hint">${e(why)}</p>`;
const summary=(label,s)=>ratio(label,s.present,s.total,'rekam final; termasuk terlambat');
const item=(id,title,description,keys,render)=>({id,title,description,keys,render});
export const QUALITY_GROUPS=[
 {id:'teachers',title:'Mutu Guru',description:'Kehadiran, ketepatan waktu, izin, dan karya guru',icon:'user',items:[
 item('teacher-attendance','Kehadiran Guru','Proporsi pertemuan yang dihadiri',['attendance','calendar'],q=>ratio('Kehadiran Guru',q.teacher.present,q.teacherTotal,'rekam valid + jadwal selesai tanpa presensi')+'<p>Per pertemuan mengajar. Jadwal rutin dikurangi hari nonpembelajaran pada kalender.</p>'),
 item('teacher-time','Kedisiplinan Waktu','Ketepatan waktu dari guru yang hadir',['attendance'],q=>ratio('Tepat Waktu',q.teacher.present-q.teacher.late,q.teacher.present,'dari yang hadir')),
 item('teacher-leave','Izin dan Sakit','Pertemuan dengan izin yang disetujui',['attendance','calendar','leaves'],q=>ratio('Izin / Sakit Disetujui',q.excused.length,q.teacherTotal,'pertemuan tanpa presensi yang ditautkan ke izin disetujui')),
 item('teacher-missing','Tidak Terdeteksi','Jadwal selesai tanpa presensi atau izin',['attendance','calendar','leaves'],(q,ctx)=>ratio('Tidak Terdeteksi',q.missing.length-q.excused.length,q.teacherTotal,'belum presensi dan belum ada izin disetujui')+'<p>Tidak terdeteksi tidak otomatis berarti alfa. Verifikasi kelengkapan jadwal dan kalender.</p>'+q.missing.filter(r=>!q.excused.includes(r)).map(r=>`<p>${e(ctx.master.staff?.find(s=>s.id===r.staffId)?.name||r.staffId)} · ${e(r.date)} · ${e(r.startTime)}</p>`).join('')),
 item('teacher-work','Karya / Modul','Ketersediaan modul pembelajaran',[],()=>pending('Sumber penulisan modul akan ditambahkan.'))]},
 {id:'students',title:'Mutu Santri',description:'Presensi, hasil belajar, tahfiz, dan karakter',icon:'check',items:[
 item('student-attendance','Kehadiran Santri','Pembelajaran dan program asrama',['learning','boarding'],q=>summary('Gabungan Sekolah & Asrama',q.students)+summary('Pembelajaran',q.formal)+summary('Program Naqib',q.boarding)+'<p>Gabungan berbobot jumlah rekam final; presensi awal dan yang didelegasikan ke GEMA dikecualikan.</p>'),
 item('student-time','Kedisiplinan Santri','Ketepatan waktu pada pembelajaran dan program',['learning','boarding'],q=>ratio('Gabungan Tepat Waktu',q.students.present-q.students.late,q.students.present,'dari yang hadir')+ratio('Pembelajaran',q.formal.present-q.formal.late,q.formal.present,'dari yang hadir')+ratio('Program Naqib',q.boarding.present-q.boarding.late,q.boarding.present,'dari yang hadir')),
 item('student-leave','Izin dan Sakit Santri','Keterangan pada presensi final santri',['learning','boarding'],q=>ratio('Izin / Sakit',q.studentExcused,q.students.total,'status Izin/Sakit pada presensi santri, bukan izin guru')),
 item('student-cases','Pelanggaran','Kategori pelanggaran yang telah terbukti',['cases'],q=>Object.entries(q.categories).map(([k,n])=>metric(k,n,'Kasus terbukti selain keterlambatan','orange')).join('')||'<p>Belum ada pelanggaran terbukti dalam periode ini.</p>'),
 item('student-exams','Hasil Ujian','Santri memenuhi dan belum memenuhi KKM',['exams'],q=>ratio('Memenuhi KKM',q.passed,q.examined,'santri memenuhi KKM di seluruh ujian final periode ini')+ratio('Belum Memenuhi KKM',q.examined-q.passed,q.examined,'sedikitnya satu nilai di bawah KKM')+'<p>KKM mengikuti ujian; rekam tanpa KKM memakai 75 sesuai modul nilai.</p>'),
 item('student-quran','Tahfiz Al-Qur’an','Capaian baris setoran harian',['quran','quranTargets'],q=>ratio('Target Tahfiz Harian',q.qMet,q.qDays,'hari setoran Ziyadah dengan target baris')+'<p>Memakai target saat ini. Hari tanpa setoran belum dihitung karena kalender kewajiban harian belum tersedia.</p>'),
 item('student-character','Karakter Santri','Asesmen mentoring terakhir setiap santri',['mentoring'],q=>metric('Karakter Santri',q.character===null?'—':q.character+'%',`${q.characterAnswers} jawaban skala 1–5 dibanding skor maksimum`,'cyan'))]},
 {id:'learning',title:'Mutu Pembelajaran',description:'Observasi kelas dan tindak lanjut hasil belajar',icon:'book',items:[
 item('learning-observation','Observasi Pembelajaran','Hasil rubrik observasi kelas',['observations'],q=>metric('Observasi Pembelajaran',q.observationCount,'Observasi tertaut kelas dalam sekolah','cyan')+metric('Capaian Rubrik',q.observationScore===null?'—':q.observationScore+'%','Indikator valid skala 1–4 dibanding maksimum','green')),
 item('learning-followup','Tindak Lanjut','Penanganan santri yang membutuhkan perbaikan',['exams','followups'],q=>ratio('Santri Ditindaklanjuti',q.followed,q.need,'nilai final ≤75; tindak lanjut pada ujian terkait'))]},
 {id:'care',title:'Mutu Pengasuhan',description:'Konseling, mentoring, dan observasi program',icon:'user',items:[
 item('care-counseling','Konseling','Kasus yang sudah ditangani',['cases'],q=>ratio('Kasus Ditangani',q.handled,q.cases.length,'dari kasus santri sekolah pada periode ini')),
 item('care-mentoring','Mentoring Individu','Jangkauan pembinaan dan jumlah sesi',['mentoring'],q=>ratio('Jangkauan Mentoring',q.mentored,q.scope.studentIds.size,'santri yang telah dibina')+metric('Sesi Mentoring',q.mentoringCount,'Riwayat dalam periode','cyan')+'<p>Target frekuensi wajib individu belum ditetapkan; ini bukan persentase kepatuhan target.</p>'),
 item('care-group','Mentoring Kelompok','Kesiapan data pembinaan kelompok',[],()=>pending('Form dan riwayat mentoring kelompok belum tersedia.')),
 item('care-observation','Observasi Program Asrama','Kesiapan pemetaan hasil observasi',[],()=>pending('Pemetaan peserta sekolah dan rubrik baku belum tersedia.'))]},
 {id:'curriculum',title:'Mutu Kurikulum',description:'Jadwal, kalender pembelajaran, dan dokumen',icon:'calendar',items:[
 item('curriculum-schedule','Jadwal Pelajaran','Ketersediaan jadwal per kelas',[],q=>ratio('Kelas Memiliki Jadwal',q.scheduledClasses,q.classes,'kelas sekolah; belum menilai kelengkapan jam/mapel')),
 item('curriculum-calendar','Kalender Pembelajaran','Target materi bertanggal',['materials'],q=>metric('Kalender Materi',q.materials,'Target materi dalam periode; bukan validasi kelengkapan RPP','cyan')),
 item('curriculum-documents','RPP dan Silabus','Kesiapan inventaris dokumen',[],()=>pending('Inventaris dokumen dan daftar kewajiban belum tersedia.'))]},
 {id:'facilities',title:'Mutu Sarana dan Prasarana',description:'Kesiapan standar kelayakan dan inspeksi',icon:'book',items:[item('facilities-status','Sarana dan Prasarana','Status kesiapan indikator',[],()=>pending('Menunggu indikator, standar kelayakan, dan data inspeksi per sekolah.'))]},
 {id:'management',title:'Mutu Manajemen',description:'Kesiapan standar dan target manajemen',icon:'chart',items:[item('management-status','Manajemen','Status kesiapan indikator',[],()=>pending('Menunggu standar penilaian dan target kewajiban manajemen per sekolah.'))]},
 {id:'finance',title:'Mutu Keuangan',description:'Kesiapan indikator dan kewenangan penilaian',icon:'chart',items:[item('finance-status','Keuangan','Status kesiapan indikator',[],()=>pending('Indikator dan kewenangan penilaian belum ditetapkan. Halaman ini tidak mengunduh transaksi keuangan.'))]}
];
export async function renderEducationQuality(ctx){
 const scope=qualityScope(ctx.session,ctx.master),today=localDate(),start=today.slice(0,8)+'01';
 if(!scope.units.length){ctx.root.innerHTML=pageHeader('Kontrol Mutu Pendidikan','Unit sekolah belum ditetapkan pada akun ini.');return;}
 const cache=new Map();let revision=0,group=null,selected=null;
 const teachers=(ctx.master.staff||[]).filter(s=>(ctx.master.academicSchedules||[]).some(r=>(r.staffId||r.teacherStaffId)===s.id&&(scope.classIds.has(r.classId)||(r.classIds||[]).some(id=>scope.classIds.has(id)))));
 const options=rows=>rows.map(s=>`<option value="${e(s.id)}">${e(s.name)}</option>`).join('');
 ctx.root.classList.add('leadership-dashboard');
 ctx.root.innerHTML=pageHeader('Kontrol Mutu Pendidikan','Mode hemat data • Pilih bidang, lalu indikator yang ingin dilihat.')+`<div id="qualityNavigation"></div><details class="panel" id="qualityFilters" hidden><summary><strong>Periode & filter</strong> · <span id="qualityPeriod">${start} — ${today}</span></summary><div class="filter-row wrap"><label>Dari<input name="qualityFrom" type="date" value="${start}"></label><label>Sampai<input name="qualityTo" type="date" value="${today}" max="${today}"></label><label>Putra / Putri<select name="qualityGender"><option value="">Semua</option><option value="L">Putra</option><option value="P">Putri</option></select></label><label>Guru<select name="qualityStaff"><option value="">Semua guru</option>${options(teachers)}</select></label><label>Santri<select name="qualityStudent"><option value="">Semua santri</option>${options(scope.students)}</select></label></div><p>Guru: filter indikator guru/kurikulum. Santri: filter hasil santri/pengasuhan. Seluruh data tetap dibatasi sekolah Anda.</p></details><div id="qualityContent" aria-live="polite"></div>`;
 const nav=ctx.root.querySelector('#qualityNavigation'),body=ctx.root.querySelector('#qualityContent'),filters=ctx.root.querySelector('#qualityFilters');
 const cards=(rows,kind)=>`<div class="quality-card-grid">${rows.map((r,i)=>`<button type="button" class="quality-card ${i%4>1?'gold':''}" data-quality-${kind}="${e(r.id)}"><span class="quality-card-icon" aria-hidden="true">${icon(r.icon||group?.icon||'chart')}</span><strong>${e(r.title)}</strong><small>${e(r.description)}</small><span class="quality-card-action">${kind==='group'?'Pilih indikator':'Lihat indikator'} <span aria-hidden="true">→</span></span></button>`).join('')}</div>`;
 const back=()=>{selected=null;revision++;showCards();};
 function showCards(){filters.hidden=true;nav.innerHTML=group?'<button type="button" class="btn btn-secondary" id="qualityBack">← Semua bidang mutu</button>':'';nav.querySelector('#qualityBack')?.addEventListener('click',()=>{group=null;back();});body.innerHTML=(group?`<h3>${e(group.title)}</h3>`:'')+cards(group?group.items:QUALITY_GROUPS,group?'indicator':'group');body.querySelectorAll('[data-quality-group]').forEach(b=>b.onclick=()=>{group=QUALITY_GROUPS.find(g=>g.id===b.dataset.qualityGroup);showCards();});body.querySelectorAll('[data-quality-indicator]').forEach(b=>b.onclick=()=>{selected=group.items.find(i=>i.id===b.dataset.qualityIndicator);load();});}
 async function load(force=false){
  if(!selected)return;const item=selected,token=++revision;
  filters.hidden=false;nav.innerHTML='<div class="section-actions"><button type="button" class="btn btn-secondary" id="qualityBack">← Pilih indikator</button><button type="button" class="btn btn-secondary" id="qualityReload">Perbarui data indikator</button></div>';nav.querySelector('#qualityBack').onclick=back;nav.querySelector('#qualityReload').onclick=()=>load(true);
  const value=n=>ctx.root.querySelector(`[name=${n}]`).value,from=value('qualityFrom'),to=value('qualityTo');ctx.root.querySelector('#qualityPeriod').textContent=from+' — '+to;
  try{
   if(!from||!to||from>to||to>today||Date.parse(to)-Date.parse(from)>366*86400000)throw Error('Pilih periode valid hingga hari ini, maksimal satu tahun.');
   body.innerHTML=`<div class="loading-card">Memuat ${e(item.title)}…</div>`;
   const data={yearId:ctx.yearId};
   await Promise.all(item.keys.map(async key=>{
    if(force)cache.delete(key);
    if(!cache.has(key)){const request=getNode(sources[key]+(key==='calendar'?'':'/'+ctx.yearId));cache.set(key,request);request.catch(()=>{if(cache.get(key)===request)cache.delete(key);});}
    data[key]=await cache.get(key);
   }));
   if(token!==revision)return;
   const q=educationQuality({session:ctx.session,master:ctx.master,data,from,to,gender:value('qualityGender'),staffId:value('qualityStaff'),studentId:value('qualityStudent')});
   body.innerHTML=panel(item.title,`<div class="portal-metrics">${item.render(q,ctx)}</div>`)+`<p class="role-hint">${item.keys.length?'Sumber yang telah dimuat digunakan kembali selama halaman ini terbuka. Klik Perbarui untuk mengambil data terbaru.':'Indikator ini tidak memerlukan unduhan data tambahan.'}</p>`;
  }catch(err){if(token!==revision)return;body.innerHTML=`<div class="empty-state"><p>${e(err.message)}</p><button type="button" class="btn btn-secondary" id="qualityRetry">Coba lagi</button></div>`;body.querySelector('#qualityRetry').onclick=()=>load();}
 }
 ctx.root.querySelectorAll('input,select').forEach(el=>el.onchange=()=>load());showCards();
}
