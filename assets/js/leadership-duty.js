import {getNode,listNode} from './repository.js';
import {dataScope} from './leadership-data-model.js';
import {e,mount,action} from './teacher/ui.js';
import {validateDuty} from './leadership-duty-model.js';
export async function renderLeadershipDuty(ctx){
 const scope=dataScope(ctx.session);if(scope.school)throw Error('Pengaturan ini khusus kepala asrama.');
 const ws=mount(ctx,'Jadwal Piket Naqib','Atur petugas per shift dalam unit Anda. Perubahan langsung dipakai presensi dan laporan pelaksanaan.'),saved=await getNode('settings/naqibDuty/staff')||{};
 const users=await listNode('users'),naqibs=new Set(users.filter(u=>u.active!==false&&!u.accessRevoked&&(u.role==='naqib'||u.roleFlags?.naqib||u.roles?.includes?.('naqib'))).map(u=>u.staffId));
 const staff=(ctx.master.staff||[]).filter(s=>s.gender===scope.gender&&s.status!=='inactive'&&(naqibs.has(s.id)||saved[s.id]?.active));
 ws.innerHTML=`<section class="teacher-panel"><p>Shift I 00.00–08.00 · Shift II 08.00–16.00 · Shift III 16.00–24.00 WITA.</p><p>Aktifkan hanya personil yang memiliki akun dan role Naqib. Pengaturan ini tidak membuat akun atau memberi role baru.</p>${staff.map(s=>`<label class="field">${e(s.name)}<select data-staff="${e(s.id)}"><option value="">Tidak bertugas</option>${[1,2,3].map(n=>`<option value="shift${n}" ${saved[s.id]?.active&&saved[s.id]?.shiftId==='shift'+n?'selected':''}>Shift ${n}</option>`).join('')}</select></label>`).join('')}<button id="saveDuty" class="teacher-primary">Simpan Piket</button></section>`;
 action(ctx,ws.querySelector('#saveDuty'),async()=>{const {commitLeadershipData}=await import('./leadership-data-repository.js');for(const el of ws.querySelectorAll('[data-staff]')){const id=el.dataset.staff,old=saved[id]||null;if((old?.active?old.shiftId:'')===el.value)continue;if(!el.value&&!old)continue;const shiftId=el.value||old.shiftId,startMinute=['shift1','shift2','shift3'].indexOf(shiftId)*480,next=validateDuty({...old,staffId:id,gender:scope.gender,active:!!el.value,shiftId,startMinute,endMinute:startMinute+480},staff.find(s=>s.id===id),scope);if(next.active&&!naqibs.has(id))throw Error('Personil harus memiliki akun aktif dengan role Naqib.');saved[id]=await commitLeadershipData(`settings/naqibDuty/staff/${id}`,old,next,scope.uid);}await renderLeadershipDuty(ctx);ctx.root.querySelector('.teacher-errors').textContent='Jadwal piket berhasil disimpan.';});
}
