import {naqibProgramEnabled} from './naqib-program-policy.js';
import {ADMIN_WORKSPACES,workspaceFor,normalizeAdminRecord} from './admin-workspaces.js';
import { requireAdmin, logout } from "./auth.js";
import {
  getNode, patchNode, listNode, saveRecord, deleteRecord, getCurrentAcademicYearId, setCurrentAcademicYear,
  getClassAssignments, getRoomAssignments, getGroupAssignments,
  assignClass, unassignClass, assignRoom, unassignRoom, setGroupMembership
} from "./repository.js";
import { $, $$, escapeHtml, makeId, toast, confirmDialog, toCSV, downloadText } from "./utils.js";

let session;
let cache = {};
let currentSection = "dashboard";
let editState = null;
let placementSelection=null, placementRequest=0;

const pathMap = {
  "academic-years": "academic_years",
  units: "units",
  students: "students",
  staff: "staff",
  classes: "classes",
  dormitories: "dormitories",
  rooms: "rooms",
  groups: "groups",
  subjects: "subjects",
  programs: "programs",
  "academic-schedules": "schedules/academic",
  "attendance-locations": "settings/teacherAttendance/locations",
  "quran-placements": "academic/quran_placements",
  "quran-schedules": "schedules/daily",
  "arabic-schedules": "schedules/daily",
  "daily-schedules": "schedules/daily"
};

const dayOptions = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Ahad"];
const genderOptions = [{value:"L",label:"Putra"},{value:"P",label:"Putri"}];
const activeOptions = [{value:"active",label:"Aktif"},{value:"inactive",label:"Nonaktif"}];

