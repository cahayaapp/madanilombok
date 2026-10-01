import { getNode, listNode, saveRecord, pushRecord, setNode } from "../repository.js";
import { studentsForClass, studentsForGroup, byId } from "../app-store.js";
import {
  pageHeader, panel, metric, table, formRow, input, textarea, select, selectOptions, studentOptions,
  statusOptions, attachAsync, serializeForm, escapeHtml, badge, today, toast
} from "./common.js";

const ownStaffId = ctx => ctx.session.profile.staffId || ctx.session.user.uid;

function scopedList(list = [], ids = []) {
  if (!Array.isArray(ids) || !ids.length) return list;
  const allowed = new Set(ids);
  return list.filter(item => allowed.has(item.id));
}

function scopedClasses(ctx) {
  return scopedList(ctx.master.classes || [], ctx.session.profile.classIds || []);
}

function scopedSubjects(ctx) {
  return scopedList(ctx.master.subjects || [], ctx.session.profile.subjectIds || []);
}

function scopedQuranGroups(ctx) {
  let groups = (ctx.master.groups || []).filter(g => {
    const values = [g.programType, g.type, g.sourceProgramType].map(v => String(v || "").toLowerCase()).join(" ");
    return ["tahfiz","tahfidz","tahsin","mutqin","halaqah","gema","qur'an","quran"].some(k => values.includes(k));
  });
  const groupIds = ctx.session.profile.groupIds || [];
  if (Array.isArray(groupIds) && groupIds.length) groups = scopedList(groups, groupIds);
  const gender = ctx.session.profile.genderScope || ctx.session.profile.scopeGender;
  if (gender === "L" || gender === "P") groups = groups.filter(g => !g.gender || g.gender === gender);
  return groups;
}

export async function renderTeacherAttendance(ctx) {
  const date = today();
  const staffKey = ownStaffId(ctx);
  const path = `academic/teacher_attendance/${ctx.yearId}/${staffKey}/${date}`;
  const rec = await getNode(path) || {};
  const historyNode = await getNode(`academic/teacher_attendance/${ctx.yearId}/${staffKey}`) || {};
  const history = Object.entries(historyNode).sort(([a],[b]) => b.localeCompare(a)).slice(0,20);
  ctx.root.innerHTML = pageHeader("Presensi Guru", "Presensi hadir, pulang, dan status harian guru/mentor.") + `
    <div class="portal-grid two">
      ${panel("Hari Ini", `
        <div class="attendance-hero">
          <div><span>${date}</span><strong>${rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "Belum hadir"}</strong><small>${rec.status || "Belum ada presensi"}</small></div>
          <div class="attendance-actions">
            <button class="btn btn-primary" id="checkInBtn">${rec.checkIn ? "Perbarui Kehadiran" : "Hadir Sekarang"}</button>
            <button class="btn btn-secondary" id="checkOutBtn" ${!rec.checkIn ? "disabled" : ""}>Pulang</button>
          </div>
        </div>
        <form id="teacherStatusForm" class="inline-form">
          <select name="status"><option ${rec.status==="Hadir"?"selected":""}>Hadir</option><option ${rec.status==="Izin"?"selected":""}>Izin</option><option ${rec.status==="Sakit"?"selected":""}>Sakit</option><option ${rec.status==="Dinas"?"selected":""}>Dinas</option></select>
          <input name="note" placeholder="Catatan opsional" value="${escapeHtml(rec.note || "")}">
          <button class="btn btn-secondary">Simpan Status</button>
        </form>
      `)}
      ${panel("Ringkasan", `<div class="portal-metrics compact">
        ${metric("Status", rec.status || "Belum presensi", rec.checkOut ? "Sudah pulang" : "", "blue")}
        ${metric("Jam Masuk", rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "—", "", "cyan")}
        ${metric("Jam Pulang", rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "—", "", "violet")}
      </div>`) }
    </div>
    <div style="margin-top:18px">${table(["Tanggal","Status","Masuk","Pulang","Catatan"], history.map(([d,r]) => `<tr><td>${escapeHtml(d)}</td><td>${badge(r.status || "—")}</td><td>${r.checkIn?new Date(r.checkIn).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"—"}</td><td>${r.checkOut?new Date(r.checkOut).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"—"}</td><td>${escapeHtml(r.note || "—")}</td></tr>`).join(""))}</div>`;
  document.getElementById("checkInBtn")?.addEventListener("click", async () => {
    await setNode(path, { ...rec, status: rec.status || "Hadir", checkIn: Date.now(), date, staffId: staffKey, updatedAt: Date.now() });
    toast("Presensi masuk tersimpan."); ctx.rerender();
  });
  document.getElementById("checkOutBtn")?.addEventListener("click", async () => {
    await setNode(path, { ...rec, checkOut: Date.now(), updatedAt: Date.now() });
    toast("Jam pulang tersimpan."); ctx.rerender();
  });
  attachAsync(document.getElementById("teacherStatusForm"), async data => {
    await setNode(path, { ...rec, ...data, date, staffId: staffKey, updatedAt: Date.now() });
    ctx.rerender();
  });
}

