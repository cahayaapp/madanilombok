import {getNode,bulkPatchRoot} from './repository.js';
import {escapeHtml as e} from './utils.js';

// An incremental update only: bootstrap must never be rerun on an occupied database.
export async function renderSmpUpdate(host,session,options={}){
 const unit=options.unit||'SMP';
 host.innerHTML='<p>Memuat pembaruan SMP…</p>';
 try{
  const response=await fetch(options.packageUrl||'../seed/imports/smp-2026-2027-update.json');if(!response.ok)throw Error('Paket pembaruan tidak tersedia.');
  const pack=await response.json(),r=pack.report;
  host.innerHTML=`<h3>Pembaruan ${unit} 2026/2027</h3><p>${r.scheduleCount} slot pelajaran · ${r.homerooms} Wali Kelas · ${options.summary||`${r.activeMentoring} siswa binaan. PJOK gabungan mengikuti konfirmasi Anda.`}</p><p>${options.detail||'Menambahkan Hasrul Ali, Dinda Cahyati dan Muhammad Akbar. Kelas serta biodata kedua siswa baru masih perlu dilengkapi.'}</p><p id="smpStatus" role="status"></p><button class="btn btn-primary" id="applySmp">Terapkan Pembaruan ${unit}</button>`;
  const button=host.querySelector('#applySmp'),status=host.querySelector('#smpStatus');
  button.onclick=async()=>{button.disabled=true;try{
   const marker=await getNode(`settings/imports/${pack.id}`);if(marker){status.textContent='Pembaruan ini sudah diterapkan. Data terbaru tidak ditimpa ulang.';return;}
   const changes={},keys=Object.keys(pack.changes);
   // Read only the exact target nodes; merge staff roles and other fields rather than overwrite whole masters.
   for(let i=0;i<keys.length;i+=25)await Promise.all(keys.slice(i,i+25).map(async path=>{
    const value=pack.changes[path],old=await getNode(path);
    if(/^schedules\/academic\/[^/]+\/(status|supersededBy)$/.test(path)){const previous=await getNode(path.split('/').slice(0,-1).join('/'));if(!previous)return;if(previous.unitId!==`UNIT-${unit}`||previous.academicYearId!==r.academicYearId)throw Error('Jadwal lama tidak sesuai unit/tahun. Pembaruan dibatalkan.');}
    if(/^students\//.test(path)||/^staff\/[^/]+$/.test(path)){
     if(old&&old.name?.toLowerCase()!==value.name?.toLowerCase())throw Error(`ID ${path} sudah digunakan nama lain. Pembaruan dibatalkan.`);
     changes[path]=old?{...value,...old}:value;
    }else if(/\/appRoles$|\/unitIds$/.test(path))changes[path]=[...new Set([...(old||[]),...value])];
    else if(path.includes('/roleScopes/'))changes[path]={...old,...value,menteeStudentIds:[...new Set([...(old?.menteeStudentIds||[]),...(value.menteeStudentIds||[])])]};
    else changes[path]=value;
   }));
   const profiles=await getNode('users')||{};
   for(const [uid,p] of Object.entries(profiles)){
    if(!p.staffId||p.active===false||p.accessRevoked===true)continue;
    const staffNode=changes[`staff/${p.staffId}`],addRoles=changes[`staff/${p.staffId}/appRoles`]||staffNode?.appRoles;
    if(!addRoles)continue;
    const roles=Array.isArray(p.roles)?p.roles:Object.keys(p.roles||{}).filter(k=>p.roles[k]);
    changes[`users/${uid}/roles`]=[...new Set([...roles,p.role,...addRoles].filter(Boolean))];
    for(const role of addRoles)changes[`users/${uid}/roleFlags/${role}`]=true;
    const mentoring=changes[`staff/${p.staffId}/roleScopes/guru_wali`]||staffNode?.roleScopes?.guru_wali;
    if(mentoring)changes[`users/${uid}/roleScopes/guru_wali`]={...p.roleScopes?.guru_wali,...mentoring,menteeStudentIds:[...new Set([...(p.roleScopes?.guru_wali?.menteeStudentIds||[]),...mentoring.menteeStudentIds])]};
    const teaching=Object.entries(pack.changes).filter(([path,r])=>path.startsWith('schedules/academic/')&&r.teacherStaffId===p.staffId).map(([,r])=>r);
    if(teaching.length){const old=p.roleScopes?.guru_mapel||{},alreadyTeacher=roles.includes('guru_mapel')||p.role==='guru_mapel',oldClasses=old.classIds||p.classIds||[],oldSubjects=old.subjectIds||p.subjectIds||[];changes[`users/${uid}/roleScopes/guru_mapel`]={...old,unitIds:[...new Set([...(old.unitIds||p.unitIds||[]),`UNIT-${unit}`])],classIds:alreadyTeacher&&!oldClasses.length?[]:[...new Set([...oldClasses,...teaching.map(s=>s.classId)])],subjectIds:alreadyTeacher&&!oldSubjects.length?[]:[...new Set([...oldSubjects,...teaching.map(s=>s.subjectId)])]};}
    changes[`users/${uid}/accessVersion`]=(p.accessVersion||0)+1;
   }
   changes[`settings/imports/${pack.id}`]={appliedAt:Date.now(),appliedBy:session.user.uid,report:r};
   await bulkPatchRoot(changes,session.user.uid,pack.id);
   status.textContent=`Pembaruan ${unit} tersimpan. Masuk ulang pada akun guru untuk memuat jadwal dan penugasan terbaru.`;
  }catch(error){status.textContent=error.message;button.disabled=false;}};
 }catch(error){host.innerHTML=`<p>${e(error.message)}</p>`;}
}

export function renderSdUpdate(host,session){return renderSmpUpdate(host,session,{unit:'SD',packageUrl:'../seed/imports/sd-2026-2027-update.json',summary:'Sheet1 resmi. Jadwal lama dinonaktifkan; riwayat tetap tersimpan.',detail:'Miftahussurur ditambahkan. Pengampu kegiatan yang belum ditentukan dan jam selesai Asar tetap perlu dilengkapi. Kelas VI memiliki jadwal 14.30–15.30 yang beririsan dengan Asar pukul 15.00 sesuai sumber.'});}
