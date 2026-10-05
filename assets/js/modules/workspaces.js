import {renderAccountProfile} from '../profile.js';
import {renderWorkFollowups} from '../work-followups.js';
import {renderManagementReports} from '../management-reports.js';
import {renderResidentStaff,renderStaffWorship} from '../staff-worship.js';
import {OPERATION_VIEWS,renderManagementOperations} from '../management-operations.js';
import {renderRegistry,renderManagementPeople,renderCaseDecisions} from '../management-registry.js';
import {getNode,listNode,createWorkspaceRecord,transitionWorkspaceRecord} from '../repository.js';
import {canAccess,ROLE_LABELS} from '../permissions.js';
import {ROLE_EXPERIENCE,filterScopedStudents,localDate} from '../role-experience.js';
import {MANAGEMENT_ROLES,LEADERSHIP_ROLES} from '../role-workspace-catalog.js';
import {managementScope,canSeeManagement,validateTransition,escalationTarget,FINDING_TRANSITIONS,FINDING_LABELS,requireAssignedId} from '../workflow-model.js';
import {pageHeader,panel,metric,table,formRow,input,textarea,select,selectOptions,studentOptions,attachAsync,escapeHtml as e,badge,empty,toast} from './common.js';
const uid=ctx=>ctx.session.user.uid;
const role=ctx=>ctx.session.activeRole;
const own=(ctx,r)=>r.createdBy===uid(ctx);
const staffKey=ctx=>ctx.session.profile.staffId||uid(ctx);
function authorize(ctx,route) {
  if(!ctx.session.roles.includes(role(ctx))||!canAccess(`workspace.${route}`,[role(ctx)]))throw new Error('Akses role tidak tersedia.');
  if(!ctx.yearId)throw new Error('Tahun ajaran aktif belum diatur.');
}
function pathFor(ctx,name){return `workspaces/${ctx.yearId}/${name}`;}
function recordList(rows,fields) {
  return rows.length?`<div class="workspace-records">${rows.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(r=>`<article class="workspace-record"><div class="workspace-record-head"><h3>${e(r.title||r.studentName||r.date||'Catatan')}</h3>${badge(FINDING_LABELS[r.status]||r.status||r.date||'Tercatat')}</div>${fields.map(([key,label])=>r[key]?`<p><strong>${e(label)}:</strong> ${e(r[key])}</p>`:'').join('')}<small>${e(r.date||'')} · ${e(r.authorName||'MadaniApp')}</small></article>`).join('')}</div>`:empty('Belum ada catatan pada scope ini.');
}
function payload(ctx,data){return {...data,academicYearId:ctx.yearId,role:role(ctx),authorName:ctx.session.profile.name||ctx.session.profile.displayName||'Pengguna',date:data.date||localDate()};}
function save(ctx,collection,data){return createWorkspaceRecord(pathFor(ctx,collection),payload(ctx,data),uid(ctx));}
function form(ctx,id,title,fields,saveLabel='Simpan'){
 return panel(title,`<form id="${id}" class="portal-form">${fields}<div class="form-actions"><button type="submit" class="btn btn-primary">${saveLabel}</button></div></form>`);
}
const required='required maxlength="3000"';
const textField=(label,name,full=true)=>formRow(label,textarea(name,'',required),full);