export async function renderStudentAttendance(ctx) {
  const classes = scopedClasses(ctx);
  ctx.root.innerHTML = pageHeader("Presensi Santri", "Pilih kelas dan tanggal, lalu catat kehadiran santri.") + `
    ${panel("Pilih Kelas", `<div class="filter-row"><select id="attClass">${selectOptions(classes)}</select><input id="attDate" type="date" value="${today()}"><button class="btn btn-primary" id="loadAttendance">Tampilkan</button></div>`)}
    <div id="attendanceWorkspace" style="margin-top:18px"></div>`;
  const workspace = document.getElementById("attendanceWorkspace");
  document.getElementById("loadAttendance")?.addEventListener("click", async () => {
    const classId = document.getElementById("attClass").value;
    const date = document.getElementById("attDate").value;
    if (!classId) return toast("Pilih kelas terlebih dahulu.", "warning");
    const students = studentsForClass(classId, ctx.master);
    const saved = await getNode(`academic/student_attendance/${ctx.yearId}/${classId}/${date}`) || {};
    workspace.innerHTML = pageHeader("Daftar Kehadiran", `${students.length} santri`, `<button class="btn btn-primary" id="saveAttendance">Simpan Presensi</button>`) + table(
      ["Santri","Status","Catatan"],
      students.map(s => `<tr data-student="${s.id}"><td><strong>${escapeHtml(s.name)}</strong><br><small class="muted">${escapeHtml(s.studentNo || s.id)}</small></td><td><select class="att-status">${statusOptions(saved[s.id]?.status || "Hadir")}</select></td><td><input class="att-note table-input" value="${escapeHtml(saved[s.id]?.note || "")}" placeholder="Opsional"></td></tr>`).join("")
    );
    document.getElementById("saveAttendance")?.addEventListener("click", async () => {
      const payload={};
      workspace.querySelectorAll("tr[data-student]").forEach(tr => {
        payload[tr.dataset.student] = { studentId:tr.dataset.student, classId, date, status:tr.querySelector(".att-status").value, note:tr.querySelector(".att-note").value, recordedBy:ctx.session.user.uid, updatedAt:Date.now() };
      });
      await setNode(`academic/student_attendance/${ctx.yearId}/${classId}/${date}`, payload);
      toast("Presensi santri tersimpan.");
    });
  });
}

