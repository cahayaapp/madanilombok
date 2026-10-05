import {renderCounselorWorkspace,renderCounselorReflection} from '../counselor-workspace.js';
import {renderNaqibStudentAssessment,renderNaqibReflection} from '../naqib-assessment.js';
import {counselorLevel,routeCounselorCase} from '../counselor-model.js';
import {recurringView,arabicRosterView} from '../boarding-roster-view.js';
import {dailyForStaff,programStudents,genderMatches} from '../daily-schedules.js';
import { getNode, listNode, pushRecord, saveRecord, setNode, patchNode, transitionWorkspaceRecord, commitCaseOperation } from "../repository.js";
import { byId, studentsForClass } from "../app-store.js";
import {filterScopedStudents,reportableStudents,localDate} from '../role-experience.js';
import {
  pageHeader, panel, metric, table, formRow, input, textarea, select, selectOptions, studentOptions,
  attachAsync, escapeHtml, badge, toast
} from "./common.js";
const today=localDate;

function boardingStudents(ctx) {
  const assigned = new Set(Object.keys(ctx.master.roomAssignments || {}));
  let rows = (ctx.master.students || []).filter(s => assigned.has(s.id) || s.boardingStatus === "boarding");
  const gender = ctx.session.profile.scopeGender || ctx.session.profile.genderScope;
  if (gender === "L" || gender === "P") rows = rows.filter(s => s.gender === gender);
  return rows.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
}

function profileGender(ctx) {
  const value = ctx.session.profile.scopeGender || ctx.session.profile.genderScope;
  return value === "L" || value === "P" ? value : "";
}

function scopedCases(ctx, cases = []) {
  const gender = profileGender(ctx);
  if (!gender) return cases;
  const studentMap = byId(ctx.master.students || []);
  return cases.filter(c => studentMap[c.studentId]?.gender === gender);
}

function mentees(ctx) {return filterScopedStudents(ctx.master,ctx.session.profile,'guru_wali');}

export async function renderNaqibPrograms(ctx) {
  const programMap=byId(ctx.master.programs||[]);
  const gender=profileGender(ctx);
  const schedules=(ctx.master.dailySchedules||[]).filter(s=>dailyForStaff(s,ctx.session.profile,ctx.yearId)).sort((a,b)=>(a.audience||"").localeCompare(b.audience||"")||(a.order||999)-(b.order||999));
  ctx.root.innerHTML=pageHeader("Program Hari Ini","Jadwal 24 jam yang menjadi panduan pendampingan Naqib.")+`
    <label>Jadwal <select id="dailyAudience"><option value="">Semua asrama</option><option value="boarding_general">Asrama Umum</option><option value="boarding_gema">Asrama GEMA</option></select></label><div class="timeline">${schedules.map(s=>{const p=programMap[s.programId]||{};return `<article class="timeline-item" data-daily-scope="${escapeHtml(s.participantScope||'')}"><div class="timeline-time">${escapeHtml(`${s.startTime||"—"}${s.endTime?`–${s.endTime}${s.endsNextDay?" (+1 hari)":""}`:""}`)}</div><div class="timeline-dot"></div><div class="timeline-card"><span>${escapeHtml(s.audience||"Santri")}</span><strong>${escapeHtml(p.name||"Program")}</strong><p>${escapeHtml(p.detail||"")}</p><small>PJ sumber: ${escapeHtml(p.defaultPic||"—")}</small>${s.notes?`<p>${escapeHtml(s.notes)}</p>`:""}</div></article>`}).join("")}</div>`;
  ctx.root.insertAdjacentHTML("beforeend",arabicRosterView(ctx.master,ctx.session.profile)+recurringView(ctx.master,ctx.session.profile,ctx.yearId));
  ctx.root.querySelector("#dailyAudience").onchange=e=>ctx.root.querySelectorAll("[data-daily-scope]").forEach(row=>row.hidden=Boolean(e.target.value&&row.dataset.dailyScope!==e.target.value));
}

