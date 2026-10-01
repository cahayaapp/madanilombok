import {listNode,getNode,saveWorkspaceRecord,createWorkspaceRecord,transitionWorkspaceRecord} from '../repository.js';
import {childrenForParent} from '../app-store.js';
import {filterScopedStudents,localDate} from '../role-experience.js';
import {canAccess} from '../permissions.js';
import {HOLIDAY_ACTIVITIES,REPORT_QUESTIONS,DEPOSIT_TRANSITIONS,validateActivity,validateReport} from '../holiday-model.js';
import {pageHeader,panel,empty,formRow,select,selectOptions,input,textarea,attachAsync,escapeHtml as e,badge} from './common.js';
function childScope(ctx){
 const children=childrenForParent(ctx.session.profile,ctx.master),id=sessionStorage.getItem('madaniParentChild');
 return {children,child:children.find(c=>c.id===id)||children[0]};
}
function switcher(children,child){return `<select id="extraChild" aria-label="Pilih Ananda">${selectOptions(children,child.id)}</select>`;}
function bind(ctx){ctx.root.querySelector('#extraChild')?.addEventListener('change',event=>{sessionStorage.setItem('madaniParentChild',event.target.value);ctx.rerender();});}
function assertRoute(ctx,route){if(!canAccess(`workspace.${route}`,[ctx.session.activeRole])||!ctx.yearId)throw new Error('Role atau tahun ajaran tidak tersedia.');}
function meta(ctx,child){return {studentId:child.id,guardianUid:ctx.session.user.uid,academicYearId:ctx.yearId,role:ctx.session.activeRole};}
export async function renderHoliday(ctx){
 assertRoute(ctx,'parent-holiday');const {children,child}=childScope(ctx);if(!child){ctx.root.innerHTML=empty('Akun belum terhubung dengan Ananda.');return;}
 ctx.root.innerHTML=pageHeader('Jurnal Liburan','Aktivitas harian dan refleksi rapor Ananda.',switcher(children,child))+`<div class="portal-grid two">${panel('Aktivitas Harian',`<label class="field">Tanggal<input id="holidayDate" type="date" value="${localDate()}" required></label><form id="holidayForm" class="portal-form"></form>`)}${panel('Bedah Rapor',`<form id="reportForm" class="portal-form">${formRow('Periode',input('period',ctx.yearId,'text','required maxlength="60"'))}${REPORT_QUESTIONS.map((label,i)=>formRow(label,textarea(`answer_${i}`,'','maxlength="1200"'),true)).join('')}${formRow('Status',select('status','<option value="DRAF">Simpan draf</option><option value="TERKIRIM">Kirim kepada Guru Wali</option>'))}<button type="submit" class="btn btn-primary">Simpan Bedah Rapor</button></form><div id="reportState" role="status"></div>`)}</div>`;bind(ctx);
 const dateEl=ctx.root.querySelector('#holidayDate'),form=ctx.root.querySelector('#holidayForm');
 const load=async()=>{const saved=await getNode(`workspaces/${ctx.yearId}/holiday_daily/${child.id}/${dateEl.value}`)||{};form.innerHTML=HOLIDAY_ACTIVITIES.map((label,i)=>formRow(label,select(`activity_${i}`,`<option value="">Pilih...</option><option value="TERLAKSANA" ${saved[`activity_${i}`]==='TERLAKSANA'?'selected':''}>Terlaksana</option><option value="TIDAK_TERLAKSANA" ${saved[`activity_${i}`]==='TIDAK_TERLAKSANA'?'selected':''}>Tidak Terlaksana</option>`,'required'),true)).join('')+'<button type="submit" class="btn btn-primary">Simpan Aktivitas</button>';};
 dateEl.onchange=load;await load();
 attachAsync(form,async data=>{validateActivity(data);if(!/^\d{4}-\d{2}-\d{2}$/.test(dateEl.value))throw new Error('Tanggal wajib diisi.');await saveWorkspaceRecord(`workspaces/${ctx.yearId}/holiday_daily/${child.id}`,dateEl.value,{...data,...meta(ctx,child),date:dateEl.value},ctx.session.user.uid);});
 const report=ctx.root.querySelector('#reportForm');
 const reportId=()=>report.elements.period.value.trim().replace(/[.#$\[\]/]/g,'_');
 const loadReport=async()=>{const data=await getNode(`workspaces/${ctx.yearId}/holiday_reports/${child.id}/${reportId()}`)||{};REPORT_QUESTIONS.forEach((_,i)=>report.elements[`answer_${i}`].value=data[`answer_${i}`]||'');report.elements.status.value=data.status||'DRAF';};
 report.elements.period.onchange=loadReport;await loadReport();
 attachAsync(report,async data=>{validateReport(data);await saveWorkspaceRecord(`workspaces/${ctx.yearId}/holiday_reports/${child.id}`,reportId(),{...data,...meta(ctx,child)},ctx.session.user.uid);ctx.root.querySelector('#reportState').textContent=data.status==='TERKIRIM'?'Terkirim kepada Guru Wali.':'Draf tersimpan.';});
}
export async function renderHolidayMonitor(ctx){
 assertRoute(ctx,'holiday-monitor');const students=filterScopedStudents(ctx.master,ctx.session.profile,ctx.session.activeRole);
 const groups=await Promise.all(students.map(async s=>({student:s,records:await listNode(`workspaces/${ctx.yearId}/holiday_reports/${s.id}`)})));
 ctx.root.innerHTML=pageHeader('Jurnal Liburan Santri','Refleksi yang sudah dikirim wali pada scope binaan.')+groups.map(({student,records})=>panel(student.name,records.filter(r=>r.status==='TERKIRIM').map(r=>`<article class="workspace-record"><h3>${e(r.period)}</h3>${REPORT_QUESTIONS.map((q,i)=>`<p><strong>${e(q)}</strong><br>${e(r[`answer_${i}`]||'—')}</p>`).join('')}</article>`).join('')||empty('Belum ada refleksi terkirim.'))).join('');
 if(!students.length)ctx.root.innerHTML+=empty('Belum ada santri dalam scope penugasan.');
}
export async function renderParentDeposits(ctx){
 assertRoute(ctx,'parent-deposits');const {children,child}=childScope(ctx);if(!child){ctx.root.innerHTML=empty('Akun belum terhubung dengan Ananda.');return;}
 const rows=await listNode(`workspaces/${ctx.yearId}/deposits/${child.id}`);
 ctx.root.innerHTML=pageHeader('Pantau Penitipan Barang','Status barang yang dicatat petugas. Wali tidak mengubah status serah terima.',switcher(children,child))+panel('Penitipan Ananda',rows.map(r=>`<article class="workspace-record"><h3>${e(r.title)}</h3>${badge(r.status)}<p>${e(r.description)}</p><p>${e(r.quantity)} barang · ${e(r.date)}</p><p><strong>Penerima:</strong> ${e(r.receiver||'Belum diserahkan')}</p></article>`).join('')||empty('Belum ada barang titipan tercatat.'));bind(ctx);
}
export async function renderDepositAdmin(ctx){
 assertRoute(ctx,'deposit-admin');const students=ctx.master.students||[];
 ctx.root.innerHTML=pageHeader('Layanan Penitipan','Pencatatan petugas dan serah terima; status yang sama dibaca wali.')+panel('Pilih Santri',`<select id="depositStudent" aria-label="Santri">${selectOptions(students)}</select>`)+`<div id="depositWorkspace"></div>`;
 ctx.root.querySelector('#depositStudent').onchange=async event=>{
 const studentId=event.target.value,student=students.find(s=>s.id===studentId),mount=ctx.root.querySelector('#depositWorkspace');if(!student){mount.innerHTML='';return;}
 const path=`workspaces/${ctx.yearId}/deposits/${studentId}`,rows=await listNode(path);
 mount.innerHTML=panel('Terima Barang',`<form id="depositForm" class="portal-form">${formRow('Nama barang',input('title','','text','required maxlength="160"'))}${formRow('Jumlah',input('quantity',1,'number','required min="1" step="1"'))}${formRow('Keterangan / kondisi',textarea('description','','required'),true)}<button type="submit" class="btn btn-primary">Catat Penerimaan</button></form>`)+panel('Riwayat & Serah Terima',rows.map(r=>`<article class="workspace-record"><h3>${e(r.title)}</h3>${badge(r.status)}${DEPOSIT_TRANSITIONS[r.status]?.length?`<form data-deposit="${e(r.id)}" class="portal-form">${formRow('Status berikutnya',select('status',DEPOSIT_TRANSITIONS[r.status].map(v=>`<option>${v}</option>`).join('')))}${formRow('Penerima / petugas',input('receiver','','text','required'))}${formRow('Catatan',textarea('note','','required'),true)}<button type="submit" class="btn btn-secondary">Perbarui</button></form>`:''}</article>`).join('')||empty());
 attachAsync(mount.querySelector('#depositForm'),async data=>{const quantity=Number(data.quantity);if(!Number.isInteger(quantity)||quantity<1)throw new Error('Jumlah harus bilangan bulat positif.');await createWorkspaceRecord(path,{...data,quantity,studentId,academicYearId:ctx.yearId,date:localDate(),status:'DITITIPKAN'},ctx.session.user.uid);await event.target.onchange(event);});
 mount.querySelectorAll('[data-deposit]').forEach(form=>attachAsync(form,async data=>{const key=crypto.randomUUID();await transitionWorkspaceRecord(path,form.dataset.deposit,r=>{if(!DEPOSIT_TRANSITIONS[r.status]?.includes(data.status))throw new Error('Status sudah berubah. Muat ulang.');return {...r,...data,history:{...r.history,[key]:{...data,actorUid:ctx.session.user.uid,at:{'.sv':'timestamp'}}}};},ctx.session.user.uid);await event.target.onchange(event);}));
 };
}
export const PARENT_EXTRA_ROUTES={'parent-deposits':renderParentDeposits,'deposit-admin':renderDepositAdmin};