export async function renderQuran(ctx) {
  const groups = scopedQuranGroups(ctx);
  ctx.root.innerHTML = pageHeader("Tahsin Tahfiz", "Setoran, progres, mutu bacaan, dan catatan mentor Al-Qur'an.") + `
    <div class="portal-grid two">
      ${panel("Input Setoran", `<form id="quranForm" class="portal-form">
        ${formRow("Kelompok", select("groupId", selectOptions(groups), "id='quranGroup' required"))}
        ${formRow("Santri", select("studentId", `<option value=''>Pilih kelompok dahulu...</option>`, "id='quranStudent' required"))}
        ${formRow("Tanggal", input("date", today(), "date", "required"))}
        ${formRow("Jenis", select("type", `<option>Tahfiz</option><option>Tahsin</option><option>Murajaah</option><option>Mutqin</option>`))}
        ${formRow("Surah/Juz", input("portion", "", "text", "placeholder='Contoh: Al-Baqarah 1-20 / Juz 30' required"), true)}
        ${formRow("Nilai/Skor", input("score", "", "number", "min='0' max='100'"))}
        ${formRow("Kualitas", select("quality", `<option>Baik Sekali</option><option>Baik</option><option>Cukup</option><option>Perlu Perbaikan</option>`))}
        ${formRow("Catatan Mentor", textarea("note", "", "placeholder='Kesalahan, fokus perbaikan, atau capaian'"), true)}
        <div class="form-actions"><button class="btn btn-primary" type="submit">Simpan Setoran</button></div>
      </form>`)}
      ${panel("Riwayat", `<div id="quranHistory" class="empty-state">Pilih santri untuk melihat riwayat.</div>`)}
    </div>`;
  const groupEl=document.getElementById("quranGroup"), studentEl=document.getElementById("quranStudent"), hist=document.getElementById("quranHistory");
  const refreshStudents=()=>{
    const students=studentsForGroup(groupEl.value,ctx.master);
    studentEl.innerHTML=studentOptions(students);
  };
  groupEl?.addEventListener("change",refreshStudents);
  studentEl?.addEventListener("change", async()=>{
    if(!groupEl.value||!studentEl.value) return;
    const node=await getNode(`academic/quran_records/${ctx.yearId}/${groupEl.value}/${studentEl.value}`)||{};
    const rows=Object.entries(node).sort(([,a],[,b])=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,30);
    hist.className="";
    hist.innerHTML=table(["Tanggal","Jenis","Porsi","Skor","Kualitas","Catatan"],rows.map(([,r])=>`<tr><td>${escapeHtml(r.date||"—")}</td><td>${badge(r.type||"—")}</td><td>${escapeHtml(r.portion||"—")}</td><td>${escapeHtml(r.score||"—")}</td><td>${escapeHtml(r.quality||"—")}</td><td>${escapeHtml(r.note||"—")}</td></tr>`).join(""),640);
  });
  attachAsync(document.getElementById("quranForm"), async data=>{
    await pushRecord(`academic/quran_records/${ctx.yearId}/${data.groupId}/${data.studentId}`, {...data, mentorUid:ctx.session.user.uid, staffId:ctx.session.profile.staffId||null}, ctx.session.user.uid);
    document.getElementById("quranStudent").dispatchEvent(new Event("change"));
  },"Setoran Al-Qur'an tersimpan.");
}

export async function renderGrades(ctx) {
  const classes=scopedClasses(ctx), subjects=scopedSubjects(ctx);
  ctx.root.innerHTML=pageHeader("Nilai", "Input nilai per kelas, mata pelajaran, dan periode. Penanda remedial disimpan per record.")+`
    ${panel("Filter Penilaian", `<div class="filter-row wrap"><select id="gradeClass">${selectOptions(classes)}</select><select id="gradeSubject">${selectOptions(subjects)}</select><select id="gradePeriod"><option value="bulanan">Bulanan</option><option value="triwulan-1">Triwulan 1</option><option value="triwulan-2">Triwulan 2</option><option value="semester-1">Semester 1</option><option value="semester-2">Semester 2</option></select><input id="gradeDate" type="date" value="${today()}"><button class="btn btn-primary" id="loadGrades">Tampilkan</button></div>`)}
    <div id="gradeWorkspace" style="margin-top:18px"></div>`;
  document.getElementById("loadGrades")?.addEventListener("click", async()=>{
    const classId=document.getElementById("gradeClass").value, subjectId=document.getElementById("gradeSubject").value, period=document.getElementById("gradePeriod").value, date=document.getElementById("gradeDate").value;
    if(!classId||!subjectId) return toast("Pilih kelas dan mata pelajaran.","warning");
    const students=studentsForClass(classId,ctx.master); const saved=await getNode(`academic/grades/${ctx.yearId}/${classId}/${subjectId}/${period}`)||{};
    const ws=document.getElementById("gradeWorkspace");
    ws.innerHTML=pageHeader("Daftar Nilai",`${students.length} santri`,`<button id="saveGrades" class="btn btn-primary">Simpan Nilai</button>`)+table(["Santri","Nilai","Remedial","Catatan"],students.map(s=>`<tr data-student="${s.id}"><td><strong>${escapeHtml(s.name)}</strong></td><td><input class="grade-score table-input" type="number" min="0" max="100" value="${escapeHtml(saved[s.id]?.score??"")}"></td><td><input class="grade-remedial" type="checkbox" ${saved[s.id]?.remedial?"checked":""}></td><td><input class="grade-note table-input" value="${escapeHtml(saved[s.id]?.note||"")}"></td></tr>`).join(""));
    document.getElementById("saveGrades")?.addEventListener("click",async()=>{
      const payload={}; ws.querySelectorAll("tr[data-student]").forEach(tr=>{payload[tr.dataset.student]={studentId:tr.dataset.student,classId,subjectId,period,date,score:Number(tr.querySelector(".grade-score").value||0),remedial:tr.querySelector(".grade-remedial").checked,note:tr.querySelector(".grade-note").value,teacherUid:ctx.session.user.uid,updatedAt:Date.now()};});
      await setNode(`academic/grades/${ctx.yearId}/${classId}/${subjectId}/${period}`,payload); toast("Nilai tersimpan.");
    });
  });
}