export async function renderNaqibAttendance(ctx) {
  const gender=profileGender(ctx); const programs=(ctx.master.programs||[]).filter(p=>p.status!=="inactive"&&genderMatches(p.genderScope,gender)&&(ctx.master.dailySchedules||[]).some(s=>s.programId===p.id&&dailyForStaff(s,ctx.session.profile,ctx.yearId)));
  ctx.root.innerHTML=pageHeader("Presensi Program Asrama","Catat kehadiran santri pada program kehidupan asrama.")+`
    ${panel("Pilih Program",`<div class="filter-row wrap"><select id="programPick">${selectOptions(programs)}</select><select id="arabicGroupPick" hidden><option value="">Semua kelompok bahasa</option>${selectOptions((ctx.master.groups||[]).filter(g=>g.programType==="arabic"&&g.status!=="inactive"&&genderMatches(g.gender,gender)))}</select><input type="date" id="programDate" value="${today()}"><button class="btn btn-primary" id="loadProgramAtt">Tampilkan</button></div>`)}<div id="programAttWork" style="margin-top:18px"></div>`;
  const programPick=ctx.root.querySelector('#programPick'),arabicPick=ctx.root.querySelector('#arabicGroupPick');
  const updateArabic=()=>{arabicPick.hidden=!(ctx.master.dailySchedules||[]).some(s=>s.programId===programPick.value&&s.startTime==='05:40');if(arabicPick.hidden)arabicPick.value='';};
  programPick.onchange=updateArabic;updateArabic();
  document.getElementById("loadProgramAtt")?.addEventListener("click",async()=>{
    const programId=document.getElementById("programPick").value,date=document.getElementById("programDate").value;
    if(!programId||!date) return toast("Pilih program dan tanggal.","warning");
    const students=programStudents(programId,ctx.master).filter(s=>genderMatches(gender,s.gender)&&(!arabicPick.value||arabicPick.hidden||ctx.master.groupAssignments?.[arabicPick.value]?.[s.id]));
    const saved=await getNode(`boarding/program_attendance/${ctx.yearId}/${date}/${programId}`)||{};
    const ws=document.getElementById("programAttWork");
    ws.innerHTML=pageHeader("Daftar Santri",`${students.length} santri`,`<button class="btn btn-primary" id="saveProgramAtt">Simpan Presensi</button>`)+table(["Santri","Status","Catatan"],students.map(s=>`<tr data-student="${s.id}"><td><strong>${escapeHtml(s.name)}</strong></td><td><select class="pstatus"><option ${saved[s.id]?.status==="Hadir"?"selected":""}>Hadir</option><option ${saved[s.id]?.status==="Terlambat"?"selected":""}>Terlambat</option><option ${saved[s.id]?.status==="Sakit"?"selected":""}>Sakit</option><option ${saved[s.id]?.status==="Izin"?"selected":""}>Izin</option><option ${saved[s.id]?.status==="Alfa"?"selected":""}>Alfa</option></select></td><td><input class="pnote table-input" value="${escapeHtml(saved[s.id]?.note||"")}"></td></tr>`).join(""));
    document.getElementById("saveProgramAtt")?.addEventListener("click",async()=>{
      const payload={};ws.querySelectorAll("tr[data-student]").forEach(tr=>payload[tr.dataset.student]={studentId:tr.dataset.student,status:tr.querySelector(".pstatus").value,note:tr.querySelector(".pnote").value,recordedBy:ctx.session.user.uid,updatedAt:Date.now()});
      await patchNode(`boarding/program_attendance/${ctx.yearId}/${date}/${programId}`,payload);toast("Presensi program tersimpan.");
    });
  });
}