export async function renderProfile(ctx){return renderAccountProfile(ctx);}
export async function renderGuide(ctx){
 const exp=ROLE_EXPERIENCE[role(ctx)]||{};
 const guides={guru_mapel:['Lihat jadwal dan catat presensi Anda.','Catat kehadiran santri dan capaian materi.','Input nilai, tindak lanjuti kebutuhan belajar, lalu lengkapi refleksi.'],mentor_tahsin_tahfiz:['Pilih halaqah yang ditugaskan.','Catat setoran, mutu bacaan dan fokus perbaikan santri.','Tinjau tindak lanjut dan evidence pendampingan.'],naqib:['Kawal program hari ini dan catat presensi.','Catat laporan, inisiatif, dan perkembangan santri.','Laporkan kasus kepada Konselor; jangan menetapkan konsekuensi formal.'],guru_wali:['Buka santri binaan dan refleksi perkembangannya.','Catat fokus, target, Strong Why, serta strategi.','Perbarui hasil pada rekam mentoring yang sama.'],konselor:['Ambil kasus sesuai scope.','Lakukan tabayyun, konseling, dan tindakan edukatif.','Evaluasi, finalisasi poin satu kali, lalu tutup atau eskalasi.'],wali_santri:['Pilih Ananda yang terhubung ke akun.','Tinjau laporan dan informasi pesantren.','Ajukan izin atau kirim pesan melalui layanan wali.'],kasir:['Pastikan unit kasir Putra/Putri benar.','Periksa produk, stok, saldo belanja dan PIN transaksi.','Gunakan pembatalan/refund berjejak audit bila terjadi koreksi.']};
 const steps=guides[role(ctx)]||['Tinjau kondisi dan evidence dalam scope Anda.','Verifikasi temuan, tentukan tindakan dan penanggung jawab.','Evaluasi hasil tindakan sebelum menutup; eskalasi bila melampaui kewenangan.'];
 ctx.root.innerHTML=pageHeader('Panduan & Manual',exp.title||'Ruang kerja sesuai role.')+panel('Alur Kerja',`<ol class="workspace-guide">${steps.map(step=>`<li>${e(step)}</li>`).join('')}</ol><p class="role-hint">Belum ada data berarti belum tercatat, bukan otomatis pelanggaran atau nilai nol. Pesan dan narasi kasus hanya dibagikan kepada pihak yang berwenang.</p>`);
}
export async function renderWorkSchedule(ctx){
 authorize(ctx,'work-schedule');
 const rows=(await listNode(pathFor(ctx,'schedules'))).filter(r=>own(ctx,r)&&r.role===role(ctx));
 ctx.root.innerHTML=pageHeader('Jadwal & Ritme Kerja','Agenda pribadi sesuai role aktif, terpisah dari master jadwal akademik.')+form(ctx,'agendaForm','Tambah Agenda',formRow('Judul',input('title','','text','required maxlength="160"'))+formRow('Tanggal',input('date',localDate(),'date','required'))+formRow('Waktu mulai',input('startTime','','time','required'))+formRow('Waktu selesai',input('endTime','','time','required'))+textField('Rencana / tujuan','description'))+panel('Agenda Anda',recordList(rows,[['startTime','Mulai'],['endTime','Selesai'],['description','Rencana']]));
 attachAsync(ctx.root.querySelector('#agendaForm'),async data=>{if(data.endTime<=data.startTime)throw new Error('Waktu selesai harus setelah waktu mulai.');await save(ctx,'schedules',data);await ctx.rerender();});
}
export async function renderWorkMessages(ctx){
 authorize(ctx,'work-messages');
 const [users,messages]=await Promise.all([listNode('users'),listNode(pathFor(ctx,'messages'))]);
 const recipients=users.filter(u=>u.id!==uid(ctx)&&u.active!==false&&u.role!=='wali_santri'&&(u.role||u.roles||u.roleFlags)).map(u=>({id:u.id,name:u.name||u.displayName||'Pengguna internal'}));
 const rows=messages.filter(m=>m.senderUid===uid(ctx)||m.recipientUid===uid(ctx));
 ctx.root.innerHTML=pageHeader('Pesan Internal','Pesan antar akun internal; komunikasi wali tetap berada pada portal Wali Santri.')+form(ctx,'staffMessageForm','Kirim Pesan',formRow('Penerima',select('recipientUid',selectOptions(recipients),'required'))+formRow('Subjek',input('title','','text','required maxlength="160"'))+textField('Pesan','message'),'Kirim')+panel('Percakapan Anda',recordList(rows,[['message','Pesan'],['recipientName','Penerima']]));
 attachAsync(ctx.root.querySelector('#staffMessageForm'),async data=>{requireAssignedId(data.recipientUid,recipients,'Penerima');await save(ctx,'messages',{...data,senderUid:uid(ctx),recipientName:recipients.find(r=>r.id===data.recipientUid).name});await ctx.rerender();},'Pesan tersimpan.');
}
export async function renderEducationCalendar(ctx){
 authorize(ctx,'education-calendar');
 const rows=await listNode('parent/calendar');
 const visible=rows.filter(r=>!r.unitId||!ctx.session.profile.unitIds?.length||ctx.session.profile.unitIds.includes(r.unitId));
 ctx.root.innerHTML=pageHeader('Kalender Pendidikan','Agenda dari kalender pesantren; tidak membuat kalender duplikat.')+panel('Agenda',recordList(visible,[['startDate','Mulai'],['endDate','Selesai'],['description','Keterangan']]));
}
export async function renderTeacherWriting(ctx){
 authorize(ctx,'teacher-writing');
 const rows=(await listNode(pathFor(ctx,'writings'))).filter(r=>own(ctx,r));
 ctx.root.innerHTML=pageHeader('Guru Menulis','Simpan karya, refleksi pembelajaran, dan tautan evidence. Tulisan tidak otomatis dipublikasikan.')+form(ctx,'writingForm','Tulisan Baru',formRow('Judul',input('title','','text','required maxlength="160"'))+textField('Isi tulisan','body')+formRow('Tautan evidence (opsional)',input('evidenceUrl','','url')))+panel('Tulisan Anda',recordList(rows,[['body','Tulisan'],['evidenceUrl','Evidence']]));
 attachAsync(ctx.root.querySelector('#writingForm'),async data=>{await save(ctx,'writings',{...data,status:'draft'});await ctx.rerender();});
}
export async function renderTeacherAssessment(ctx){
 authorize(ctx,'teacher-assessment');
 const rows=(await listNode(pathFor(ctx,'teacher_assessments'))).filter(r=>own(ctx,r));
 const dims=[['cintaAllah','Cinta Allah (Spiritual)'],['akhlak','Akhlak Mulia (Relasional)'],['hati','Hati Bersih (Emosional)'],['akal','Akal Cerdas (Intelektual)'],['fisik','Fisik Berdaya (Fisik)'],['punctuality','Hadir tepat waktu'],['attendance','Tidak bolos jadwal'],['kkm','Ketuntasan KKM'],['tahfiz','Setoran Tahfiz kelas'],['scoreInput','Disiplin input nilai'],['cleanliness','Kebersihan kelas'],['orderliness','Ketertiban santri'],['curriculum','Target kurikulum']];
 const ratings=Array.from({length:5},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
 ctx.root.innerHTML=pageHeader('Self Asesmen Guru','Refleksi pekanan 1–5; tidak menggantikan KPI objektif dari evidence kerja.')+form(ctx,'assessmentForm','Refleksi Pekan Ini',formRow('Pekan',input('week','','week','required'))+dims.map(([id,label])=>formRow(label,select(id,`<option value="">Pilih 1–5</option>${ratings}`,'required'))).join('')+textField('Keberhasilan / hal yang disyukuri','success')+textField('Fokus perbaikan berikutnya','focus'))+panel('Riwayat Refleksi',recordList(rows,[['week','Pekan'],['success','Keberhasilan'],['focus','Fokus perbaikan']]));
 attachAsync(ctx.root.querySelector('#assessmentForm'),async data=>{for(const [id] of dims){data[id]=Number(data[id]);if(data[id]<1||data[id]>5)throw new Error('Nilai refleksi harus 1–5.');}await save(ctx,'teacher_assessments',data);await ctx.rerender();});
}
export async function renderAcademicFollowup(ctx){
 authorize(ctx,'academic-followup');
 const students=filterScopedStudents(ctx.master,ctx.session.profile,role(ctx));
 const rows=(await listNode(pathFor(ctx,'academic_followups'))).filter(r=>own(ctx,r));
 ctx.root.innerHTML=pageHeader('Tindak Lanjut Akademik','Target perbaikan, strategi, dan hasil pada rekam yang sama.')+form(ctx,'followupForm','Rencana Perbaikan',formRow('Santri',select('studentId',studentOptions(students),'required'))+formRow('Tanggal evaluasi',input('dueDate',localDate(),'date','required'))+textField('Dasar / evidence kebutuhan belajar','evidence')+textField('Target perbaikan','target')+textField('Strategi perbaikan','strategy'))+panel('Tindak Lanjut Anda',rows.length?rows.map(r=>`<article class="workspace-record"><h3>${e(r.studentName||r.studentId)}</h3>${badge(r.status)}<p><strong>Target:</strong> ${e(r.target)}</p><p>${e(r.strategy)}</p><p><strong>Hasil:</strong> ${e(r.result||'Belum dievaluasi')}</p>${r.status!=='Selesai'?`<form data-followup="${e(r.id)}" class="portal-form">${formRow('Hasil / perkembangan',textarea('result','',required),true)}${formRow('Status',select('status','<option>Dalam Proses</option><option>Selesai</option>'))}<button type="submit" class="btn btn-secondary">Simpan perkembangan</button></form>`:''}</article>`).join(''):empty());
 attachAsync(ctx.root.querySelector('#followupForm'),async data=>{requireAssignedId(data.studentId,students,'Santri');await save(ctx,'academic_followups',{...data,studentName:students.find(s=>s.id===data.studentId).name,status:'Dalam Proses'});await ctx.rerender();});
 ctx.root.querySelectorAll('[data-followup]').forEach(form=>attachAsync(form,async data=>{if(!['Dalam Proses','Selesai'].includes(data.status))throw new Error('Status tidak valid.');await transitionWorkspaceRecord(pathFor(ctx,'academic_followups'),form.dataset.followup,r=>{if(!own(ctx,r)||r.status==='Selesai')throw new Error('Rekam sudah selesai atau bukan milik Anda.');return {...r,...data};},uid(ctx));await ctx.rerender();}));
}
export async function renderTeacherCase(ctx){
 authorize(ctx,'teacher-case');
 const students=filterScopedStudents(ctx.master,ctx.session.profile,role(ctx));
 ctx.root.innerHTML=pageHeader('Lapor Kasus / Pelanggaran','Guru melaporkan fakta; Konselor menangani tabayyun dan tindakan formal.')+form(ctx,'teacherCaseForm','Laporan Guru',formRow('Santri',select('studentId',studentOptions(students),'required'))+formRow('Tanggal',input('date',localDate(),'date','required'))+formRow('Kategori',input('category','','text','required maxlength="120"'))+textField('Kronologi faktual','description')+textField('Evidence / saksi','evidence'));
 attachAsync(ctx.root.querySelector('#teacherCaseForm'),async data=>{requireAssignedId(data.studentId,students,'Santri');await createWorkspaceRecord(`boarding/cases/${ctx.yearId}`,{...payload(ctx,data),status:'menunggu_konselor',reportedByUid:uid(ctx),reporterRole:role(ctx),parentVisible:false},uid(ctx));await ctx.rerender();},'Laporan masuk ke antrean Konselor.');
}
export async function renderWorkKpi(ctx){
 const kinds=['schedules','writings','teacher_assessments','academic_followups','observations','coaching'];
 const results=await Promise.allSettled(kinds.map(k=>listNode(pathFor(ctx,k))));
 const labels=['Agenda','Tulisan','Refleksi Guru','Tindak Lanjut','Observasi','Pembinaan'];
 ctx.root.innerHTML=pageHeader('KPI — Bukti Kerja','Jumlah evidence tercatat; belum menjadi skor KPI berbobot tanpa standar resmi.')+`<div class="portal-metrics">${results.map((r,i)=>metric(labels[i],r.status==='fulfilled'?String(r.value.filter(x=>own(ctx,x)&&x.role===role(ctx)).length):'Tidak tersedia',r.status==='fulfilled'?'Evidence tahun aktif':'Gagal memuat data',i%2?'cyan':'blue')).join('')}</div>`+panel('Makna Data',`<p class="role-hint">Tidak adanya evidence tidak otomatis berarti kinerja nol. KPI berbobot, target pekanan, dan standar penilaian harus mengikuti konfigurasi yang disetujui pesantren.</p>`);
}
export async function renderTeacherKpi(ctx){
 authorize(ctx,'teacher-kpi');
 const [attendance,plans]=await Promise.all([getNode(`academic/teacher_attendance/${ctx.yearId}/${staffKey(ctx)}`),listNode(`academic/lesson_plans/${ctx.yearId}/${staffKey(ctx)}`)]);
 const days=Object.values(attendance||{});const ownPlans=plans;
 ctx.root.innerHTML=pageHeader('KPI & Evidence Guru','Evidence operasional Anda; jumlah catatan bukan skor penilaian kinerja.')+`<div class="portal-metrics">${metric('Hari Tercatat',String(days.length),'Kehadiran tahun aktif')}${metric('Hadir',String(days.filter(r=>r.status==='Hadir').length),'Dari catatan yang tersedia','cyan')}${metric('Rencana / Materi',String(ownPlans.length),'Evidence pembelajaran')}</div>`+panel('Evaluasi',`<p class="role-hint">Standar KPI resmi belum dikonfigurasi. Skor dan ranking tidak dibuat dari data yang belum lengkap.</p>`);
}

export async function renderManagementControl(ctx){
 authorize(ctx,'management-control');
 const students=filterScopedStudents(ctx.master,ctx.session.profile,role(ctx));const ids=new Set(students.map(s=>s.id));
 const scope=managementScope(role(ctx),ctx.session.profile);
 const tasks=[listNode(pathFor(ctx,'findings')),listNode(`boarding/cases/${ctx.yearId}`),listNode(`boarding/program_reports/${ctx.yearId}`),getNode(`academic/lesson_plans/${ctx.yearId}`)];
 const [findings,cases,reports,planTree]=await Promise.allSettled(tasks);
 const plans=planTree.status==='fulfilled'?{status:'fulfilled',value:Object.values(planTree.value||{}).flatMap(records=>Object.values(records||{}))}:planTree;
 const value=(result,filter)=>result.status==='fulfilled'?String(result.value.filter(filter).length):'Tidak tersedia';
 const terminal=['RESOLVED','DISMISSED'];
 const studentScope=r=>ids.has(r.studentId);
 ctx.root.innerHTML=pageHeader('Kontrol & Kondisi',`Scope: ${scope==='all'?'Lintas divisi':scope==='education'?'Pendidikan':scope==='boarding-L'?'Asrama putra':'Asrama putri'}. Temuan diputuskan setelah evidence diverifikasi.`)+`<div class="portal-metrics">${metric('Temuan Aktif',value(findings,r=>canSeeManagement(r,ctx.session)&&!terminal.includes(r.status)),'Perlu tindak lanjut','coral')}${metric('Kasus Santri Aktif',value(cases,r=>studentScope(r)&&!['selesai','tidak_terbukti'].includes(r.status)),'Metadata tanpa narasi konseling')}${metric('Laporan Program',scope==='education'?'—':value(reports,r=>!ctx.session.profile.scopeGender||r.genderScope===ctx.session.profile.scopeGender),'Evidence tahun aktif','cyan')}${metric('Rencana Pembelajaran',scope.startsWith('boarding')?'—':value(plans,r=>!ctx.session.profile.classIds?.length||ctx.session.profile.classIds.includes(r.classId)),'Evidence tahun aktif')}</div>`+panel('Tindak Lanjut',`<p class="role-hint">Tinjau jadwal, laporan dan lingkup penugasan sebelum menyimpulkan penyimpangan. Tidak adanya catatan tidak otomatis membuat temuan pelanggaran.</p><div class="section-actions"><button class="btn btn-primary" data-jump="management-findings">Temuan & Tindak Lanjut</button><button class="btn btn-secondary" data-jump="management-observation">Catat Observasi</button><button class="btn btn-secondary" data-jump="management-coaching">Pembinaan Personil</button></div>`);
 ctx.root.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>ctx.navigate(b.dataset.jump));
}
function scopeField(ctx){
 const scope=managementScope(role(ctx),ctx.session.profile);
 const choices=scope==='all'?[['education','Pendidikan'],['boarding-L','Asrama putra'],['boarding-P','Asrama putri'],['all','Lintas divisi']]:[[scope,scope]];
 return formRow('Scope',select('scope',choices.map(([v,l])=>`<option value="${v}">${l}</option>`).join(''),'required'));
}
function assertScope(ctx,scope){
 if(!['education','boarding-L','boarding-P','all'].includes(scope))throw new Error('Scope tidak valid.');
 if(!canSeeManagement({scope},ctx.session))throw new Error('Scope di luar kewenangan role aktif.');
}
export async function renderManagementFindings(ctx,escalationsOnly=false){
 authorize(ctx,escalationsOnly?'management-escalations':'management-findings');
 const records=(await listNode(pathFor(ctx,'findings'))).filter(r=>canSeeManagement(r,ctx.session)&&(!escalationsOnly||r.status==='ESCALATED'));
 const users=(await listNode('users')).filter(u=>u.active!==false&&u.role!=='wali_santri');
 const staff=users.map(u=>({id:u.id,name:u.name||u.displayName||u.id}));
 const responses=await listNode(pathFor(ctx,'finding_responses'));
 const observations=(await listNode(pathFor(ctx,'observations'))).filter(r=>canSeeManagement(r,ctx.session));
 const fields=formRow('Observasi sumber (opsional)',select('sourceObservationId','<option value="">Temuan langsung</option>'+observations.map(r=>`<option value="${e(r.id)}">${e(r.title)}</option>`).join('')))+formRow('Judul temuan',input('title','','text','required maxlength="160"'))+scopeField(ctx)+textField('Fakta dan evidence','evidence')+textField('Standar yang dirujuk','standard')+formRow('Penanggung jawab',select('assigneeUid',selectOptions(staff),'required'))+formRow('Batas tindak lanjut',input('dueDate',localDate(),'date','required'));
 ctx.root.innerHTML=pageHeader(escalationsOnly?'Eskalasi & Keputusan':'Temuan & Tindak Lanjut','Fakta → verifikasi → tindakan → evaluasi → selesai / eskalasi. Riwayat disimpan pada rekam yang sama.')+(escalationsOnly?'':form(ctx,'findingForm','Catat Temuan',fields))+panel(escalationsOnly?'Eskalasi Masuk':'Daftar Temuan',records.length?records.map(r=>{
 const transitions=(FINDING_TRANSITIONS[r.status]||[]).filter(next=>{try{validateTransition(r,next,ctx.session,'preview');return true;}catch{return false;}});
 return `<article class="workspace-record"><div class="workspace-record-head"><h3>${e(r.title)}</h3>${badge(FINDING_LABELS[r.status]||r.status)}</div><p><strong>Evidence:</strong> ${e(r.evidence)}</p><p><strong>Standar:</strong> ${e(r.standard)}</p>${r.sourceObservationId?`<p>Observasi sumber: ${e(r.sourceObservationId)}</p>`:''}${r.escalationTargetRole?`<p>Tujuan eskalasi: ${e(ROLE_LABELS[r.escalationTargetRole])}</p>`:''}<p><strong>PJ:</strong> ${e(staff.find(s=>s.id===r.assigneeUid)?.name||r.assigneeUid)} · ${e(r.dueDate)}</p><details><summary>Bukti tindak lanjut personil</summary>${responses.filter(x=>x.findingId===r.id).map(x=>`<p><b>${e(x.actorName||x.actorUid)}</b>: ${e(x.result)} · ${e(x.evidence)}</p>`).join('')||'<p>Belum ada bukti dari personil.</p>'}</details><details><summary>Riwayat tindakan & keputusan</summary>${Object.values(r.history||{}).map(h=>`<p>${badge(FINDING_LABELS[h.to]||h.to)} ${e(h.note)} <small>— ${e(h.actorName||h.actorUid)}</small></p>`).join('')||'<p>Belum ada perubahan status.</p>'}</details>${transitions.length?`<form data-transition="${e(r.id)}" class="portal-form">${formRow('Tahap berikutnya',select('status',transitions.map(s=>`<option value="${s}">${e(FINDING_LABELS[s])}</option>`).join('')))}${textField('Tindakan / hasil evaluasi / keputusan','note')}<button type="submit" class="btn btn-primary">Simpan Tindak Lanjut</button></form>`:''}</article>`;
 }).join(''):empty('Tidak ada temuan dalam scope ini.'));
 attachAsync(ctx.root.querySelector('#findingForm'),async data=>{assertScope(ctx,data.scope);if(data.sourceObservationId&&!observations.some(r=>r.id===data.sourceObservationId&&r.scope===data.scope))throw Error('Observasi sumber di luar lingkup.');requireAssignedId(data.assigneeUid,staff,'Penanggung jawab');await save(ctx,'findings',{...data,status:'NEW'});await ctx.rerender();});
 ctx.root.querySelectorAll('[data-transition]').forEach(form=>attachAsync(form,async data=>{
 const eventId=crypto.randomUUID();
 await transitionWorkspaceRecord(pathFor(ctx,'findings'),form.dataset.transition,current=>{
 validateTransition(current,data.status,ctx.session,data.note);
 return {...current,status:data.status,...(data.status==='ESCALATED'?{escalationTargetRole:escalationTarget(role(ctx)),escalatedBy:uid(ctx)}:{}),history:{...current.history,[eventId]:{from:current.status,to:data.status,note:data.note,actorUid:uid(ctx),actorName:ctx.session.profile.name||'',at:{'.sv':'timestamp'}}}};
 },uid(ctx));await ctx.rerender();
 }));
}
const MANAGEMENT_FORMS={
 'management-observation':{collection:'observations',title:'Observasi',description:'Catat kondisi nyata, standar acuan, dan evidence sebelum menyimpulkan temuan.',fields:[['standard','Standar acuan'],['evidence','Hasil observasi / evidence'],['followUp','Kebutuhan tindak lanjut']]},
 'management-coaching':{collection:'coaching',title:'Pembinaan Personil',description:'Apresiasi, fokus perbaikan, target, serta kesepakatan pendampingan.',fields:[['person','Personil / jabatan yang dibina'],['appreciation','Apresiasi'],['focus','Fokus perbaikan'],['target','Target & kesepakatan']]},
 'management-standards':{collection:'standards',title:'Standar Kerja',description:'Standar kerja yang menjadi acuan peninjauan evidence operasional.',fields:[['indicator','Indikator'],['target','Target / batas standar'],['evidence','Evidence yang diperlukan']]},
 'management-targets':{collection:'targets',title:'Target & Arah',description:'Arahan pimpinan, target, penanggung jawab, dan waktu evaluasi.',fields:[['target','Target / arah'],['person','Penanggung jawab'],['evaluation','Rencana evaluasi']]},
 'management-systemic':{collection:'systemic',title:'Masalah Sistemik',description:'Catat pola masalah, dampak, dan usulan perubahan sistem untuk keputusan pimpinan.',fields:[['evidence','Pola / evidence lintas kejadian'],['impact','Dampak'],['proposal','Usulan perubahan'],['decision','Keputusan / arahan']]}
};
export async function renderManagementRecord(ctx,route){
 authorize(ctx,route);const config=MANAGEMENT_FORMS[route];
 const rows=(await listNode(pathFor(ctx,config.collection))).filter(r=>canSeeManagement(r,ctx.session));
 ctx.root.innerHTML=pageHeader(config.title,config.description)+form(ctx,'managementForm',`Catat ${config.title}`,formRow('Judul',input('title','','text','required maxlength="160"'))+scopeField(ctx)+formRow('Tanggal',input('date',localDate(),'date','required'))+config.fields.map(([key,label])=>textField(label,key)).join(''))+panel('Riwayat',recordList(rows,config.fields));
 attachAsync(ctx.root.querySelector('#managementForm'),async data=>{assertScope(ctx,data.scope);await save(ctx,config.collection,data);await ctx.rerender();});
}
export async function renderManagementKpi(ctx){
 authorize(ctx,'management-kpi');
 const rows=(await listNode(pathFor(ctx,'findings'))).filter(r=>canSeeManagement(r,ctx.session));
 ctx.root.innerHTML=pageHeader('KPI & Evidence Manajemen','Rekap siklus temuan dalam scope; tidak mengubah penilaian personel secara otomatis.')+`<div class="portal-metrics">${metric('Temuan',String(rows.length),'Evidence tercatat')}${metric('Selesai',String(rows.filter(r=>r.status==='RESOLVED').length),'Setelah evaluasi','cyan')}${metric('Menunggu Evaluasi',String(rows.filter(r=>r.status==='EVALUATION').length),'Perlu verifikasi','coral')}${metric('Dieskalasi',String(rows.filter(r=>r.status==='ESCALATED').length),'Memerlukan keputusan')}</div>`+panel('Penilaian',`<p class="role-hint">Rekap belum menjadi skor KPI berbobot. Target dan pembobotan mengikuti standar kerja yang disetujui pesantren.</p>`);
}
export const WORKSPACE_ROUTES={
 'management-reports':renderManagementReports,'work-followups':renderWorkFollowups,
 'management-residents':renderResidentStaff,'management-worship':renderStaffWorship,
 ...Object.fromEntries(Object.keys(OPERATION_VIEWS).map(r=>[r,ctx=>renderManagementOperations(ctx,r)])),
 'work-profile':renderProfile,'work-guide':renderGuide,'work-schedule':renderWorkSchedule,'work-messages':renderWorkMessages,'work-kpi':renderWorkKpi,
 'education-calendar':renderEducationCalendar,'teacher-writing':renderTeacherWriting,'teacher-assessment':renderTeacherAssessment,'academic-followup':renderAcademicFollowup,'teacher-case':renderTeacherCase,'teacher-kpi':renderTeacherKpi,
 'management-control':renderManagementControl,'management-findings':renderManagementFindings,'management-escalations':async ctx=>{await renderManagementFindings(ctx,true);await renderCaseDecisions(ctx);},'management-people':renderManagementPeople,'management-changes':ctx=>renderRegistry(ctx,'management-changes'),'management-kpi':renderManagementKpi,
 ...Object.fromEntries(Object.keys(MANAGEMENT_FORMS).map(route=>[route,ctx=>renderRegistry(ctx,route)]))
};
