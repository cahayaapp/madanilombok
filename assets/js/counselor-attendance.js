import {icon} from './teacher/ui.js';
import {counselorLevel,routeCounselorCase} from './counselor-model.js';
import {loading} from './loading-ui.js';
import {attendanceReferrals} from './attendance-referrals.js';
import {counselorGender} from './boarding-personnel-scope.js';
import {getNode,saveTeacherSession} from './repository.js';
import {escapeHtml as e} from './utils.js';
import {localDate} from './role-experience.js';
export function mountAttendanceReferrals(ctx,cases){
 const host=document.createElement('section');host.className='panel counselor-attendance-panel';ctx.root.append(host);
 const end=localDate(),start=new Date(Date.parse(end+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 host.innerHTML='<div class="counselor-attendance-toolbar"><div class="counselor-filter-heading"><span aria-hidden="true">'+icon('calendar')+'</span><div><h3>Pemeriksaan Presensi Santri</h3><p>Pilih rentang tanggal untuk meninjau presensi.</p></div></div><label>Dari<input type="date" id="referralFrom" value="'+start+'"></label><label>Sampai<input type="date" id="referralTo" value="'+end+'"></label><button class="btn btn-secondary" id="loadReferrals">'+icon('search')+'Periksa Presensi</button></div><p class="counselor-referral-note">Alfa dan terlambat dari presensi final perlu diklarifikasi; bukan keputusan pelanggaran atau poin otomatis.</p><div id="referralResults" aria-live="polite"></div>';
 const result=host.querySelector('#referralResults'),button=host.querySelector('#loadReferrals');
 button.onclick=async()=>{button.disabled=true;result.innerHTML=loading('Memuat presensi…');
 try{
 const from=host.querySelector('#referralFrom').value,to=host.querySelector('#referralTo').value;
 if(!from||!to||from>to||to>end||Date.parse(to)-Date.parse(from)>30*86400000)throw Error('Pilih rentang maksimal 31 hari sampai hari ini.');
 const [boarding,learning]=await Promise.all([getNode('boarding/program_attendance/'+ctx.yearId),getNode('academic/learning_sessions/'+ctx.yearId)]);
 const historyFrom=new Date(Date.parse(from+'T12:00:00Z')-2*86400000).toISOString().slice(0,10);
 const all=attendanceReferrals({master:ctx.master,gender:counselorGender(ctx.session.profile),boarding,learning,from:historyFrom,to}).map(r=>({...r,category:'Kedisiplinan'}));
 const rows=all.filter(r=>r.date>=from&&routeCounselorCase(r,[...cases,...all]).level===counselorLevel(ctx.session.profile)),known=new Set(cases.map(c=>c.attendanceSourceId));
 result.innerHTML=rows.map((r,i)=>'<article class="admin-program-card"><h3>'+e(ctx.master.students.find(s=>s.id===r.studentId)?.name||r.studentId)+'</h3><p>'+e(r.date+' · '+r.context+' · '+r.status)+'</p><p>'+e(r.note)+'</p>'+(known.has(r.sourceId)?'<span class="badge">Sudah menjadi laporan kasus</span>':'<button class="btn btn-secondary" data-referral="'+i+'">Buat Laporan Klarifikasi</button>')+'</article>').join('')||'<p>Tidak ada presensi final Alfa/Terlambat dalam unit dan periode ini.</p>';
 result.querySelectorAll('[data-referral]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=rows[Number(b.dataset.referral)];
 const parts=r.sourcePath.split('/');
 const source=parts[0]==='boarding'?await getNode('boarding/program_attendance/'+ctx.yearId+'/'+parts.slice(1).join('/')):await getNode('academic/learning_sessions/'+ctx.yearId+'/'+parts.slice(1,-1).join('/'));
 const current=parts[0]==='boarding'?source:source?.students?.[r.studentId];
 if(!current||source.stage!=='FINAL'||current.status!==r.status||current.attendanceManagedBy==='GEMA')throw Error('Presensi sudah berubah. Muat ulang sebelum membuat laporan.');
 await saveTeacherSession('boarding/cases/'+ctx.yearId+'/'+r.id,{routeLevel:routeCounselorCase(r,[...cases,...all]).level,routeReason:routeCounselorCase(r,[...cases,...all]).reason,studentId:r.studentId,date:r.date,category:'Kedisiplinan',severity:'ringan',status:'menunggu_konselor',description:'Perlu klarifikasi presensi '+r.status+' pada '+r.context+'. '+r.note,attendanceSourceId:r.sourceId,attendanceSourcePath:r.sourcePath,attendanceStatus:r.status,reportedBy:ctx.session.user.uid,reportedByRole:'konselor',handlingRole:'konselor'},{createOnly:true,actorUid:ctx.session.user.uid});ctx.rerender();
 }catch(err){b.disabled=false;result.append(document.createTextNode('Gagal: '+err.message));}});
 }catch(err){result.textContent=err.message;}finally{button.disabled=false;}
 };
}
