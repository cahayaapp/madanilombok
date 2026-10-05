import {listNode,submitFindingResponse} from './repository.js';
import {canAccess} from './permissions.js';
import {pageHeader,panel,escapeHtml as e,empty,attachAsync} from './modules/common.js';
export async function renderWorkFollowups(ctx){
 if(!canAccess('workspace.work-followups',[ctx.session.activeRole]))throw Error('Di luar kewenangan.');
 const rows=(await listNode(`workspaces/${ctx.yearId}/findings`)).filter(r=>r.assigneeUid===ctx.session.user.uid),responses=await listNode(`workspaces/${ctx.yearId}/finding_responses`);
 ctx.root.innerHTML=pageHeader('Tindak Lanjut Saya','Kirim hasil perbaikan dan bukti. Pejabat peninjau mengevaluasi penyelesaiannya.')+(rows.length?rows.map(r=>panel(e(r.title),`<p>${e(r.evidence)}</p><p>Standar: ${e(r.standard)} · Tenggat ${e(r.dueDate)}</p>${responses.filter(x=>x.findingId===r.id&&x.actorUid===ctx.session.user.uid).map(x=>`<p>${e(x.result)} · ${e(x.evidence||'')}</p>`).join('')}${!['RESOLVED','DISMISSED'].includes(r.status)?`<form data-finding="${e(r.id)}"><label>Hasil tindak lanjut<textarea name="result" required></textarea></label><label>Bukti / tautan pendukung<textarea name="evidence" required></textarea></label><button class="btn btn-primary">Kirim untuk Evaluasi</button></form>`:''}`)).join(''):empty('Tidak ada tindak lanjut yang ditugaskan.'));
 ctx.root.querySelectorAll('[data-finding]').forEach(form=>{const id=crypto.randomUUID();attachAsync(form,async data=>{await submitFindingResponse(ctx.yearId,form.dataset.finding,id,data,ctx.session.user.uid);await ctx.rerender();},'Bukti tindak lanjut tersimpan.');});
}