export async function renderSchedule(ctx) {
  const classMap=byId(ctx.master.classes||[]), subjectMap=byId(ctx.master.subjects||[]);
  let schedules=(ctx.master.academicSchedules||[]); const classIds=ctx.session.profile.classIds||[], subjectIds=ctx.session.profile.subjectIds||[]; if(Array.isArray(classIds)&&classIds.length){const allow=new Set(classIds);schedules=schedules.filter(x=>allow.has(x.classId));} if(Array.isArray(subjectIds)&&subjectIds.length){const allow=new Set(subjectIds);schedules=schedules.filter(x=>!x.subjectId||allow.has(x.subjectId));} schedules=schedules.sort((a,b)=>(a.day||"").localeCompare(b.day||"") || (a.startTime||"").localeCompare(b.startTime||""));
  const issueNote = schedules.every(x=>x.unitId==="UNIT-SD") ? `<div class="notice info">Baseline jadwal terstruktur yang tersedia saat ini terutama SD. Jadwal SMP/SMK perlu dilengkapi dari sumber final sebelum produksi.</div>` : "";
  ctx.root.innerHTML=pageHeader("Jadwal Pelajaran","Jadwal akademik dari master data Al-Madani.")+issueNote+`<div style="margin-top:14px">${table(["Hari","Waktu","Kelas","Mata Pelajaran/Kegiatan","Jenis"],schedules.map(r=>`<tr><td>${badge(r.day||"—")}</td><td><strong>${escapeHtml(`${r.startTime||""}${r.endTime?`–${r.endTime}`:""}`)}</strong></td><td>${escapeHtml(classMap[r.classId]?.name||"—")}</td><td>${escapeHtml(subjectMap[r.subjectId]?.name||r.activityName||"—")}</td><td>${escapeHtml(r.type||"—")}</td></tr>`).join(""),720)}</div>`;
}

export async function renderLessonPlans(ctx) {
  const staffId=ownStaffId(ctx); const plans=await listNode(`academic/lesson_plans/${ctx.yearId}/${staffId}`);
  const classes=scopedClasses(ctx), subjects=scopedSubjects(ctx); const classMap=byId(classes), subjectMap=byId(subjects);
  ctx.root.innerHTML=pageHeader("Rencana Pembelajaran (Materi)","Rencana materi, tujuan, strategi, dan asesmen sebelum pembelajaran.")+`
    <div class="portal-grid two">
      ${panel("Buat Rencana",`<form id="lessonPlanForm" class="portal-form">
        ${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Kelas",select("classId",selectOptions(classes),"required"))}
        ${formRow("Mata Pelajaran",select("subjectId",selectOptions(subjects),"required"))}${formRow("Topik/Materi",input("topic","","text","required"))}
        ${formRow("Tujuan Pembelajaran",textarea("objectives","","required"),true)}${formRow("Strategi/Metode",textarea("method"),true)}
        ${formRow("Media/Sumber",textarea("resources"),true)}${formRow("Asesmen",textarea("assessment"),true)}
        ${formRow("Status",select("status","<option value='draft'>Draft</option><option value='ready'>Siap Dilaksanakan</option><option value='done'>Selesai</option>"))}
        <div class="form-actions"><button class="btn btn-primary">Simpan Rencana</button></div>
      </form>`)}
      ${panel("Rencana Saya", plans.length ? `<div class="stack-list">${plans.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).map(p=>`<article class="list-card"><div><span>${escapeHtml(p.date||"—")}</span><strong>${escapeHtml(p.topic||"Tanpa judul")}</strong><small>${escapeHtml(classMap[p.classId]?.name||"—")} · ${escapeHtml(subjectMap[p.subjectId]?.name||"—")}</small></div>${badge(p.status||"draft")}</article>`).join("")}</div>` : `<div class="empty-state">Belum ada rencana pembelajaran.</div>`)}
    </div>`;
  attachAsync(document.getElementById("lessonPlanForm"), async data=>{await pushRecord(`academic/lesson_plans/${ctx.yearId}/${staffId}`,data,ctx.session.user.uid);ctx.rerender();},"Rencana pembelajaran tersimpan.");
}