export async function renderNaqibReport(ctx) {
  const gender=profileGender(ctx); const programs=(ctx.master.programs||[]).filter(p=>p.status!=="inactive"&&genderMatches(p.genderScope,gender)&&(ctx.master.dailySchedules||[]).some(s=>s.programId===p.id&&dailyForStaff(s,ctx.session.profile,ctx.yearId))); const rows=(await listNode(`boarding/program_reports/${ctx.yearId}`)).filter(r=>!gender || !r.genderScope || r.genderScope===gender);
  ctx.root.innerHTML=pageHeader("Laporan Pelaksanaan Program","Catat kualitas pelaksanaan, kendala, dan tindak lanjut program.")+`<div class="portal-grid two">
    ${panel("Buat Laporan",`<form id="programReportForm" class="portal-form">${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Program",select("programId",selectOptions(programs),"required"))}${formRow("Kualitas",select("quality","<option value='baik'>Baik</option><option value='cukup'>Cukup</option><option value='perlu_perbaikan'>Perlu Perbaikan</option>"))}${formRow("Yang Berjalan Baik",textarea("strengths"),true)}${formRow("Kendala/Temuan",textarea("issues"),true)}${formRow("Tindak Lanjut",textarea("followUp"),true)}<div class="form-actions"><button class="btn btn-primary">Simpan Laporan</button></div></form>`)}
    ${panel("Laporan Terbaru",rows.length?`<div class="stack-list">${rows.slice(-20).reverse().map(r=>`<article class="list-card"><div><span>${escapeHtml(r.date||"—")}</span><strong>${escapeHtml((byId(ctx.master.programs||[])[r.programId]?.name)||"Program")}</strong><small>${escapeHtml(r.issues||r.strengths||"Tanpa catatan")}</small></div>${badge(r.quality||"—")}</article>`).join("")}</div>`:`<div class="empty-state">Belum ada laporan.</div>`)}
  </div>`;
  attachAsync(document.getElementById("programReportForm"),async data=>{await pushRecord(`boarding/program_reports/${ctx.yearId}`,{...data,genderScope:profileGender(ctx)||null,naqibUid:ctx.session.user.uid},ctx.session.user.uid);ctx.rerender();},"Laporan pelaksanaan tersimpan.");
}

export async function renderNaqibInitiative(ctx) {
  const students=boardingStudents(ctx); const allowed=new Set(students.map(x=>x.id)); const rows=(await listNode(`boarding/initiatives/${ctx.yearId}`)).filter(r=>allowed.has(r.studentId));
  ctx.root.innerHTML=pageHeader("Inisiatif Santri","Apresiasi perilaku positif dan kontribusi santri.")+`<div class="portal-grid two">
    ${panel("Catat Inisiatif",`<form id="initiativeForm" class="portal-form">${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Santri",select("studentId",studentOptions(students),"required"))}${formRow("Kategori",select("category","<option>Akhlak</option><option>Kepemimpinan</option><option>Kebersihan</option><option>Ibadah</option><option>Belajar</option><option>Menolong</option><option>Lainnya</option>"))}${formRow("Poin Apresiasi",select("points","<option value='5'>+5</option><option value='10'>+10</option><option value='15'>+15</option><option value='20'>+20</option><option value='25'>+25</option>"))}${formRow("Deskripsi",textarea("description","","required"),true)}<div class="form-actions"><button class="btn btn-primary">Simpan Apresiasi</button></div></form>`)}
    ${panel("Terbaru",rows.length?`<div class="stack-list">${rows.slice(-20).reverse().map(r=>`<article class="list-card"><div><span>${escapeHtml(r.date||"—")}</span><strong>${escapeHtml(byId(students)[r.studentId]?.name||r.studentId||"Santri")}</strong><small>${escapeHtml(r.description||"")}</small></div><span class="score-chip positive">+${escapeHtml(r.points||0)}</span></article>`).join("")}</div>`:`<div class="empty-state">Belum ada catatan inisiatif.</div>`)}
  </div>`;
  attachAsync(document.getElementById("initiativeForm"),async data=>{data.points=Number(data.points||0);await pushRecord(`boarding/initiatives/${ctx.yearId}`,{...data,recordedBy:ctx.session.user.uid},ctx.session.user.uid);await pushRecord(`discipline/points/${ctx.yearId}/${data.studentId}`,{date:data.date,type:"initiative",points:data.points,description:data.description,source:"naqib"},ctx.session.user.uid);ctx.rerender();},"Apresiasi tersimpan.");
}

export async function renderNaqibExample(ctx) {
  const uid=ctx.session.user.uid;const rows=await listNode(`boarding/naqib_examples/${ctx.yearId}/${uid}`);
  ctx.root.innerHTML=pageHeader("Naqib Teladan","Catat bukti keteladanan Naqib sebagai evidence pembinaan, bukan sebagai klaim penilaian diri semata.")+`<div class="portal-grid two">${panel("Catat Evidence",`<form id="exampleForm" class="portal-form">${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Bidang",select("category","<option>Ibadah</option><option>Adab</option><option>Kedisiplinan</option><option>Pelayanan Santri</option><option>Kebersihan</option><option>Inisiatif</option>"))}${formRow("Bukti/Perilaku",textarea("description","","required"),true)}${formRow("Catatan Pendukung",textarea("evidence"),true)}<div class="form-actions"><button class="btn btn-primary">Simpan Evidence</button></div></form>`)}${panel("Evidence Terbaru",rows.length?`<div class="stack-list">${rows.slice(-20).reverse().map(r=>`<article class="list-card"><div><span>${escapeHtml(r.date||"—")}</span><strong>${escapeHtml(r.category||"Keteladanan")}</strong><small>${escapeHtml(r.description||"")}</small></div></article>`).join("")}</div>`:`<div class="empty-state">Belum ada evidence.</div>`)}</div>`;
  attachAsync(document.getElementById("exampleForm"),async data=>{await pushRecord(`boarding/naqib_examples/${ctx.yearId}/${uid}`,{...data,uid},uid);ctx.rerender();},"Evidence keteladanan tersimpan.");
}

export async function renderNaqibAssessment(ctx) {return renderNaqibStudentAssessment(ctx);}

export async function renderNaqibDiscipline(ctx) {
  const students=boardingStudents(ctx);const node=await getNode(`discipline/points/${ctx.yearId}`)||{};
  const rows=students.map(student=>{const records=Object.values(node[student.id]||{});return {student,total:records.reduce((sum,r)=>sum+Number(r.points||0),0),count:records.length,last:records.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]};});
  ctx.root.innerHTML=pageHeader("Skor Kedisiplinan","Naqib melihat akumulasi histori poin sebagai konteks pendampingan. Perubahan poin formal dilakukan oleh Konselor.")+table(["Santri","Akumulasi","Jumlah Catatan","Catatan Terakhir"],rows.sort((a,b)=>a.total-b.total).map(r=>`<tr><td><strong>${escapeHtml(r.student.name)}</strong></td><td><span class="score-chip ${r.total>=0?"positive":""}">${escapeHtml(r.total)}</span></td><td>${r.count}</td><td>${escapeHtml(r.last?.description||"—")}</td></tr>`).join(""));
}

export async function renderNaqibKpi(ctx) {
  const uid=ctx.session.user.uid;const [reports,initiatives,cases,examples,selfNode]=await Promise.all([listNode(`boarding/program_reports/${ctx.yearId}`),listNode(`boarding/initiatives/${ctx.yearId}`),listNode(`boarding/cases/${ctx.yearId}`),listNode(`boarding/naqib_examples/${ctx.yearId}/${uid}`),getNode(`boarding/naqib_self_review/${ctx.yearId}/${uid}`)]);
  const selfCount=Object.keys(selfNode||{}).length;
  ctx.root.innerHTML=pageHeader("KPI & Evidence Naqib","Ringkasan bukti kerja role aktif. Ini bukan ranking antar-Naqib.")+`<div class="portal-metrics">${metric("Laporan Program",String(reports.filter(r=>r.naqibUid===uid).length),"evidence pelaksanaan","blue")}${metric("Inisiatif Santri",String(initiatives.filter(r=>r.recordedBy===uid).length),"apresiasi tercatat","cyan")}${metric("Kasus Dilaporkan",String(cases.filter(r=>r.reportedBy===uid).length),"routing ke Konselor","coral")}${metric("Evidence Teladan",String(examples.length),"keteladanan","violet")}${metric("Self Review",String(selfCount),"hari tercatat","mint")}</div>`;
}

export async function renderNaqibGuide(ctx) {
  ctx.root.innerHTML=pageHeader("Panduan Kerja Naqib","Batas kewenangan dan ritme penggunaan MadaniApp.")+`<div class="portal-grid two">${panel("Alur Harian",`<div class="guide-steps"><b>1.</b> Cek Program Hari Ini.<br><b>2.</b> Dampingi program dan isi presensi/laporan.<br><b>3.</b> Catat inisiatif atau evidence keteladanan bila relevan.<br><b>4.</b> Catat asesmen perkembangan sesuai periode.<br><b>5.</b> Bila ada kasus, laporkan fakta melalui Lapor Kasus.</div>`)}${panel("Batas Kewenangan",`<div class="notice info">Naqib tidak melakukan konseling formal, tidak menetapkan konsekuensi, dan tidak mengubah poin pelanggaran. Penanganan kasus formal berada di Konselor.</div>`)}</div>`;
}

export async function renderNaqibCase(ctx) {
  const students=reportableStudents(ctx.master);
  ctx.root.innerHTML=pageHeader("Lapor Kasus / Pelanggaran","Laporkan santri dari semua unit pendidikan. Penanganan formal dilakukan Konselor.")+panel("Form Laporan",`<form id="caseReportForm" class="portal-form max-760">${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Santri",select("studentId",studentOptions(students),"required"))}${formRow("Kategori",select("category","<option>Kedisiplinan</option><option>Akhlak</option><option>Ibadah</option><option>Relasi</option><option>Akademik</option><option>Keamanan</option><option>Lainnya</option>"))}${formRow("Tingkat",select("severity","<option value='ringan'>Ringan</option><option value='sedang'>Sedang</option><option value='berat'>Berat</option><option value='kritis'>Kritis</option>"))}${formRow("Kronologi",textarea("description","","required"),true)}${formRow("Saksi/Bukti Awal",textarea("evidence"),true)}<div class="notice info full">Laporan ini masuk ke Kotak Kasus Konselor. Naqib tidak memberikan konsekuensi formal dari halaman ini.</div><div class="form-actions"><button class="btn btn-primary">Kirim ke Konselor</button></div></form>`);
  attachAsync(document.getElementById("caseReportForm"),async data=>{if(!students.some(s=>s.id===data.studentId))throw Error("Santri tidak tersedia dalam master aktif.");await pushRecord(`boarding/cases/${ctx.yearId}`,{...data,status:"baru",reportedBy:ctx.session.user.uid,reportedByRole:"naqib"},ctx.session.user.uid);document.getElementById("caseReportForm").reset();},"Kasus dikirim ke Konselor.");
}

export async function renderNaqibSelf(ctx) {return renderNaqibReflection(ctx);}
function ratingOptions(selected="") {return ["1 - Perlu perhatian","2 - Perlu perbaikan","3 - Cukup","4 - Baik","5 - Sangat baik"].map(v=>`<option ${v===selected?"selected":""}>${v}</option>`).join("");}

export async function renderNaqibHistory(ctx) {
  const [reports,initiatives,cases]=await Promise.all([listNode(`boarding/program_reports/${ctx.yearId}`),listNode(`boarding/initiatives/${ctx.yearId}`),listNode(`boarding/cases/${ctx.yearId}`)]);
  const uid=ctx.session.user.uid;
  ctx.root.innerHTML=pageHeader("Riwayat Naqib","Rekap aktivitas yang dicatat oleh akun ini.")+`<div class="portal-metrics">${metric("Laporan Program",String(reports.filter(r=>r.naqibUid===uid).length),"","blue")}${metric("Apresiasi",String(initiatives.filter(r=>r.recordedBy===uid).length),"","cyan")}${metric("Laporan Kasus",String(cases.filter(r=>r.reportedBy===uid).length),"","coral")}</div>`;
}

export async function renderMenteeList(ctx) {
  const list=mentees(ctx);
  ctx.root.innerHTML=pageHeader("Santri Binaan Guru Wali","Guru Wali menggantikan Mentor untuk mentoring individu.")+table(["Santri","Kelas","Unit","Status Asrama"],list.map(s=>{const ca=ctx.master.classAssignments?.[s.id];const c=byId(ctx.master.classes||[])[ca?.classId];return `<tr><td><strong>${escapeHtml(s.name)}</strong><br><small class="muted">${escapeHtml(s.studentNo||s.id)}</small></td><td>${escapeHtml(c?.name||"—")}</td><td>${escapeHtml(s.unitId||"—")}</td><td>${badge(s.boardingStatus||"—")}</td></tr>`}).join(""));
}

export async function renderMentoring(ctx) {
  const list=mentees(ctx);
  ctx.root.innerHTML=pageHeader("Mentoring Individu","Guru Wali mencatat satu rekam mentoring yang memuat refleksi, apresiasi, fokus, Strong Why, strategi, target, dan hasil target.")+panel("Form Mentoring",`<form id="mentoringForm" class="portal-form max-860">
    ${formRow("Tanggal",input("date",today(),"date","required"))}
    ${formRow("Santri",select("studentId",studentOptions(list),"required"))}
    ${formRow("Ringkasan Self-Assessment Santri",textarea("selfAssessmentSummary","","placeholder='Ringkas apa yang disampaikan santri tentang kondisi dirinya'"),true)}
    ${formRow("Apresiasi / Hal yang Disyukuri",textarea("appreciation","","required"),true)}
    ${formRow("Arah Fokus",select("focusType","<option value='PERBAIKI'>PERBAIKI</option><option value='TINGKATKAN'>TINGKATKAN</option>"))}
    ${formRow("Fokus",textarea("focus","","required"),true)}
    ${formRow("Target",textarea("target","","required"),true)}
    ${formRow("Strong Why",textarea("strongWhy","","required"),true)}
    ${formRow("Strategi / How",textarea("strategy","","required"),true)}
    ${formRow("Catatan",textarea("note"),true)}
    <div class="form-actions"><button class="btn btn-primary">Simpan Sesi</button></div>
  </form>`);
  attachAsync(document.getElementById("mentoringForm"),async data=>{
    await pushRecord(`boarding/mentoring/${ctx.yearId}/${data.studentId}`,{...data,mentorUid:ctx.session.user.uid,mentorRole:"guru_wali",targetResultStatus:"BELUM_DINILAI",targetResult:""},ctx.session.user.uid);
    ctx.rerender();
  },"Sesi mentoring tersimpan.");
}

export async function renderMentoringTargets(ctx) {
  const list=mentees(ctx); let rows=[];
  for(const student of list){
    const sessions=await listNode(`boarding/mentoring/${ctx.yearId}/${student.id}`);
    rows.push(...sessions.filter(r=>r.target).map(r=>({...r,studentId:student.id,studentName:student.name})));
  }
  rows.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  ctx.root.innerHTML=pageHeader("Target & Hasil Mentoring","Hasil target diperbarui pada rekam mentoring yang sama—bukan membuat catatan paralel.")+table(["Santri","Target","Status Hasil","Deskripsi Hasil","Aksi"],rows.map(r=>`<tr data-student="${r.studentId}" data-id="${r.id}"><td><strong>${escapeHtml(r.studentName)}</strong><br><small>${escapeHtml(r.date||"—")}</small></td><td>${escapeHtml(r.target||"—")}</td><td><select class="target-result"><option value="BELUM_DINILAI" ${r.targetResultStatus==="BELUM_DINILAI"?"selected":""}>BELUM DINILAI</option><option value="TERCAPAI" ${r.targetResultStatus==="TERCAPAI"?"selected":""}>TERCAPAI</option><option value="CUKUP_BERKEMBANG" ${r.targetResultStatus==="CUKUP_BERKEMBANG"?"selected":""}>CUKUP BERKEMBANG</option><option value="BELUM_TERCAPAI" ${r.targetResultStatus==="BELUM_TERCAPAI"?"selected":""}>BELUM TERCAPAI</option></select></td><td><input class="target-note table-input" value="${escapeHtml(r.targetResult||"")}" placeholder="Deskripsi hasil"></td><td><button class="mini-btn save-result">Simpan Hasil</button></td></tr>`).join(""),980);
  document.querySelectorAll(".save-result").forEach(btn=>btn.addEventListener("click",async()=>{
    const tr=btn.closest("tr"); const studentId=tr.dataset.student,id=tr.dataset.id;
    const current=await getNode(`boarding/mentoring/${ctx.yearId}/${studentId}/${id}`)||{};
    await saveRecord(`boarding/mentoring/${ctx.yearId}/${studentId}`,id,{...current,targetResultStatus:tr.querySelector(".target-result").value,targetResult:tr.querySelector(".target-note").value,targetEvaluatedAt:Date.now(),targetEvaluatedBy:ctx.session.user.uid},ctx.session.user.uid);
    toast("Hasil target diperbarui pada rekam mentoring yang sama."); ctx.rerender();
  }));
}

export async function renderMentoringHistory(ctx) {
  const list=mentees(ctx);let rows=[];for(const s of list){const node=await listNode(`boarding/mentoring/${ctx.yearId}/${s.id}`);rows.push(...node.map(r=>({...r,studentName:s.name})));}
  rows.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  ctx.root.innerHTML=pageHeader("Riwayat Mentoring","Riwayat sesi mentoring individu Guru Wali.")+table(["Tanggal","Santri","Fokus","Target","Hasil","Catatan"],rows.map(r=>`<tr><td>${escapeHtml(r.date||"—")}</td><td><strong>${escapeHtml(r.studentName)}</strong></td><td><span class="badge">${escapeHtml(r.focusType||"FOKUS")}</span><br>${escapeHtml(r.focus||"—")}</td><td>${escapeHtml(r.target||"—")}</td><td>${badge(r.targetResultStatus||"BELUM_DINILAI",r.targetResultStatus==="TERCAPAI"?"":"gold")}<br><small>${escapeHtml(r.targetResult||"")}</small></td><td>${escapeHtml(r.note||r.appreciation||"—")}</td></tr>`).join(""));
}

export async function renderCaseInbox(ctx) {
  const cases=scopedCases(ctx,await listNode(`boarding/cases/${ctx.yearId}`));const students=byId(ctx.master.students||[]);const uid=ctx.session.user.uid;
  const incoming=cases.filter(c=>routeCounselorCase(c,cases).level===counselorLevel(ctx.session.profile)&&!c.assignedCounselorUid && !["selesai","tidak_terbukti"].includes(c.status));
  incoming.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  ctx.root.innerHTML=pageHeader("Kasus Masuk","Konselor memeriksa laporan dan mengambil/claim kasus sesuai scope sebelum penanganan.")+table(["Tanggal","Santri","Kategori","Tingkat","Status","Aksi"],incoming.map(r=>`<tr><td>${escapeHtml(r.date||"—")}</td><td><strong>${escapeHtml(students[r.studentId]?.name||r.studentId||"—")}</strong></td><td>${escapeHtml(r.category||"—")}</td><td>${badge(r.severity||"—",r.severity==="berat"||r.severity==="kritis"?"red":"")}</td><td>${badge(r.status||"menunggu_konselor")}</td><td>${ctx.session.activeRole==='konselor'?`<button class="mini-btn case-claim" data-id="${r.id}">Claim Kasus</button>`:'Tinjauan administrator'}</td></tr>`).join(""));
  document.querySelectorAll(".case-claim").forEach(btn=>btn.addEventListener("click",async()=>{
    btn.disabled=true;
    try {
      const id=btn.dataset.id;
      await transitionWorkspaceRecord(`boarding/cases/${ctx.yearId}`,id,current=>{
        if(!scopedCases(ctx,[current]).length)throw new Error("Kasus di luar scope aktif.");
        if(routeCounselorCase(current,cases).level!==counselorLevel(ctx.session.profile))throw new Error('Kasus memerlukan tingkatan Konselor yang berbeda.');
        if(current.assignedCounselorUid && current.assignedCounselorUid!==uid)throw new Error("Kasus sudah diambil Konselor lain.");
        if(["selesai","tidak_terbukti"].includes(current.status))throw new Error("Kasus sudah ditutup.");
        return {...current,status:"ditangani",assignedCounselorUid:uid,routeLevel:routeCounselorCase(current,cases).level,claimedAt:{".sv":"timestamp"}};
      },uid);
      sessionStorage.setItem("madaniSelectedCase",id);toast("Kasus berhasil di-claim.");ctx.navigate("case-active");
    } catch(error){toast(error.message,"error");}finally{btn.disabled=false;}

  }));
}

export async function renderCaseActive(ctx) {
  const uid=ctx.session.user.uid;const students=byId(ctx.master.students||[]);const cases=scopedCases(ctx,await listNode(`boarding/cases/${ctx.yearId}`)).filter(c=>c.assignedCounselorUid===uid && !["selesai","tidak_terbukti"].includes(c.status));
  ctx.root.innerHTML=pageHeader("Kasus Aktif","Kasus yang sedang menjadi tanggung jawab Konselor ini.")+table(["Tanggal","Santri","Kategori","Tingkat","Tahap","Aksi"],cases.map(r=>`<tr><td>${escapeHtml(r.date||"—")}</td><td><strong>${escapeHtml(students[r.studentId]?.name||r.studentId||"—")}</strong></td><td>${escapeHtml(r.category||"—")}</td><td>${badge(r.severity||"—")}</td><td>${badge(r.status||"ditangani")}</td><td><button class="mini-btn active-case" data-id="${r.id}">Buka</button></td></tr>`).join(""));
  document.querySelectorAll(".active-case").forEach(btn=>btn.addEventListener("click",()=>{sessionStorage.setItem("madaniSelectedCase",btn.dataset.id);ctx.navigate("counseling");}));
}

export async function renderCounseling(ctx) {return renderCounselorWorkspace(ctx);}

export async function renderCaseActions(ctx) {
  const cases=scopedCases(ctx,await listNode(`boarding/cases/${ctx.yearId}`)).filter(c=>c.assignedCounselorUid===ctx.session.user.uid&&!["selesai","tidak_terbukti"].includes(c.status));const students=byId(ctx.master.students||[]);const allowed=new Set(cases.map(c=>c.id));const actions=(await listNode(`boarding/case_actions/${ctx.yearId}`)).filter(a=>!a.caseId||allowed.has(a.caseId));
  ctx.root.innerHTML=pageHeader("Tindakan Edukatif","Konsekuensi/pembinaan formal dicatat oleh Konselor.")+`<div class="portal-grid two">${panel("Catat Tindakan",`<form id="actionForm" class="portal-form">${formRow("Kasus",select("caseId",`<option value=''>Pilih...</option>${cases.map(c=>`<option value='${c.id}'>${escapeHtml(students[c.studentId]?.name||c.studentId)} · ${escapeHtml(c.category||"")}</option>`).join("")}`,"required"))}${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Jenis Tindakan",input("actionType","","text","placeholder='Pembinaan, tugas edukatif, mediasi, dll' required"))}${formRow("Deskripsi",textarea("description","","required"),true)}${formRow("Evaluasi/Tindak Lanjut",textarea("followUp"),true)}<div class="form-actions"><button class="btn btn-primary">Simpan</button></div></form>`)}${panel("Riwayat",actions.length?`<div class="stack-list">${actions.slice(-20).reverse().map(a=>`<article class="list-card"><div><span>${escapeHtml(a.date||"—")}</span><strong>${escapeHtml(a.actionType||"Tindakan")}</strong><small>${escapeHtml(a.description||"")}</small></div></article>`).join("")}</div>`:`<div class="empty-state">Belum ada tindakan.</div>`)}</div>`;
  const actionOperationId=crypto.randomUUID();attachAsync(document.getElementById("actionForm"),async data=>{if(!allowed.has(data.caseId))throw Error("Kasus di luar penugasan.");await commitCaseOperation(ctx.yearId,data.caseId,{id:actionOperationId,type:'action',data},ctx.session);ctx.rerender();},"Tindakan edukatif tersimpan.");
}

export async function renderDisciplinePoints(ctx) {
  const uid=ctx.session.user.uid;
  const studentMap=byId(ctx.master.students||[]);
  const allCases=scopedCases(ctx,await listNode(`boarding/cases/${ctx.yearId}`));
  const cases=(ctx.session.activeRole==="konselor"?allCases.filter(c=>c.assignedCounselorUid===uid):allCases)
    .filter(c=>!["selesai","tidak_terbukti"].includes(c.status));
  const eligible=cases.filter(c=>!c.finalPointTransactionId);
  let recent=[];
  for(const c of cases.slice(-20)){
    const rows=await listNode(`discipline/points/${ctx.yearId}/${c.studentId}`);
    recent.push(...rows.filter(r=>r.caseId===c.id).map(r=>({...r,studentId:c.studentId,caseId:c.id})));
  }
  recent.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  ctx.root.innerHTML=pageHeader("Finalisasi Poin","Poin kasus difinalisasi satu kali dari kasus aktif. Koreksi berikutnya tidak menimpa transaksi lama agar audit tetap utuh.")+`<div class="portal-grid two">
    ${panel("Finalisasi Poin Kasus",eligible.length?`<form id="pointForm" class="portal-form">${formRow("Kasus",select("caseId",`<option value=''>Pilih kasus...</option>${eligible.map(c=>`<option value='${c.id}'>${escapeHtml(studentMap[c.studentId]?.name||c.studentId)} · ${escapeHtml(c.category||"Kasus")}</option>`).join("")}`,"required"))}${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Poin Final",select("points","<option value=0>Bimbingan · 0</option><option value=-25>Ringan · -25</option><option value=-50>Sedang · -50</option><option value=-100>Berat · -100</option><option value=-200>Kritis · -200</option>"))}${formRow("Keterangan",textarea("description","","required"),true)}<div class="notice full">Nilai negatif = pelanggaran. Setelah difinalisasi, kasus tidak dapat diberi poin final kedua. Bila ada koreksi, buat transaksi koreksi terpisah melalui admin/otorisasi keuangan-operasional berikutnya.</div><div class="form-actions"><button class="btn btn-primary">Finalisasi Poin</button></div></form>`:`<div class="empty-state">Tidak ada kasus aktif yang menunggu finalisasi poin.</div>`)}
    ${panel("Poin Kasus Terbaru",recent.length?`<div class="stack-list">${recent.slice(0,20).map(r=>`<article class="list-card"><div><span>${escapeHtml(r.date||"—")}</span><strong>${escapeHtml(studentMap[r.studentId]?.name||r.studentId||"Santri")}</strong><small>${escapeHtml(r.description||"")}</small></div><span class="score-chip ${Number(r.points||0)>=0?"positive":""}">${Number(r.points||0)>0?"+":""}${escapeHtml(r.points||0)}</span></article>`).join("")}</div>`:`<div class="empty-state">Belum ada poin final dari kasus aktif Anda.</div>`)}
  </div>`;
  attachAsync(document.getElementById("pointForm"),async data=>{
    if(!cases.some(c=>c.id===data.caseId))throw Error('Kasus di luar penugasan.');
    await commitCaseOperation(ctx.yearId,data.caseId,{id:`final_${data.caseId}`,type:'points',data:{...data,points:Number(data.points)}},ctx.session);
    ctx.rerender();
  },"Poin kasus berhasil difinalisasi.");
}

export async function renderWarningLetter(ctx) {
  const students=boardingStudents(ctx);const allowed=new Set(students.map(s=>s.id));const letters=(await listNode(`boarding/warning_letters/${ctx.yearId}`)).filter(r=>allowed.has(r.studentId));
  ctx.root.innerHTML=pageHeader("Surat Peringatan","Pencatatan SP sebagai bagian eskalasi pembinaan formal.")+`<div class="portal-grid two">${panel("Buat SP",`<form id="spForm" class="portal-form">${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Santri",select("studentId",studentOptions(students),"required"))}${formRow("Tingkat",select("level","<option>SP1</option><option>SP2</option><option>SP3</option>"))}${formRow("Alasan",textarea("reason","","required"),true)}${formRow("Syarat Perbaikan",textarea("requirements"),true)}${formRow("Tampilkan ke Wali",select("parentVisible","<option value='false'>Tidak, internal dulu</option><option value='true'>Ya, tampilkan ke wali</option>"))}<div class="form-actions"><button class="btn btn-primary">Simpan SP</button></div></form>`)}${panel("Riwayat SP",letters.length?`<div class="stack-list">${letters.slice(-20).reverse().map(r=>`<article class="list-card"><div><span>${escapeHtml(r.date||"—")}</span><strong>${escapeHtml(byId(students)[r.studentId]?.name||r.studentId||"Santri")}</strong><small>${escapeHtml(r.reason||"")}</small></div>${badge(r.level||"SP")}</article>`).join("")}</div>`:`<div class="empty-state">Belum ada SP.</div>`)}</div>`;
  attachAsync(document.getElementById("spForm"),async data=>{data.parentVisible=data.parentVisible==="true";await pushRecord(`boarding/warning_letters/${ctx.yearId}`,{...data,counselorUid:ctx.session.user.uid},ctx.session.user.uid);ctx.rerender();},"Surat peringatan tercatat.");
}

export async function renderMentoringKpi(ctx) {
  const list=mentees(ctx);let sessions=[];for(const student of list){const rows=await listNode(`boarding/mentoring/${ctx.yearId}/${student.id}`);sessions.push(...rows);}
  const withTarget=sessions.filter(r=>r.target);const evaluated=withTarget.filter(r=>r.targetResultStatus&&r.targetResultStatus!=="BELUM_DINILAI");
  ctx.root.innerHTML=pageHeader("KPI & Evidence Guru Wali","Ringkasan evidence mentoring individu; tidak digunakan untuk ranking lintas role.")+`<div class="portal-metrics">${metric("Santri Binaan",String(list.length),"scope aktif","blue")}${metric("Sesi Mentoring",String(sessions.length),"periode aktif","cyan")}${metric("Target Dibuat",String(withTarget.length),"","violet")}${metric("Target Dievaluasi",String(evaluated.length),"hasil tercatat","mint")}${metric("Belum Dievaluasi",String(Math.max(0,withTarget.length-evaluated.length)),"perlu ditinjau","coral")}</div>`;
}

export async function renderMentoringGuide(ctx) {
  ctx.root.innerHTML=pageHeader("Panduan Guru Wali","Alur mentoring individu yang konsisten dalam satu rekam.")+panel("Workflow Mentoring",`<div class="guide-steps"><b>1.</b> Pilih santri binaan.<br><b>2.</b> Bahas self-assessment santri.<br><b>3.</b> Isi apresiasi/hal yang disyukuri.<br><b>4.</b> Pilih fokus <strong>PERBAIKI</strong> atau <strong>TINGKATKAN</strong>.<br><b>5.</b> Tetapkan target, Strong Why, dan strategi/How.<br><b>6.</b> Pada pertemuan berikutnya, buka Target & Hasil dan perbarui rekam yang sama menjadi TERCAPAI, CUKUP BERKEMBANG, atau BELUM TERCAPAI.</div>`);
}

export async function renderCaseEscalation(ctx) {
  const uid=ctx.session.user.uid;const cases=scopedCases(ctx,await listNode(`boarding/cases/${ctx.yearId}`)).filter(c=>c.assignedCounselorUid===uid && !["selesai","tidak_terbukti"].includes(c.status));const students=byId(ctx.master.students||[]);const rows=await listNode(`boarding/escalations/${ctx.yearId}`);
  ctx.root.innerHTML=pageHeader("Eskalasi Kasus","Gunakan saat kasus melampaui kewenangan atau membutuhkan keputusan level lebih tinggi.")+`<div class="portal-grid two">${panel("Buat Eskalasi",`<form id="escalationForm" class="portal-form">${formRow("Kasus",select("caseId",`<option value=''>Pilih...</option>${cases.map(c=>`<option value='${c.id}'>${escapeHtml(students[c.studentId]?.name||c.studentId)} · ${escapeHtml(c.category||"")}</option>`).join("")}`,"required"))}${formRow("Tujuan",select("targetLevel","<option value='konselor_madya'>Konselor Madya (dari Pemula)</option><option value='deputy_director'>Wakil Direktur (dari Madya)</option><option value='director'>Direktur (dari Madya)</option>"))}${formRow("Ringkasan Kebutuhan Keputusan",textarea("summary","","required"),true)}${formRow("Keputusan yang Dibutuhkan dari Pimpinan",textarea("decisionNeeded"),true)}<div class="form-actions"><button class="btn btn-primary">Kirim Eskalasi</button></div></form>`)}${panel("Riwayat Eskalasi",rows.length?`<div class="stack-list">${rows.filter(r=>r.createdByUid===uid).slice(-20).reverse().map(r=>`<article class="list-card"><div><span>${escapeHtml(r.targetLevel||"—")}</span><strong>${escapeHtml(r.summary||"Eskalasi")}</strong><small>${escapeHtml(r.status||"menunggu_arahan")}</small></div></article>`).join("")}</div>`:`<div class="empty-state">Belum ada eskalasi.</div>`)}</div>`;
  const escalationOperationId=crypto.randomUUID();attachAsync(document.getElementById("escalationForm"),async data=>{if(!cases.some(c=>c.id===data.caseId))throw Error('Kasus di luar penugasan.');await commitCaseOperation(ctx.yearId,data.caseId,{id:escalationOperationId,type:'escalation',data},ctx.session);ctx.rerender();},"Eskalasi dikirim.");
}

export async function renderCounselorSelf(ctx){return renderCounselorReflection(ctx);}

export async function renderCounselorKpi(ctx) {
  const uid=ctx.session.user.uid;const [cases,counselNode,actions,escalations,selfNode]=await Promise.all([listNode(`boarding/cases/${ctx.yearId}`),getNode(`boarding/counseling/${ctx.yearId}`),listNode(`boarding/case_actions/${ctx.yearId}`),listNode(`boarding/escalations/${ctx.yearId}`),getNode(`boarding/counselor_self_review/${ctx.yearId}/${uid}`)]);
  const mine=cases.filter(c=>c.assignedCounselorUid===uid);let sessions=0;Object.entries(counselNode||{}).forEach(([caseId,node])=>{if(mine.some(c=>c.id===caseId))sessions+=Object.keys(node||{}).length;});
  ctx.root.innerHTML=pageHeader("KPI & Evidence Konselor","Ringkasan metadata workflow. Narasi konseling tidak ditampilkan pada dashboard KPI.")+`<div class="portal-metrics">${metric("Kasus Diambil",String(mine.length),"","blue")}${metric("Kasus Aktif",String(mine.filter(c=>!["selesai","tidak_terbukti"].includes(c.status)).length),"","coral")}${metric("Kasus Selesai",String(mine.filter(c=>["selesai","tidak_terbukti"].includes(c.status)).length),"","mint")}${metric("Sesi Konseling",String(sessions),"metadata","violet")}${metric("Eskalasi",String(escalations.filter(e=>e.createdByUid===uid).length),"","cyan")}</div>`;
}

export async function renderCounselorGuide(ctx) {
  ctx.root.innerHTML=pageHeader("Panduan Kerja Konselor","Satu workflow kasus dari laporan sampai selesai.")+`<div class="portal-grid two">${panel("Alur Kasus",`<div class="guide-steps"><b>1.</b> Buka Kasus Masuk dan claim sesuai scope.<br><b>2.</b> Kasus berpindah ke Kasus Aktif.<br><b>3.</b> Lakukan tabayyun dan catat sesi konseling pada kasus yang sama.<br><b>4.</b> Catat tindakan edukatif terpisah dari narasi konseling.<br><b>5.</b> Finalisasi poin satu kali sesuai hasil proses.<br><b>6.</b> Evaluasi lalu tutup, atau eskalasi bila melampaui kewenangan.</div>`)}${panel("Kerahasiaan",`<div class="notice info">Narasi konseling bersifat sensitif. Jangan disebarkan ke role yang tidak membutuhkan. Dashboard KPI cukup menggunakan metadata workflow dan evidence proses.</div>`)}</div>`;
}

export async function renderCaseHistory(ctx) {
  const cases=scopedCases(ctx,await listNode(`boarding/cases/${ctx.yearId}`));const students=byId(ctx.master.students||[]);
  ctx.root.innerHTML=pageHeader("Riwayat Kasus","Seluruh kasus dan status penanganannya.")+table(["Tanggal","Santri","Kategori","Tingkat","Status","Konselor"],cases.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(r=>`<tr><td>${escapeHtml(r.date||"—")}</td><td><strong>${escapeHtml(students[r.studentId]?.name||r.studentId||"—")}</strong></td><td>${escapeHtml(r.category||"—")}</td><td>${badge(r.severity||"—")}</td><td>${badge(r.status||"—")}</td><td>${escapeHtml(r.assignedCounselorUid||"—")}</td></tr>`).join(""));
}