const entityConfig = {
  "quran-placements": {
    title:"Program Al-Qur’an", subtitle:"Catat perpindahan dengan baris baru dan tanggal berlaku. Riwayat menentukan peserta ujian/setoran sesuai periodenya.", prefix:"QPL",
    columns:[["studentId","Santri"],["academicYearId","Tahun Ajaran"],["programQuran","Program"],["tahsinLevel","Level Tahsin"],["effectiveFrom","Berlaku Mulai"],["status","Status"]],
    fields:[
      {name:"studentId",label:"Santri",type:"relation",relation:"students",required:true},
      {name:"academicYearId",label:"Tahun Ajaran",type:"relation",relation:"academic-years",required:true},
      {name:"programQuran",label:"Program",type:"select",options:[{value:"TAHSIN",label:"Tahsin"},{value:"TAHFIZ",label:"Tahfiz"}],required:true},
      {name:"tahsinLevel",label:"Level Tahsin",type:"select",options:[1,2,3].map(n=>({value:`LEVEL_${n}`,label:`Level ${n}`}))},
      {name:"effectiveFrom",label:"Berlaku Mulai",type:"date",required:true},
      {name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  "academic-years": {
    title: "Tahun Ajaran", subtitle: "Pisahkan data berdasarkan periode agar riwayat penempatan dan jadwal tidak hilang.", prefix:"TA",
    columns: [["name","Tahun Ajaran"],["semester","Semester"],["startDate","Mulai"],["endDate","Selesai"],["status","Status"]],
    fields: [
      {name:"name",label:"Nama Tahun Ajaran",required:true,placeholder:"2026/2027"},
      {name:"semester",label:"Semester",type:"select",options:[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"}],required:true},
      {name:"startDate",label:"Tanggal Mulai",type:"date"},{name:"endDate",label:"Tanggal Selesai",type:"date"},
      {name:"status",label:"Status",type:"select",options:activeOptions,required:true,default:"active"}
    ]
  },
  units: {
    title:"Unit Pendidikan", subtitle:"Daftarkan unit TK, SD, SMP, SMK, dan unit kepesantrenan tanpa hard-code di aplikasi.", prefix:"UNIT",
    columns:[["name","Nama Unit"],["type","Jenjang"],["code","Kode"],["genderScope","Peserta"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Unit",required:true,placeholder:"SMP Islam Al-Madani"},{name:"code",label:"Kode Unit",required:true,placeholder:"SMP"},
      {name:"type",label:"Jenis/Jenjang",type:"select",options:["TK","SD","SMP","SMK","PONDOK"].map(v=>({value:v,label:v})),required:true},
      {name:"genderScope",label:"Cakupan",type:"select",options:[{value:"mixed",label:"Putra & Putri"},{value:"L",label:"Putra"},{value:"P",label:"Putri"}],default:"mixed"},
      {name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  students: {
    title:"Data Santri", subtitle:"Satu santri satu ID. Kelas, kamar, dan halaqah disimpan sebagai penempatan, bukan identitas permanen.", prefix:"STD",
    columns:[["name","Nama Santri"],["studentNo","NIS/NISN"],["gender","JK"],["unitId","Unit"],["boardingStatus","Status Asrama"],["status","Status"]],
    fields:[
      {name:"studentNo",label:"NIS / NISN",placeholder:"Nomor induk"},{name:"name",label:"Nama Lengkap",required:true},{name:"nickname",label:"Nama Panggilan"},
      {name:"gender",label:"Jenis Kelamin",type:"select",options:genderOptions,required:true},{name:"birthPlace",label:"Tempat Lahir"},{name:"birthDate",label:"Tanggal Lahir",type:"date"},
      {name:"unitId",label:"Unit Pendidikan",type:"relation",relation:"units",required:true},{name:"boardingStatus",label:"Status Kepesantrenan",type:"select",options:[{value:"boarding",label:"Asrama"},{value:"non_boarding",label:"Nonasrama"},{value:"fullday",label:"Fullday"}],required:true},
      {name:"guardianName",label:"Nama Wali"},{name:"guardianPhone",label:"No. HP Wali"},{name:"address",label:"Alamat",type:"textarea",full:true},
      {name:"status",label:"Status Santri",type:"select",options:[{value:"active",label:"Aktif"},{value:"leave",label:"Cuti"},{value:"graduated",label:"Lulus"},{value:"withdrawn",label:"Keluar"}],default:"active"}
    ]
  },
  staff: {
    title:"Data SDM", subtitle:"Satu orang dapat memiliki banyak peran tanpa membuat akun atau identitas ganda.", prefix:"SDM",
    columns:[["name","Nama"],["phone","No. HP"],["employmentStatus","Status"],["roles","Peran"],["status","Aktif"]],
    fields:[
      {name:"name",label:"Nama Lengkap",required:true},{name:"gender",label:"Jenis Kelamin",type:"select",options:genderOptions,required:true},{name:"phone",label:"No. HP"},{name:"email",label:"Email",type:"email"},
      {name:"employmentStatus",label:"Status Kepegawaian",type:"select",options:["Tetap","Kontrak","Khidmat","Part Time","Relawan"].map(v=>({value:v,label:v}))},
      {name:"roles",label:"Peran / Tugas",placeholder:"Guru, Musyrif, Pembina Tahfiz",help:"Pisahkan beberapa peran dengan koma."},
      {name:"unitIds",label:"Unit Tugas",type:"multirelation",relation:"units",help:"Boleh memilih lebih dari satu unit."},
      {name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  classes: {
    title:"Kelas & Rombel", subtitle:"Struktur kelas mengikuti Unit → Tingkat → Rombel, sehingga aman untuk TK sampai SMK.", prefix:"CLS",
    columns:[["name","Nama Rombel"],["unitId","Unit"],["grade","Tingkat"],["major","Jurusan"],["homeroomStaffId","Wali Kelas"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Rombel",required:true,placeholder:"VIII A / XI TKJ A"},{name:"unitId",label:"Unit",type:"relation",relation:"units",required:true},
      {name:"grade",label:"Tingkat",required:true,placeholder:"8 / XI / B"},{name:"major",label:"Jurusan (opsional)",placeholder:"TKJ"},{name:"homeroomStaffId",label:"Wali Kelas",type:"relation",relation:"staff"},
      {name:"capacity",label:"Kapasitas",type:"number"},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  dormitories: {
    title:"Asrama", subtitle:"Kelola gedung/asrama putra dan putri sebagai induk kamar.", prefix:"DORM",
    columns:[["name","Nama Asrama"],["gender","Putra/Putri"],["building","Gedung"],["staffId","Penanggung Jawab"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Asrama",required:true},{name:"gender",label:"Jenis",type:"select",options:genderOptions,required:true},{name:"building",label:"Gedung / Blok"},{name:"staffId",label:"Penanggung Jawab",type:"relation",relation:"staff"},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  rooms: {
    title:"Kamar", subtitle:"Kamar terhubung ke asrama sehingga penempatan santri otomatis bisa mengikuti putra/putri.", prefix:"ROOM",
    columns:[["name","Nama Kamar"],["dormitoryId","Asrama"],["building","Gedung"],["occupantType","Penghuni"],["sourceReview","Catatan Sumber"],["capacity","Kapasitas"],["staffId","Musyrif/Naqib"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Kamar",required:true},{name:"dormitoryId",label:"Asrama",type:"relation",relation:"dormitories",required:true},{name:"building",label:"Gedung"},{name:"floor",label:"Lantai / Area"},{name:"occupantType",label:"Jenis Penghuni",type:"select",options:[{value:"Santri",label:"Santri"},{value:"Staf",label:"Staf"}]},{name:"sourceReview",label:"Catatan Sumber"},{name:"capacity",label:"Kapasitas",type:"number"},{name:"staffId",label:"Musyrif / Naqib",type:"relation",relation:"staff"},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  groups: {
    title:"Kelompok / Halaqah", subtitle:"Satu struktur generik untuk Tahfiz, Tahsin, GEMA, Mentoring, Ekskul, dan kelompok khusus lain.", prefix:"GRP",
    columns:[["name","Nama Kelompok"],["type","Jenis"],["unitId","Unit"],["mentorStaffId","Pembina"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Kelompok",required:true,placeholder:"Halaqah Muammar"},{name:"type",label:"Jenis Kelompok",type:"select",options:["Tahfiz","Tahsin","GEMA","Halaqah Al-Qur'an","Bahasa Arab","Mentoring","Ekstrakurikuler","Lainnya"].map(v=>({value:v,label:v})),required:true},
      {name:"unitId",label:"Unit (opsional)",type:"relation",relation:"units"},{name:"mentorStaffId",label:"Pembina Utama",type:"relation",relation:"staff"},{name:"mentorStaffIds",label:"Seluruh Pembina",type:"multirelation",relation:"staff",help:"Gunakan ID SDM yang sama dengan akun guru. Dapat memilih lebih dari satu pembina."},{name:"capacity",label:"Kapasitas",type:"number"},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  subjects: {
    title:"Mata Pelajaran", subtitle:"Master mapel sekolah, pondok, dan Al-Qur'an dengan cakupan unit yang terkontrol.", prefix:"SUBJ",
    columns:[["name","Mata Pelajaran"],["category","Kategori"],["code","Kode"],["unitIds","Unit"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Mata Pelajaran",required:true},{name:"code",label:"Kode Mapel"},{name:"category",label:"Kategori",type:"select",options:["Sekolah","Pondok","Al-Qur'an"].map(v=>({value:v,label:v})),required:true},
      {name:"unitIds",label:"Cakupan Unit",type:"multirelation",relation:"units",help:"Kosongkan bila berlaku umum."},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  programs: {
    title:"Program 24 Jam", subtitle:"Master kegiatan santri; jadwalnya dibuat terpisah agar program dapat dipakai lintas hari dan peserta.", prefix:"PRG",
    columns:[["name","Nama Program"],["category","Kategori"],["attendanceRequired","Absensi"],["defaultScope","Peserta Default"],["status","Status"]],
    fields:[
      {name:"name",label:"Nama Program",required:true},{name:"category",label:"Kategori",type:"select",options:["Spiritual","Akademik","Fisik","Relasional","Kebersihan","Kehidupan Asrama","Lainnya"].map(v=>({value:v,label:v})),required:true},
      {name:"attendanceRequired",label:"Wajib Absensi",type:"select",options:[{value:"yes",label:"Ya"},{value:"no",label:"Tidak"}],default:"yes"},
      {name:"defaultScope",label:"Peserta Default",type:"select",options:[{value:"boarding_general",label:"Asrama Umum (non-GEMA)"},{value:"boarding_gema",label:"Asrama GEMA"},{value:"all_boarding",label:"Semua Santri Asrama"},{value:"all_students",label:"Semua Santri"},{value:"class",label:"Per Kelas"},{value:"group",label:"Per Kelompok"},{value:"unit",label:"Per Unit"}],default:"all_boarding"},
      {name:"description",label:"Keterangan",type:"textarea",full:true},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}
    ]
  },
  "attendance-locations": {
    title:"Lokasi Absensi Guru", subtitle:"Titik GPS kampus Madani dan radius absensi. Kosongkan unit bila berlaku untuk semua sekolah.", prefix:"GPS",
    columns:[["name","Lokasi"],["unitId","Unit"],["latitude","Latitude"],["longitude","Longitude"],["radiusMeter","Radius (m)"],["status","Status"]],
    fields:[{name:"name",label:"Nama Lokasi",required:true},{name:"unitId",label:"Unit Sekolah (opsional)",type:"relation",relation:"units"},
      {name:"latitude",label:"Latitude",type:"number",step:"any",min:-90,max:90,required:true},{name:"longitude",label:"Longitude",type:"number",step:"any",min:-180,max:180,required:true},
      {name:"radiusMeter",label:"Radius (meter)",type:"number",min:1,required:true,default:700},{name:"status",label:"Status",type:"select",options:activeOptions,default:"active"}]
  },
  "academic-schedules": {
    title:"Jadwal Pelajaran", subtitle:"Jadwal KBM mengambil referensi dari tahun ajaran, rombel, mata pelajaran, dan guru.", prefix:"JAD",
    columns:[["day","Hari"],["startTime","Mulai"],["endTime","Selesai"],["classId","Kelas"],["subjectId","Mapel"],["teacherStaffId","Guru"]],
    fields:[
      {name:"academicYearId",label:"Tahun Ajaran",type:"relation",relation:"academic-years",required:true},{name:"day",label:"Hari",type:"select",options:dayOptions.map(v=>({value:v,label:v})),required:true},
      {name:"startTime",label:"Jam Mulai",type:"time",required:true},{name:"endTime",label:"Jam Selesai",type:"time",required:true},{name:"classId",label:"Kelas / Rombel",type:"relation",relation:"classes",required:true},
      {name:"subjectId",label:"Mata Pelajaran",type:"relation",relation:"subjects",required:true},{name:"teacherStaffId",label:"Guru",type:"relation",relation:"staff",required:true},{name:"roomText",label:"Ruangan"}
    ]
  },
  "daily-schedules": {
    title:"Jadwal 24 Jam", subtitle:"Atur kapan program berjalan dan siapa pesertanya tanpa mengubah master program.", prefix:"DAY",
    columns:[["day","Hari"],["startTime","Mulai"],["endTime","Selesai"],["programId","Program"],["participantScope","Peserta"],["targetId","Target"]],
    fields:[
      {name:"academicYearId",label:"Tahun Ajaran",type:"relation",relation:"academic-years",required:true},{name:"day",label:"Hari",type:"select",options:[{value:"Setiap Hari",label:"Setiap Hari"},...dayOptions.map(v=>({value:v,label:v}))],required:true},
      {name:"startTime",label:"Jam Mulai",type:"time",required:true},{name:"endTime",label:"Jam Selesai",type:"time",required:true},{name:"programId",label:"Program",type:"relation",relation:"programs",required:true},
      {name:"participantScope",label:"Cakupan Peserta",type:"select",options:[{value:"boarding_general",label:"Asrama Umum (non-GEMA)"},{value:"boarding_gema",label:"Asrama GEMA"},{value:"all_boarding",label:"Semua Asrama"},{value:"all_students",label:"Semua Santri"},{value:"unit",label:"Unit"},{value:"class",label:"Kelas"},{value:"group",label:"Kelompok"}],required:true},
      {name:"targetId",label:"Target (bila Unit/Kelas/Kelompok)",type:"relationUnion",relations:["units","classes","groups"]},{name:"notes",label:"Catatan",type:"textarea",full:true}
    ]
  }
};


entityConfig.programs.title="Data Program Keasramaan";
entityConfig.programs.subtitle="Kelola nama dan kategori program. Kewajiban presensi dan laporan ditentukan per jadwal pada tab Jadwal & Pencatatan.";
entityConfig.programs.fields=entityConfig.programs.fields.filter(f=>f.name!=="attendanceRequired");
entityConfig.programs.columns=entityConfig.programs.columns.filter(([f])=>f!=="attendanceRequired");
const boolOptions=[{value:"true",label:"Ya"},{value:"false",label:"Tidak"}];
entityConfig.groups.fields.push({name:"subjectId",label:"Mapel Bahasa Arab",type:"relation",relation:"subjects"},{name:"teachingEnabled",label:"Aktifkan Pembelajaran Bahasa Arab",type:"boolean",options:boolOptions,default:true});
entityConfig["daily-schedules"].fields.push(
 {name:"status",label:"Status",type:"select",options:activeOptions,default:"active"},
 {name:"genderScope",label:"Unit Asrama",type:"select",options:[{value:"mixed",label:"Putra & Putri"},{value:"L",label:"Putra"},{value:"P",label:"Putri"}],default:"mixed"},
 {name:"naqibAttendance",label:"Wajib Presensi Naqib",type:"boolean",options:boolOptions},
 {name:"naqibReport",label:"Wajib Laporan Pelaksanaan",type:"boolean",options:boolOptions}
);
for(const [key,title] of [["quran-schedules","Jadwal Al-Qur’an"],["arabic-schedules","Jadwal Bahasa Arab"]]){
 entityConfig[key]={title,subtitle:"Jadwal mengikuti pembina dan peserta halaqah yang dipilih. Cakupan jadwal bersama lama tetap dipertahankan.",prefix:"HAL",
 columns:[["day","Hari"],["startTime","Mulai"],["endTime","Selesai"],["targetId","Halaqah"],["status","Status"]],
 fields:entityConfig["daily-schedules"].fields.filter(f=>["academicYearId","day","startTime","endTime","status"].includes(f.name)).concat([
 {name:"targetId",label:"Halaqah (jadwal bersama lama boleh kosong)",type:"relation",relation:"groups"},
 {name:"notes",label:"Catatan",type:"textarea",full:true}
 ])};
}
function renderWorkspace(key){const w=ADMIN_WORKSPACES[key];if(w.href){location.href=w.href;return;}navigate(w.items[0][0]);}
function workspaceTabs(section){
 const w=ADMIN_WORKSPACES[workspaceFor(section)];if(!w?.items)return;
 const nav=document.createElement("nav");nav.className="admin-tabs";nav.setAttribute("aria-label",w.title);
 nav.innerHTML=w.items.map(([id,label])=>`<button class="btn ${id===section?'btn-primary':'btn-secondary'}" data-admin-tab="${id}">${escapeHtml(label)}</button>`).join("");
 $("#content").prepend(nav);nav.querySelectorAll("button").forEach(b=>b.onclick=()=>navigate(b.dataset.adminTab));
}
function relationLabel(type, id) {
  if (!id) return "—";
  const list = cache[type] || [];
  const item = list.find(x => x.id === id);
  return item?.name || item?.title || id;
}

function valueLabel(section, field, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (["unitId"].includes(field)) return relationLabel("units", value);
  if (["homeroomStaffId","staffId","mentorStaffId","teacherStaffId"].includes(field)) return relationLabel("staff", value);
  if (field === "dormitoryId") return relationLabel("dormitories", value);
  if (field === "studentId") return relationLabel("students", value);
  if (field === "classId") return relationLabel("classes", value);
  if (field === "subjectId") return relationLabel("subjects", value);
  if (field === "programId") return relationLabel("programs", value);
  if (field === "academicYearId") return relationLabel("academic-years", value);
  if (field === "gender") return value === "L" ? "Putra" : value === "P" ? "Putri" : value;
  if (field === "boardingStatus") return {boarding:"Asrama",non_boarding:"Nonasrama",fullday:"Fullday"}[value] || value;
  if (field === "status") return ({active:"Aktif",inactive:"Nonaktif",leave:"Cuti",graduated:"Lulus",withdrawn:"Keluar"}[value] || value);
  if (field === "unitIds") return Array.isArray(value) ? value.map(id=>relationLabel("units",id)).join(", ") : relationLabel("units", value);
  if (field === "roles") return Array.isArray(value) ? value.join(", ") : value;
  if (field === "targetId") {
    return relationLabel("units", value) !== value ? relationLabel("units", value) : relationLabel("classes", value) !== value ? relationLabel("classes", value) : relationLabel("groups", value);
  }
  return String(value);
}

async function loadCache() {
  const entries = await Promise.all(Object.entries(pathMap).map(async ([key, path]) => [key, await listNode(path)]));
  cache = Object.fromEntries(entries);
}

async function refreshActiveYear() {
  const id = await getCurrentAcademicYearId();
  const year = (cache["academic-years"] || []).find(x => x.id === id);
  $("#activeYearLabel").textContent = year?.name ? `${year.name} · S${year.semester || ""}` : "Belum diatur";
  return id;
}

function getFilteredRows(section) {
  const search = ($("#tableSearch")?.value || "").trim().toLowerCase();
  const rows = (cache[section] || []).filter(r=>section==="quran-schedules"?(r.quranMorning||r.quranAllGroups||r.attendanceRole==="mentor_tahsin_tahfiz"):section==="arabic-schedules"?r.attendanceRole==="guru_mapel":true);
  return rows.filter(row => (!search||JSON.stringify(row).toLowerCase().includes(search))&&(!$("#unitFilter")?.value||row.unitId===$("#unitFilter").value)&&(!$("#statusFilter")?.value||row.status===$("#statusFilter").value)&&(!$("#boardingFilter")?.value||row.boardingStatus===$("#boardingFilter").value));
}

function adminMetrics(section){
 const rows=cache[section]||[],active=rows.filter(r=>r.status==='active').length;
 const values=section==='students'?[['Total Santri',rows.length],['Santri Aktif',active],['Asrama',rows.filter(r=>r.boardingStatus==='boarding').length],['Nonasrama',rows.filter(r=>r.boardingStatus==='non_boarding').length]]:[['Total Data',rows.length],['Aktif',active],['Unit Sekolah',(cache.units||[]).length],['Tahun Ajaran',$('#activeYearLabel')?.textContent||'—']];
 return '<div class="admin-metrics">'+values.map(([label,value],i)=>'<article><span class="admin-metric-icon" aria-hidden="true">'+['♙','✓','⌂','▦'][i]+'</span><div><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(String(value))+'</strong></div></article>').join('')+'</div>';
}
function renderDailyPrograms(){
 const rows=(cache['daily-schedules']||[]).slice().sort((a,b)=>String(a.startTime||'').localeCompare(String(b.startTime||'')));
 const program=r=>(cache.programs||[]).find(p=>p.id===r.programId)||{};
 const active=r=>r.status!=='inactive'&&program(r).status!=='inactive';
 const metrics=[['Jadwal Aktif',rows.filter(active).length],['Wajib Presensi',rows.filter(r=>naqibProgramEnabled(r,program(r))).length],['Wajib Laporan',rows.filter(r=>naqibProgramEnabled(r,program(r),'report')).length],['Kategori',new Set(rows.map(r=>program(r).category).filter(Boolean)).size]];
 $("#content").innerHTML='<section class="admin-page-hero"><div><p class="eyebrow">PROGRAM 24 JAM</p><h2>Jadwal Program Keasramaan</h2><p>Atur waktu, hari aktif, peserta, serta kewajiban presensi dan laporan pelaksanaan.</p></div><button class="btn btn-primary" id="addDaily">+ Tambah Jadwal</button></section><div class="admin-metrics">'+metrics.map(([label,value])=>'<article><div><small>'+escapeHtml(label)+'</small><strong>'+value+'</strong></div></article>').join('')+'</div><div class="toolbar"><input id="programSearch" type="search" placeholder="Cari program, kategori, atau waktu…"><select id="programDay" aria-label="Hari"><option value="">Semua Hari</option>'+dayOptions.map(d=>'<option>'+escapeHtml(d)+'</option>').join('')+'</select><select id="programStatus" aria-label="Status"><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><span id="programCount" class="badge"></span></div><div class="admin-program-grid" id="dailyProgramCards"></div>';
 const render=()=>{const q=$("#programSearch").value.toLowerCase(),day=$("#programDay").value,status=$("#programStatus").value;
 const filtered=rows.filter(r=>(!q||[program(r).name,program(r).category,r.startTime,r.endTime].join(' ').toLowerCase().includes(q))&&(!day||r.day==='Setiap Hari'||r.day===day)&&(!status||active(r)===(status==='active')));
 $("#programCount").textContent=filtered.length+' dari '+rows.length+' jadwal';
 $("#dailyProgramCards").innerHTML=filtered.map(r=>{const p=program(r);return '<article class="admin-program-card"><header><div><small>'+escapeHtml(p.category||'Program Asrama')+'</small><h3>'+escapeHtml(p.name||r.programId||'Program belum ditautkan')+'</h3></div></header><div class="admin-program-time">'+escapeHtml(r.startTime||'—')+' – '+escapeHtml(r.endTime||'—')+' <small>WITA</small></div><p>'+escapeHtml(r.day||'Hari belum diatur')+' · '+escapeHtml(({L:'Putra',P:'Putri'})[r.genderScope]||'Putra & Putri')+'</p><p>'+escapeHtml(valueLabel('daily-schedules','participantScope',r.participantScope))+(r.targetId?' · '+escapeHtml(valueLabel('daily-schedules','targetId',r.targetId)):'')+'</p><div class="program-flags"><span class="badge">'+(active(r)?'Aktif':'Nonaktif')+'</span><span class="badge">'+(naqibProgramEnabled(r,p)?'Wajib Presensi':'Tanpa Presensi')+'</span><span class="badge">'+(naqibProgramEnabled(r,p,'report')?'Wajib Laporan':'Tanpa Laporan')+'</span></div><div class="row-actions"><button class="mini-btn" data-edit="'+escapeHtml(r.id)+'">Edit Jadwal</button><button class="mini-btn danger" data-delete="'+escapeHtml(r.id)+'">Hapus</button></div></article>';}).join('')||'<div class="empty-state">Tidak ada jadwal yang cocok.</div>';
 bindRowActions('daily-schedules');};
 $("#addDaily").onclick=()=>openForm('daily-schedules');$("#programSearch").oninput=render;$("#programDay").onchange=render;$("#programStatus").onchange=render;render();
}

function renderEntity(section) {
  if(section==="daily-schedules")return renderDailyPrograms();
  const cfg = entityConfig[section];
  const rows = getFilteredRows(section);
  $("#content").innerHTML = `
    <div class="section-head admin-page-hero"><div><p class="eyebrow">PONDOK PESANTREN AL-MADANI</p><h2>${cfg.title}</h2><p>${cfg.subtitle}</p></div><div class="section-actions"><button class="btn btn-secondary" id="exportButton">Export CSV</button><button class="btn btn-primary" id="addButton">+ Tambah ${cfg.title}</button></div></div>
    ${adminMetrics(section)}
    <div class="toolbar"><input id="tableSearch" type="search" placeholder="Cari nama, nomor, atau data…" />${section==='students'?'<select id="unitFilter" aria-label="Unit"><option value="">Semua Unit</option>'+(cache.units||[]).map(u=>'<option value="'+escapeHtml(u.id)+'">'+escapeHtml(u.name)+'</option>').join('')+'</select><select id="boardingFilter" aria-label="Status asrama"><option value="">Semua Status Asrama</option><option value="boarding">Asrama</option><option value="non_boarding">Nonasrama</option></select>':''}<select id="statusFilter" aria-label="Status"><option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><span class="badge muted">${(cache[section]||[]).length} record</span></div>
    <div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr>${cfg.columns.map(c=>`<th>${c[1]}</th>`).join("")}<th>Aksi</th></tr></thead><tbody id="tableBody">${rowsMarkup(section, rows)}</tbody></table></div></div>`;
  $(".toolbar .badge").textContent=`${rows.length} record`;
  $("#addButton").addEventListener("click",()=>openForm(section));
  $("#exportButton").addEventListener("click",()=>exportSection(section));
  const refreshRows=()=>{const filtered=getFilteredRows(section);$("#tableBody").innerHTML=rowsMarkup(section,filtered);$(".toolbar .badge").textContent=filtered.length+' record';bindRowActions(section);};
  $("#tableSearch").addEventListener("input",refreshRows);
  $$('.toolbar select').forEach(el=>el.addEventListener('change',refreshRows));
  bindRowActions(section);
}

function rowsMarkup(section, rows) {
  const cfg = entityConfig[section];
  if (!rows.length) return `<tr><td colspan="${cfg.columns.length+1}" style="text-align:center;color:#7b8a84;padding:30px">Belum ada data.</td></tr>`;
  return rows.map(row => `<tr>${cfg.columns.map(([f,label])=>`<td data-label="${escapeHtml(label)}">${formatCell(section,f,row[f])}</td>`).join("")}<td><div class="row-actions"><button class="mini-btn detail" data-detail="${row.id}">Detail</button><button class="mini-btn" data-edit="${row.id}">Edit</button>${["classes","rooms","groups"].includes(section)?`<button class="mini-btn" data-members="${row.id}">Atur Peserta</button>`:""}${section==="academic-years"?`<button class="mini-btn" data-activate="${row.id}">Aktifkan</button>`:""}${section==="quran-placements"?"":`<button class="mini-btn danger" data-delete="${row.id}">Hapus</button>`}</div></td></tr>`).join("");
}

function formatCell(section, field, value) {
  const label = valueLabel(section, field, value);
  if (field === "status") return `<span class="badge ${value==="active"?"":"muted"}">${escapeHtml(label)}</span>`;
  if (field === "gender") return `<span class="badge">${escapeHtml(label)}</span>`;
  if (["startTime","endTime"].includes(field)) return `<span class="schedule-time">${escapeHtml(label)}</span>`;
  return escapeHtml(label);
}

function bindRowActions(section) {
 $$('[data-detail]').forEach(b=>b.onclick=()=>{const cfg=entityConfig[section],row=(cache[section]||[]).find(r=>r.id===b.dataset.detail);if(!row)return;$("#modalTitle").textContent='Detail '+cfg.title;$("#entityForm").innerHTML='<dl class="admin-detail">'+cfg.columns.map(([f,label])=>'<div><dt>'+escapeHtml(label)+'</dt><dd>'+formatCell(section,f,row[f])+'</dd></div>').join('')+'</dl><button type="button" class="btn btn-secondary" id="closeDetail">Tutup</button>';$("#modalBackdrop").classList.remove("hidden");$("#closeDetail").onclick=closeForm;});

 $$('[data-members]').forEach(b=>b.onclick=async()=>{await renderPlacement(({classes:'class',rooms:'room',groups:'group'})[section],b.dataset.members);workspaceTabs(section);});
  $$('[data-edit]').forEach(b=>b.addEventListener("click",()=>openForm(section,b.dataset.edit)));
  $$('[data-delete]').forEach(b=>b.addEventListener("click",async()=>{
    const id=b.dataset.delete; if(!confirmDialog("Hapus record ini? Data penempatan yang merujuk ID ini tidak otomatis dihapus."))return;
    try{if(section==="daily-schedules")await patchNode("",{[`schedules/daily/${id}`]:null,[`settings/naqibDuty/programs/${id}`]:null});else await deleteRecord(pathMap[section],id,session.user.uid);toast("Data dihapus.");await reloadAndRender(section);}catch(e){toast(e.message,"error")}
  }));
  $$('[data-activate]').forEach(b=>b.addEventListener("click",async()=>{
    try{await setCurrentAcademicYear(b.dataset.activate,session.user.uid);await refreshActiveYear();toast("Tahun ajaran aktif diperbarui.");}catch(e){toast(e.message,"error")}
  }));
}

function fieldOptions(field) {
  if (field.type === "relation" || field.type === "multirelation") {
    const list = cache[field.relation] || [];
    return list.filter(item=>!(field.name==="targetId"&&["quran-schedules","arabic-schedules"].includes(editState?.section))||(editState.section==="arabic-schedules"?item.programType==="arabic":!["arabic","lesson"].includes(item.programType))).map(item=>({value:item.id,label:item.name || item.title || item.id}));
  }
  if (field.type === "relationUnion") {
    const names = {units:"Unit",classes:"Kelas",groups:"Kelompok"};
    return (field.relations || []).flatMap(rel => (cache[rel] || []).map(item => ({
      value:item.id,
      label:`[${names[rel] || rel}] ${item.name || item.title || item.id}`
    })));
  }
  return field.options || [];
}

function openForm(section, id = null) {
  const cfg=entityConfig[section]; const item=id?(cache[section]||[]).find(x=>x.id===id):null;
  editState={section,id}; $("#modalTitle").textContent=`${item?"Edit":"Tambah"} ${cfg.title}`;
  $("#entityForm").innerHTML = cfg.fields.map(field=>fieldMarkup(field,item?.[field.name] ?? field.default ?? "")).join("") + `<div class="form-actions"><button type="button" class="btn btn-secondary" id="cancelForm">Batal</button><button class="btn btn-primary" type="submit">Simpan</button></div>`;
  $("#modalBackdrop").classList.remove("hidden"); $("#cancelForm").addEventListener("click",closeForm);
}

function fieldMarkup(field,value) {
  const cls=`field ${field.full?"full":""}`; const required=field.required?"required":""; const safe=escapeHtml(value);
  let control;
  if(field.type==="boolean"||field.type==="select"||field.type==="relation"||field.type==="relationUnion"){
    const opts=fieldOptions(field); if(value!==""&&value!==null&&!opts.some(o=>String(o.value)===String(value)))opts.push({value,label:String(value)}); control=`<select name="${field.name}" ${required}><option value="">— Pilih —</option>${opts.map(o=>`<option value="${escapeHtml(o.value)}" ${String(o.value)===String(value)?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}</select>`;
  }else if(field.type==="multirelation"){
    const opts=fieldOptions(field); const selected=Array.isArray(value)?value:[]; control=`<select name="${field.name}" multiple size="5">${opts.map(o=>`<option value="${escapeHtml(o.value)}" ${selected.includes(o.value)?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}</select>`;
  }else if(field.type==="textarea") control=`<textarea name="${field.name}" ${required} placeholder="${escapeHtml(field.placeholder||"")}">${safe}</textarea>`;
  else control=`<input name="${field.name}" type="${field.type||"text"}" value="${safe}" ${required} ${field.step?`step="${escapeHtml(field.step)}"`:""} ${field.min!==undefined?`min="${field.min}"`:""} ${field.max!==undefined?`max="${field.max}"`:""} placeholder="${escapeHtml(field.placeholder||"")}" />`;
  return `<label class="${cls}"><span>${field.label}${field.required?" *":""}</span>${control}${field.help?`<small class="muted">${escapeHtml(field.help)}</small>`:""}</label>`;
}

function closeForm(){ $("#modalBackdrop").classList.add("hidden"); editState=null; }

async function submitForm(event){
  event.preventDefault(); if(!editState)return; const {section,id}=editState; const cfg=entityConfig[section]; const fd=new FormData(event.currentTarget); const data={};
  cfg.fields.forEach(f=>{let v=f.type==="multirelation"?fd.getAll(f.name):(fd.get(f.name)??""); if(f.type==="number"&&v!=="")v=Number(v); if(f.type==="boolean")v=v===""?null:v==="true"; if(f.name==="roles")v=String(v).split(",").map(x=>x.trim()).filter(Boolean); data[f.name]=v;});
  if(section==="quran-placements") {
    if(data.programQuran==="TAHSIN"&&!data.tahsinLevel){toast("Pilih level Tahsin.","error");return;}
    if(data.programQuran==="TAHFIZ")data.tahsinLevel="";
    if((cache[section]||[]).some(r=>r.id!==id&&r.studentId===data.studentId&&r.academicYearId===data.academicYearId&&r.effectiveFrom===data.effectiveFrom&&r.status!=="inactive"&&data.status!=="inactive")){toast("Penempatan aktif pada tanggal itu sudah ada. Edit rekam yang sama.","error");return;}
  }
  const previous=(cache[section]||[]).find(r=>r.id===id)||{};
  try{Object.assign(data,normalizeAdminRecord(section,data,previous));
   if(["quran-schedules","arabic-schedules"].includes(section)&&!data.targetId)delete data.targetId;
  }catch(e){toast(e.message,"error");return;}
  const recordId=id||makeId(cfg.prefix); try{const latest=await getNode(`${pathMap[section]}/${recordId}`)||{};const payload={...latest,...data};delete payload.id;
    if(section==='daily-schedules'){
      const startMinute=Number(data.startTime.slice(0,2))*60+Number(data.startTime.slice(3));
      await patchNode('',{[`schedules/daily/${recordId}`]:{...payload,updatedAt:Date.now(),updatedBy:session.user.uid},[`settings/naqibDuty/programs/${recordId}`]:data.status==='inactive'?null:{programId:data.programId,startTime:data.startTime,endTime:data.endTime,day:data.day,academicYearId:data.academicYearId,startMinute,shiftId:startMinute<480?'shift1':startMinute<960?'shift2':'shift3'}});
    }else await saveRecord(pathMap[section],recordId,payload,session.user.uid);
    toast(id?"Data diperbarui.":"Data ditambahkan.");closeForm();await reloadAndRender(section);}catch(e){toast(e.message||"Gagal menyimpan data.","error")}
}

function exportSection(section){
  const rows=getFilteredRows(section); if(!rows.length)return toast("Belum ada data untuk diekspor.","warning");
  const headers=["id",...entityConfig[section].fields.map(f=>f.name)]; const normalized=rows.map(r=>Object.fromEntries(headers.map(h=>[h,Array.isArray(r[h])?r[h].join("|"):(r[h]??"")]))); downloadText(`${section}.csv`,toCSV(normalized,headers),"text/csv;charset=utf-8");
}

async function renderPlacement(kind,targetId=null){
  placementSelection=null;placementRequest++;
  const activeYear=await getCurrentAcademicYearId();
  const years=cache["academic-years"]||[]; const students=(cache.students||[]).filter(s=>s.status==="active");
  const targetSection=kind==="class"?"classes":kind==="room"?"rooms":"groups";
  const title=kind==="class"?"Penempatan Kelas":kind==="room"?"Penempatan Kamar":"Anggota Kelompok / Halaqah";
  $("#content").innerHTML=`<div class="section-head"><div><h2>${title}</h2><p>Penempatan disimpan per tahun ajaran sehingga perubahan tidak menghapus riwayat sebelumnya.</p></div></div>
  <div class="placement-layout"><div class="placement-control"><h3>Tujuan Penempatan</h3><label class="field">Tahun Ajaran<select id="placementYear">${years.map(y=>`<option value="${y.id}" ${y.id===activeYear?"selected":""}>${escapeHtml(y.name)} · S${escapeHtml(y.semester||"")}</option>`).join("")}</select></label><label class="field">${kind==="class"?"Kelas/Rombel":kind==="room"?"Kamar":"Kelompok"}<select id="placementTarget"><option value="">— Pilih —</option>${(cache[targetSection]||[]).filter(x=>x.status!=="inactive").map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join("")}</select></label><button class="btn btn-primary btn-block" id="savePlacement" disabled>Simpan Penempatan</button><div class="notice" style="margin-top:12px">Centang santri yang berada pada tujuan terpilih. Untuk kelas/kamar, santri yang sebelumnya berada pada tujuan ini tetapi dilepas centangnya akan dikeluarkan dari penempatan tersebut.</div></div><div class="student-picker"><div class="picker-head"><div><strong id="pickerTitle">Pilih tujuan dahulu</strong><div class="muted" id="pickerMeta" style="font-size:10px;margin-top:3px"></div></div><input id="pickerSearch" placeholder="Cari santri…" /></div><div id="studentCheckList" class="check-list"><div class="empty-state" style="grid-column:1/-1">Pilih tahun ajaran dan tujuan penempatan.</div></div></div></div>`;
  const refresh=()=>renderStudentPicker(kind,students); $("#placementYear").addEventListener("change",refresh); $("#placementTarget").addEventListener("change",refresh); $("#pickerSearch").addEventListener("input",refresh); $("#savePlacement").addEventListener("click",()=>savePlacement(kind));
  if(targetId){$("#placementTarget").value=targetId;await refresh();}
}

async function renderStudentPicker(kind,students){
  const yearId=$("#placementYear").value,targetId=$("#placementTarget").value,search=$("#pickerSearch").value.toLowerCase(); if(!yearId||!targetId){$("#savePlacement").disabled=true;return;}
  const request=++placementRequest;$("#savePlacement").disabled=true;
  let assignments={}; if(kind==="class")assignments=await getClassAssignments(yearId); else if(kind==="room")assignments=await getRoomAssignments(yearId); else assignments=await getGroupAssignments(yearId,targetId);
  if(request!==placementRequest)return;
  const selectionKey=`${kind}/${yearId}/${targetId}`;
  if(placementSelection?.key!==selectionKey)placementSelection={key:selectionKey,ids:new Set(kind==="group"?Object.keys(assignments):Object.entries(assignments).filter(([,a])=>(kind==="class"?a.classId:a.roomId)===targetId).map(([id])=>id))};
  let filtered=students;
  if(kind==="class"){const cls=(cache.classes||[]).find(x=>x.id===targetId);if(cls?.unitId)filtered=filtered.filter(s=>s.unitId===cls.unitId);}
  if(kind==="room"){const room=(cache.rooms||[]).find(x=>x.id===targetId);const dorm=(cache.dormitories||[]).find(x=>x.id===room?.dormitoryId);if(dorm?.gender)filtered=filtered.filter(s=>s.gender===dorm.gender);filtered=filtered.filter(s=>s.boardingStatus==="boarding");}
  if(search)filtered=filtered.filter(s=>(`${s.name} ${s.studentNo||""}`).toLowerCase().includes(search));
  const isChecked=s=>placementSelection.ids.has(s.id);
  $("#pickerTitle").textContent=relationLabel(kind==="class"?"classes":kind==="room"?"rooms":"groups",targetId); $("#pickerMeta").textContent=`${filtered.length} santri tersedia`; $("#savePlacement").disabled=false;
  $("#studentCheckList").innerHTML=filtered.length?filtered.map(s=>`<label class="check-card"><input type="checkbox" data-student="${s.id}" ${isChecked(s)?"checked":""}><span><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.studentNo||s.id)} · ${escapeHtml(relationLabel("units",s.unitId))}</small></span></label>`).join(""):`<div class="empty-state" style="grid-column:1/-1">Tidak ada santri sesuai filter.</div>`;
  $$("#studentCheckList [data-student]").forEach(input=>input.addEventListener("change",()=>{if(input.checked)placementSelection.ids.add(input.dataset.student);else placementSelection.ids.delete(input.dataset.student);}));
}

async function savePlacement(kind){
  const yearId=$("#placementYear").value,targetId=$("#placementTarget").value; if(placementSelection?.key!==`${kind}/${yearId}/${targetId}`)return; const checked=new Set(placementSelection.ids);
  try{$("#savePlacement").disabled=true; $("#savePlacement").textContent="Menyimpan…";
    if(kind==="class"){
      const existing=await getClassAssignments(yearId); const inTarget=Object.values(existing).filter(a=>a.classId===targetId).map(a=>a.studentId);
      await Promise.all([...checked].map(id=>assignClass(yearId,id,targetId,session.user.uid))); await Promise.all(inTarget.filter(id=>!checked.has(id)).map(id=>unassignClass(yearId,id,session.user.uid)));
    }else if(kind==="room"){
      const existing=await getRoomAssignments(yearId); const inTarget=Object.values(existing).filter(a=>a.roomId===targetId).map(a=>a.studentId);
      await Promise.all([...checked].map(id=>assignRoom(yearId,id,targetId,session.user.uid))); await Promise.all(inTarget.filter(id=>!checked.has(id)).map(id=>unassignRoom(yearId,id,session.user.uid)));
    }else{
      const existing=await getGroupAssignments(yearId,targetId); const old=new Set(Object.keys(existing)); const all=new Set([...old,...checked]); await Promise.all([...all].map(id=>setGroupMembership(yearId,targetId,id,checked.has(id),session.user.uid)));
    }
    toast("Penempatan berhasil disimpan."); await renderStudentPicker(kind,(cache.students||[]).filter(s=>s.status==="active"));
  }catch(e){toast(e.message||"Gagal menyimpan penempatan.","error")}finally{$("#savePlacement").disabled=false;$("#savePlacement").textContent="Simpan Penempatan";}
}

async function reloadAndRender(section){await loadCache();await refreshActiveYear();await renderSection(section);workspaceTabs(section);}

async function navigate(section){if(!entityConfig[section]&&!['class-placements','room-placements','group-placements'].includes(section))section='students';currentSection=section; $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.section===section||b.dataset.workspace===workspaceFor(section))); $("#pageTitle").textContent= section==="dashboard"?"Beranda Admin": entityConfig[section]?.title || ({"class-placements":"Penempatan Kelas","room-placements":"Penempatan Kamar","group-placements":"Anggota Kelompok"}[section]||section); await renderSection(section); workspaceTabs(section); $("#sidebar").classList.remove("open");}

function renderSection(section){
  if(entityConfig[section])return renderEntity(section); if(section==="class-placements")return renderPlacement("class"); if(section==="room-placements")return renderPlacement("room"); if(section==="group-placements")return renderPlacement("group");
}

async function boot(){
  try{session=await requireAdmin(); $("#adminName").textContent=session.profile.name||session.user.email||"Administrator"; await loadCache(); await refreshActiveYear(); await navigate(entityConfig[location.hash.slice(1)]?location.hash.slice(1):'students');}
  catch(e){console.error(e)}
}

$("#logoutButton").addEventListener("click",async()=>{await logout();window.location.href="../index.html"}); $("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open")); $("#modalClose").addEventListener("click",closeForm); $("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeForm()}); $("#entityForm").addEventListener("submit",submitForm); $$('.nav-item').forEach(btn=>btn.addEventListener("click",()=>{if(btn.dataset.section)navigate(btn.dataset.section);}));
boot();

$$("[data-workspace]").forEach(b=>b.onclick=()=>renderWorkspace(b.dataset.workspace));
