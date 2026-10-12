import {mergeConsecutiveSchedules} from './teacher/model.js';
import {getNode} from './repository.js';
import {flattenEvidence} from './management-operations.js';
import {monitorScope,attendanceSummary,learningRows,isLate,isAbsent,caseHandled,teacherMissing} from './leadership-monitor-model.js';
import {pageHeader,panel,escapeHtml as e,empty} from './modules/common.js';
import {localDate} from './role-experience.js';
export {MONITOR_VIEWS} from './leadership-monitor-model.js';
import {MONITOR_VIEWS} from './leadership-monitor-model.js';
export async function renderLeadershipMonitor(ctx,route){
 const scope=monitorScope(ctx.session,ctx.master),[title,kind]=MONITOR_VIEWS[route];
 if(scope.school!==route.startsWith('school-'))throw Error('Laporan di luar unit Anda.');
 const names=new Map(['students','staff','classes','subjects','rooms','programs'].flatMap(k=>(ctx.master[k]||[]).map(r=>[r.id,r.name])));
 const today=localDate(),week=new Date(Date.parse(today+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 let records=[];
 if(kind==='mentoring')records=(await Promise.all(scope.students.map(async s=>flattenEvidence(await getNode(`boarding/mentoring/${ctx.yearId}/${s.id}`),r=>!!r.date&&!!r.target).map(r=>({...r,studentId:s.id}))))).flat();
 else if(kind==='student')records=learningRows(flattenEvidence(await getNode(`academic/learning_sessions/${ctx.yearId}`),r=>!!r.students&&!!r.date),scope);
 else if(kind==='boarding')records=flattenEvidence(await getNode(`boarding/program_attendance/${ctx.yearId}`),r=>!!r.studentId&&!!r.date).filter(r=>scope.studentIds.has(r.studentId)&&r.stage==='FINAL');
 else if(kind==='cases')records=flattenEvidence(await getNode(`boarding/cases/${ctx.yearId}`),r=>!!r.studentId&&!!r.status).filter(r=>scope.studentIds.has(r.studentId));
 else records=flattenEvidence(await getNode(`academic/teaching_attendance/${ctx.yearId}`),r=>!!r.scheduleId&&!!r.date).filter(r=>scope.classIds.has(r.classId)||(r.classIds||[]).some(id=>scope.classIds.has(id)));
 ctx.root.innerHTML=pageHeader(title,scope.school?'Data unit sekolah Anda.':'Data asrama '+(scope.gender==='L'?'putra.':'putri.'))+panel('Periode',`<div class="filter-row wrap"><label>Dari<input type="date" name="from" value="${kind==='mentoring'?week:today}"></label><label>Sampai<input type="date" name="to" value="${today}" max="${today}"></label></div>`)+'<div id="monitorContent" aria-live="polite"></div>';
 const name=id=>names.get(id)||id||'—';
 function draw(){const from=ctx.root.querySelector('[name=from]').value,to=ctx.root.querySelector('[name=to]').value,body=ctx.root.querySelector('#monitorContent');if(!from||!to||from>to||Date.parse(to)-Date.parse(from)>366*86400000){body.textContent='Pilih rentang tanggal yang valid.';return;}
 const rows=records.filter(r=>{const date=r.date||new Date(r.createdAt||0).toISOString().slice(0,10);return date>=from&&date<=to;});
 if(kind==='mentoring'){body.innerHTML=panel(`${new Set(rows.map(r=>r.mentorStaffId||r.mentorUid)).size} Guru Wali · ${new Set(rows.map(r=>r.studentId)).size} siswa · ${rows.length} sesi`,rows.map(r=>`<article class="workspace-record"><h3>${e(name(r.mentorStaffId)||r.authorName)} → ${e(name(r.studentId))}</h3><p>${e(r.date)} · ${e(name(ctx.master.classAssignments?.[r.studentId]?.classId))}</p>${['appreciation','target','strongWhy','strategy','note','targetResult'].map((k,i)=>r[k]?`<p><b>${['Apresiasi','Target','Strong Why','Strategi','Catatan','Hasil'][i]}:</b> ${e(r[k])}</p>`:'').join('')}<p>${e(r.targetResultStatus||'Belum dinilai')}</p><details><summary>Hasil wawancara</summary>${Object.values(r.clarification?.dimensions||{}).map(d=>`<p>${e(d.name)}: ${e(d.note||'')} · Jawaban ${e(Object.values(d.values||{}).join(', '))}</p>`).join('')}</details></article>`).join('')||empty('Belum ada sesi mentoring dalam periode ini.'));return;}
 if(kind==='cases'){const handled=rows.filter(caseHandled).length;body.innerHTML=panel(`${rows.length} kasus · ${handled} ditangani · ${rows.length?Math.round(handled/rows.length*100):'—'}%`,rows.map(r=>`<article class="workspace-record"><h3>${e(name(r.studentId))}</h3><p>${e(r.date||'')} · ${e(r.status)} · ${caseHandled(r)?'Sudah ditangani':'Belum ada penanganan'}</p><p>${e(r.title||r.category||'Kasus santri')}</p></article>`).join('')||empty('Belum ada kasus dalam periode ini.'));return;}
 const missing=kind==='teacher'?teacherMissing(mergeConsecutiveSchedules((ctx.master.academicSchedules||[]).filter(s=>s.status!=='inactive'&&!s.isExample&&(!s.academicYearId||s.academicYearId===ctx.yearId)&&scope.classIds.has(s.classId))),records,from,to):[];
 const summary=attendanceSummary(rows),late=route.endsWith('punctuality'),selected=rows.filter(r=>!r.attendanceManagedBy&&(late?isLate(r):isAbsent(r))),value=late?summary.punctuality:kind==='teacher'?(summary.present+missing.length?Math.round(summary.present/(summary.present+missing.length)*1000)/10:null):summary.attendance;
 const context=r=>kind==='boarding'?`${name(ctx.master.roomAssignments?.[r.studentId]?.roomId)} · ${name(r.programId)}`:`${name(ctx.master.classAssignments?.[r.studentId]?.classId||r.classId)} · ${name(r.subjectId)}`;
 body.innerHTML=panel(`${value===null?'—':value+'%'} ${late?'tepat waktu':'kehadiran'}`,`<p>${summary.present} hadir (termasuk ${summary.late} terlambat) · ${summary.absent} tidak hadir · ${summary.total} rekam.</p><p>${kind==='teacher'?'Persentase guru membandingkan hadir tercatat dengan hadir tercatat ditambah pertemuan selesai yang belum dipresensi':'Persentase siswa dihitung dari rekam presensi final'}; ketepatan waktu dari yang hadir. ${summary.unknown} rekam belum dinilai / dikelola GEMA dikecualikan. Tidak adanya catatan bukan bukti ketidakhadiran.</p>`)+panel(late?'Daftar Terlambat':'Daftar Tidak Hadir',selected.map(r=>`<article class="workspace-record"><h3>${e(name(r.studentId||r.staffId))}</h3><p>${e(r.date)} · ${e(context(r))}</p><p>${e(r.status)}${r.lateMinutes?` · ${Number(r.lateMinutes)} menit`:''}</p></article>`).join('')||empty('Tidak ada rekam sesuai kategori.'));
 if(kind==='teacher'){
 body.innerHTML+=panel('Kehadiran terhadap jadwal selesai',`<p>${summary.present+missing.length?Math.round(summary.present/(summary.present+missing.length)*1000)/10+'%':'—'} tercatat hadir · ${missing.length} pertemuan belum memiliki presensi. Catatan yang belum tersedia perlu diverifikasi, bukan otomatis Alfa.</p>`)+panel(`${missing.length} pertemuan selesai belum ada presensi guru`,missing.map(r=>`<article class="workspace-record"><h3>${e(name(r.staffId))}</h3><p>${e(r.date)} ${e(r.startTime)}–${e(r.endTime)} · ${e(context(r))}</p><p>Belum presensi — verifikasi kehadiran atau izin.</p></article>`).join('')||empty('Semua pertemuan selesai sudah memiliki presensi atau tidak ada jadwal.'));
 }
 }
 ctx.root.querySelectorAll('input').forEach(i=>i.onchange=draw);draw();
}
