import {icon} from './teacher/ui.js';
import {routeCounselorCase} from './counselor-model.js';
import {loading} from './loading-ui.js';
import {attendanceReferrals,attendanceCase,unrepresentedAttendance} from './attendance-referrals.js';
import {counselorGender} from './boarding-personnel-scope.js';
import {getNode,saveTeacherSession} from './repository.js';
import {escapeHtml as e} from './utils.js';
import {localDate} from './role-experience.js';
// Opening the inbox is read-only. Persist a candidate only when a counselor claims it.
export async function materializeAttendanceCase(ctx,r,history){
 const parts=r.attendanceSourcePath.split('/');
 const source=parts[0]==='boarding'?await getNode('boarding/program_attendance/'+ctx.yearId+'/'+parts.slice(1).join('/')):await getNode('academic/learning_sessions/'+ctx.yearId+'/'+parts.slice(1,-1).join('/'));
 const current=parts[0]==='boarding'?source:source?.students?.[r.studentId];
 if(!current||source.stage!=='FINAL'||current.status!==r.attendanceStatus||current.attendanceManagedBy==='GEMA')throw Error('Presensi sudah berubah. Muat ulang sebelum mengambil kasus.');
 const {virtualAttendance,...payload}=r;
 return saveTeacherSession('boarding/cases/'+ctx.yearId+'/'+r.id,{...payload,routeLevel:routeCounselorCase(r,history).level,routeReason:routeCounselorCase(r,history).reason,reportedBy:ctx.session.user.uid,reportedByRole:'konselor',handlingRole:'konselor'},{createOnly:true,actorUid:ctx.session.user.uid});
}
export function mountAttendanceReferrals(ctx,cases,onLoaded){
 const host=document.createElement('section');host.className='panel counselor-attendance-panel';ctx.root.append(host);
 const end=localDate(),start=new Date(Date.parse(end+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 host.innerHTML='<div class="counselor-attendance-toolbar"><div class="counselor-filter-heading"><span aria-hidden="true">'+icon('calendar')+'</span><div><h3>Kasus dari Laporan & Presensi</h3><p>Presensi final otomatis ditinjau untuk tujuh hari terakhir.</p></div></div><label>Dari<input type="date" id="referralFrom" value="'+start+'"></label><label>Sampai<input type="date" id="referralTo" value="'+end+'"></label><button class="btn btn-secondary" id="loadReferrals">'+icon('search')+'Periksa Presensi</button></div><p class="counselor-referral-note">Alfa dan terlambat masuk sebagai kandidat klarifikasi. Ambil kasus untuk memulai tabayyun; tidak ada poin otomatis. Laporan manual tetap ditampilkan.</p><div id="referralResults" aria-live="polite"></div>';
 const result=host.querySelector('#referralResults'),button=host.querySelector('#loadReferrals');
 button.onclick=async()=>{button.disabled=true;result.innerHTML=loading('Memuat presensi…');
 try{
 const from=host.querySelector('#referralFrom').value,to=host.querySelector('#referralTo').value;
 if(!from||!to||from>to||to>end||Date.parse(to)-Date.parse(from)>30*86400000)throw Error('Pilih rentang maksimal 31 hari sampai hari ini.');
 const [boarding,learning]=await Promise.all([getNode('boarding/program_attendance/'+ctx.yearId),getNode('academic/learning_sessions/'+ctx.yearId)]);
 const historyFrom=new Date(Date.parse(from+'T12:00:00Z')-2*86400000).toISOString().slice(0,10);
 const all=attendanceReferrals({master:ctx.master,gender:counselorGender(ctx.session.profile),boarding,learning,from:historyFrom,to}).map(attendanceCase);
 const rows=unrepresentedAttendance(all,cases).filter(r=>r.date>=from);
 if(!host.isConnected)return;
 onLoaded(rows,[...cases,...unrepresentedAttendance(all,cases)]);
 result.textContent='Presensi final telah diperiksa. Kandidat ditampilkan bersama laporan sesuai tingkat konselor.';
 }catch(err){result.textContent='Presensi belum dapat diperiksa: '+err.message+' Laporan manual tetap tersedia. Klik Periksa Presensi untuk mencoba lagi.';}finally{button.disabled=false;}
 };
 void button.onclick();
}
