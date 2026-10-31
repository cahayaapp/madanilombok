import {escapeHtml as e} from './utils.js';
import {pageHeader} from './modules/common.js';
import {commitCaseOperation,getNode} from './repository.js';
import {counselingEntries} from './counselor-review-model.js';
import {loading} from './loading-ui.js';
import {localDate} from './role-experience.js';
import {counselorLevel} from './counselor-model.js';
const today=localDate;
export function mountCaseTreatment(ctx,rows,students,{prepare,onSaved}={}){
 ctx.root.querySelector('#caseTreatmentDialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='caseTreatmentDialog';dialog.className='counselor-treatment-dialog';dialog.setAttribute('aria-label','Proses Kasus');
 const batch=crypto.randomUUID(),prepared=new Set(),operations=new Map(),proven=[],completed=new Set();let index=0,busy=false,changed=false,submitted=null;
 const name=c=>students[c.studentId]?.name||c.studentId;
 const close=()=>{if(busy)return;dialog.remove();if(changed)onSaved?.();};
 dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});
 const header=(title,sub,progress)=>`<header class="ct-head"><div><small>${e(progress)}</small><h2>${title}</h2><p>${sub}</p></div><button type="button" class="icon-button" data-close aria-label="Tutup">×</button></header>`;
 const mount=html=>{dialog.innerHTML=html;dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);dialog.scrollTop=0;};
 const run=async action=>{if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action();}catch(err){dialog.querySelector('[role=status]').textContent=err.message;}finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}};
 const commit=async(c,type,data)=>{if(!prepared.has(c.id)){await prepare?.(c);prepared.add(c.id);}const key=`${batch}_${type}_${c.id}`;if(!operations.has(key))operations.set(key,{id:key,type,data});const saved=await commitCaseOperation(ctx.yearId,c.id,operations.get(key),ctx.session);if(saved)Object.assign(c,saved);changed=true;};
 const advance=()=>{index++;tabayyun();};
 function tabayyun(){
  const c=rows[index];if(!c){if(proven.length)counseling();else{busy=false;close();}return;}
  let admission='',conclusion='';
  mount(header('Tabayyun Kasus','Klarifikasi setiap santri dan kasus secara terpisah.',`KONSELOR · ${index+1} DARI ${rows.length}`)+`<section class="ct-context"><h3>${e(name(c))}</h3><dl><div><dt>Jenis pelanggaran</dt><dd>${e(c.category||'Pelanggaran')}</dd></div><div><dt>Tanggal kejadian</dt><dd>${e(c.date||'—')}</dd></div><div><dt>Laporan awal</dt><dd>${e(c.description||c.category||'—')}</dd></div><div><dt>Pelapor</dt><dd>${e(c.reporterName||c.createdByName||'Belum tercatat')}</dd></div></dl></section><form id="caseTreatment" class="portal-form ct-form"><strong>Apakah santri mengakui kejadian yang dilaporkan?</strong><div class="ct-choices"><button type="button" data-admission="MENGAKUI"><strong>Mengakui</strong><small>Langsung terbukti berdasarkan pengakuan.</small></button><button type="button" data-admission="TIDAK_MENGAKUI"><strong>Tidak Mengakui</strong><small>Catat pemeriksaan dan kesimpulan.</small></button></div><section data-denial hidden><label>Hasil Akhir Tabayyun<textarea name="finding" placeholder="Tuliskan hasil klarifikasi, konfirmasi dengan saksi jika ada, dan kesimpulan pemeriksaan."></textarea></label><label>Kesimpulan</label><div class="ct-choices"><button type="button" data-outcome="TERBUKTI">Terbukti</button><button type="button" data-outcome="TIDAK TERBUKTI">Tidak Terbukti</button></div></section><details class="ct-escalation"><summary>↗ Eskalasi Kasus</summary><label>Tujuan Eskalasi<select name="target">${counselorLevel(ctx.session.profile)==='PEMULA'?'<option value="konselor_madya">Konselor Madya</option>':'<option value="deputy_director">Wakil Direktur</option><option value="director">Direktur</option>'}</select></label><label>Alasan Eskalasi<textarea name="reason" placeholder="Tuliskan alasan kasus perlu ditangani pada tingkat yang lebih tinggi."></textarea></label><button type="button" class="btn btn-secondary" data-escalate>Kirim Eskalasi</button></details><p role="status" aria-live="polite"></p><footer class="ct-actions"><button type="button" class="btn btn-secondary" data-close>Batal</button><button class="btn btn-primary" type="submit">Lanjutkan</button></footer></form>`);
  const form=dialog.querySelector('form'),feedback=form.querySelector('[role=status]');
  form.querySelectorAll('[data-admission]').forEach(b=>b.onclick=()=>{admission=b.dataset.admission;conclusion='';form.querySelector('[data-denial]').hidden=admission!=='TIDAK_MENGAKUI';form.querySelectorAll('[data-admission]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
  form.querySelectorAll('[data-outcome]').forEach(b=>b.onclick=()=>{conclusion=b.dataset.outcome;form.querySelectorAll('[data-outcome]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
  form.onsubmit=async ev=>{ev.preventDefault();const finding=form.elements.finding.value.trim(),outcome=admission==='MENGAKUI'?'TERBUKTI':conclusion;if(!admission){feedback.textContent='Pilih jawaban santri terlebih dahulu.';return;}if(admission==='TIDAK_MENGAKUI'&&(!finding||!outcome)){feedback.textContent='Lengkapi hasil pemeriksaan dan kesimpulan.';return;}
   if(outcome==='TIDAK TERBUKTI'&&!window.confirm(`Keluarkan kasus ${name(c)} dari data operasional pelanggaran? Catatan audit tetap disimpan.`))return;
   await run(async()=>{await commit(c,'tabayyun',{date:today(),admission,studentStatement:admission==='MENGAKUI'?'Mengakui kejadian.':'Tidak mengakui kejadian.',facts:admission==='MENGAKUI'?'Pengakuan santri':finding,conclusion:outcome,...Object.fromEntries(['niat','frekuensi','dampak','kondisi'].map(k=>[k,c.tabayyun?.[k]||0]))});if(outcome==='TERBUKTI')proven.push(c);advance();});
  };
  form.querySelector('[data-escalate]').onclick=async()=>{const summary=form.elements.reason.value.trim();if(!summary){feedback.textContent='Alasan eskalasi wajib diisi.';return;}if(admission==='TIDAK_MENGAKUI'&&conclusion==='TIDAK TERBUKTI'){feedback.textContent='Kasus tidak terbukti dikeluarkan dari operasional, bukan dieskalasikan.';return;}await run(async()=>{await commit(c,'escalation',{targetLevel:form.elements.target.value,summary,decisionNeeded:'Arahan atau keputusan penanganan lanjutan'});advance();});};
 }
 function counseling(){
  const groups=[...new Set(proven.map(c=>c.studentId))];
  const fields=[['what','Target Perbaikan (What)','Apa perubahan atau perbaikan yang ingin dicapai santri?'],['why','Motivasi Perbaikan (Why)','Mengapa perubahan tersebut penting bagi santri?'],['how','Strategi Perbaikan (How)','Bagaimana cara santri mencapai target tersebut?'],['consequence','Konsekuensi Edukatif','Konsekuensi edukatif yang diputuskan konselor.']];
  mount(header('Konseling Santri','Sepakati target, alasan, dan langkah perbaikan bersama santri.',`${proven.length} KASUS · ${groups.length} SANTRI`)+`<section class="ct-context">${proven.map(c=>`<p><strong>${e(name(c))}</strong><br><small>${e(c.description||c.category||'Pelanggaran')}</small></p>`).join('')}</section><form id="caseTreatment" class="portal-form ct-form">${fields.map(([k,label,placeholder])=>`<label>${label}<textarea name="${k}" placeholder="${placeholder}"></textarea></label>`).join('')}<label class="ct-check"><input type="checkbox" name="none">Tidak Ada konsekuensi tambahan</label><label>Poin Pelanggaran (opsional)<select name="points"><option value="">Tidak menambah poin</option>${[['RINGAN',-25],['SEDANG',-50],['BERAT',-100],['KRITIS',-200]].map(([k,v])=>`<option value="${v}">${k} · ${v}</option>`).join('')}</select></label>${proven.length>1?`<details><summary>Penyesuaian per kasus</summary>${proven.map((c,i)=>`<fieldset><legend>${e(name(c))} · ${e(c.category||'Kasus')}</legend>${fields.map(([k,label])=>`<label>${label}<textarea name="${k}_${i}" placeholder="Kosongkan untuk memakai isi bersama."></textarea></label>`).join('')}</fieldset>`).join('')}</details>`:''}<p role="status" aria-live="polite"></p><footer class="ct-actions"><button type="button" class="btn btn-secondary" data-close>Tutup</button><button class="btn btn-primary" type="submit">Simpan Konseling</button></footer></form>`);
  const form=dialog.querySelector('form');form.elements.none.onchange=()=>{form.elements.consequence.disabled=form.elements.none.checked;form.elements.points.disabled=form.elements.none.checked;};
  form.onsubmit=async ev=>{ev.preventDefault();const feedback=form.querySelector('[role=status]');
   if(!submitted){const d=Object.fromEntries(new FormData(form));const payloads=proven.map((c,i)=>({date:today(),...Object.fromEntries(fields.map(([k])=>[k,d[`${k}_${i}`]?.trim()||(k==='consequence'&&d.none?'Tidak Ada':d[k]?.trim())])),groupSessionId:groups.length>1?batch:null,points:d.none?'':d.points}));if(payloads.some(d=>fields.some(([k])=>!d[k]))){feedback.textContent='Lengkapi What, Why, How, dan konsekuensi atau pilih Tidak Ada.';return;}submitted=payloads;form.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=true);}
   await run(async()=>{const errors=[];for(const [i,c] of proven.entries()){if(completed.has(c.id))continue;try{const {points,...data}=submitted[i];await commit(c,'counseling_complete',data);if(points!==''&&!c.finalPointTransactionId)await commit(c,'points',{points:Number(points),description:`Keputusan konseling: ${c.description||c.category||'Pelanggaran'}`});completed.add(c.id);}catch(err){errors.push(`${name(c)}: ${err.message}`);}}feedback.textContent=`${completed.size}/${proven.length} kasus tersimpan. ${errors.join(' · ')}`;if(completed.size===proven.length){busy=false;close();}});
  };
 }
 ctx.root.append(dialog);tabayyun();if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
}
export async function renderCounselorBook(ctx,cases){
 const header=()=>pageHeader('Buku Konseling','Riwayat konseling setiap santri.');
 ctx.root.innerHTML=header()+loading('Memuat riwayat konseling…');
 let legacy;
 try{legacy=await getNode(`boarding/counseling/${ctx.yearId}`)||{};}catch(err){
  ctx.root.innerHTML=header()+`<section class="panel"><p role="alert">Riwayat konseling belum dapat dimuat. ${e(err.message||'Silakan coba lagi.')}</p><button class="btn btn-secondary" data-retry>Coba Lagi</button></section>`;
  ctx.root.querySelector('[data-retry]').onclick=()=>renderCounselorBook(ctx,cases);return;
 }
 const entries=counselingEntries(cases,legacy),students=Object.fromEntries(ctx.master.students.map(s=>[s.id,s]));
 const groups=new Map();for(const row of entries){if(!groups.has(row.studentId))groups.set(row.studentId,[]);groups.get(row.studentId).push(row);}
 const name=id=>students[id]?.name||id||'Santri belum tercatat';
 const ids=[...groups.keys()].sort((a,b)=>name(a).localeCompare(name(b),'id'));
 let selected=null;
 ctx.root.innerHTML=header()+`<section class="counselor-book"><p class="cb-count" role="status">${entries.length} catatan konseling ditemukan.</p><label class="cb-search">Cari nama santri<input type="search" data-search placeholder="Cari nama santri…" autocomplete="off"></label><div class="cb-layout"><nav class="cb-students panel" aria-label="Daftar santri dengan riwayat konseling" data-students></nav><section class="cb-history panel" aria-label="Riwayat santri terpilih" data-entries></section></div></section>`;
 const counselor=r=>r.counselorName||(r.counselorUid===ctx.session.user?.uid?ctx.session.profile?.name:'')||(r.counselorUid?(ctx.master.staff||[]).find(s=>s.authUid===r.counselorUid||s.userUid===r.counselorUid)?.name:'')||'Konselor belum tercatat';
 const date=r=>{const d=new Date(`${String(r.date||'').slice(0,10)}T12:00:00`);return Number.isNaN(+d)?'Tanggal belum tercatat':d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});};
 const drawHistory=()=>{
  const host=ctx.root.querySelector('[data-entries]');
  if(!selected){host.innerHTML='<p class="cb-placeholder">Pilih santri untuk melihat riwayat konseling.</p>';return;}
  host.innerHTML=`<button class="btn btn-secondary cb-back" data-back>‹ Pilih Santri</button><h2>${e(name(selected))}</h2>`+groups.get(selected).map(r=>`<article class="cb-record"><h3>${e(r.violation)}</h3><p class="cb-meta">${e(date(r))} · ${e(counselor(r))}${r.groupSessionId?' · Konseling kelompok':''}</p><dl>${[['Hasil Tabayyun',r.conclusion],['Target (What)',r.what],['Motivasi (Why)',r.why],['Strategi (How)',r.how],['Konsekuensi Edukatif',r.consequence]].map(([k,v])=>`<dt>${k}</dt><dd>${e(v||'Tidak tercatat')}</dd>`).join('')}</dl></article>`).join('');
  host.querySelector('[data-back]').onclick=()=>{selected=null;draw();};
 };
 const draw=()=>{
  const q=ctx.root.querySelector('[data-search]').value.trim().toLocaleLowerCase('id-ID');
  const visible=ids.filter(id=>name(id).toLocaleLowerCase('id-ID').includes(q));
  if(selected&&!visible.includes(selected))selected=null;
  ctx.root.querySelector('.cb-layout').classList.toggle('cb-selected',!!selected);
  ctx.root.querySelector('[data-students]').innerHTML=visible.map(id=>`<button class="cb-student${selected===id?' is-selected':''}" data-book-student="${e(id)}" aria-pressed="${selected===id}"><strong>${e(name(id))}</strong><small>${groups.get(id).length} catatan konseling</small></button>`).join('')||`<p class="cb-placeholder">${entries.length?'Tidak ada santri sesuai pencarian.':'Belum ada catatan konseling.'}</p>`;
  ctx.root.querySelectorAll('[data-book-student]').forEach(b=>b.onclick=()=>{selected=b.dataset.bookStudent;draw();});drawHistory();
 };
 ctx.root.querySelector('[data-search]').oninput=draw;draw();
}
export {renderCounselorEvaluation} from './counselor-evaluation.js';
