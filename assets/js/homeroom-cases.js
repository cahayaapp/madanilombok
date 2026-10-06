import {listNode,transitionWorkspaceRecord} from './repository.js';
import {canHandleSchoolCase,applySchoolCaseNote} from './school-case-routing.js';
import {mount,e,empty,action} from './teacher/ui.js';
export async function renderHomeroomCases(ctx){
 if(ctx.session.activeRole!=='guru_mapel')throw Error('Buka role Guru Mapel sebagai Wali Kelas.');
 await ctx.refreshMaster?.();
 const ws=mount(ctx,'Pelanggaran Kelas SD','Laporan siswa kelas Anda untuk klarifikasi, pembinaan, dan tindak lanjut Wali Kelas.');
 const paths=[`boarding/homeroom_cases/${ctx.yearId}`,`boarding/cases/${ctx.yearId}`],rows=(await Promise.all(paths.map(async path=>(await listNode(path)).map(r=>({...r,path}))))).flat().filter(r=>canHandleSchoolCase(ctx.master,r,ctx.session.profile));
 rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 ws.innerHTML=rows.map((r,i)=>{const closed=['selesai','tidak_terbukti'].includes(r.status),student=ctx.master.students.find(s=>s.id===r.studentId);return `<section class="teacher-panel"><h2>${e(student?.name||r.studentId)}</h2><p>${e(r.date||'')} · ${e(r.category||'')} · ${e(r.status)}</p><p>${e(r.description||'')}</p><p>${e(r.evidence||'')}</p>${r.critical?'<strong>Perlu perhatian segera</strong>':''}<div>${Object.values(r.homeroomHistory||{}).map(h=>`<p>${e(h.status)} — ${e(h.note)}</p>`).join('')}</div>${closed?'<p>Laporan sudah ditutup.</p>':`<label class="field">Hasil klarifikasi / pembinaan / tindak lanjut<textarea data-note="${i}"></textarea></label><label class="field">Status<select data-status="${i}"><option value="ditangani">Dalam penanganan</option><option value="selesai">Selesai</option><option value="tidak_terbukti">Tidak terbukti</option></select></label><button class="teacher-primary" data-save="${i}">Simpan Tindak Lanjut</button>`}</section>`;}).join('')||empty('Belum ada laporan pelanggaran untuk kelas SD yang Anda wali.');
 ws.querySelectorAll('[data-save]').forEach(button=>action(ctx,button,async()=>{const i=button.dataset.save,r=rows[i],data={id:crypto.randomUUID(),note:ws.querySelector(`[data-note="${i}"]`).value,status:ws.querySelector(`[data-status="${i}"]`).value};await ctx.refreshMaster?.();await transitionWorkspaceRecord(r.path,r.id,current=>applySchoolCaseNote(current,data,ctx.master,ctx.session,Date.now()),ctx.session.user.uid);await renderHomeroomCases(ctx);}));
}
