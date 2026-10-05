import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  serverTimestamp,
  runTransaction,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./firebase.js";
import { appConfig } from "../../config/firebase-config.js";

const root = appConfig.databaseRoot;
const pathFor = path => `${root}/${path || ""}`.replace(/\/{2,}/g, "/").replace(/\/$/, "");

export async function getNode(path) {
  const snap = await get(ref(db, pathFor(path)));
  return snap.exists() ? snap.val() : null;
}

export async function listNode(path) {
  const value = await getNode(path);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([id, data]) => ({ id, ...(data || {}) }));
}

export async function setNode(path, value) {
  await set(ref(db, pathFor(path)), value);
  return value;
}

export async function patchNode(path, data) {
  await update(ref(db, pathFor(path)), data);
  return data;
}

export async function removeNode(path) {
  await remove(ref(db, pathFor(path)));
}

export async function pushRecord(path, data, actorUid = null) {
  const target = push(ref(db, pathFor(path)));
  const payload = {
    ...data,
    createdAt: Date.now(),
    createdBy: actorUid || null,
    updatedAt: Date.now(),
    updatedBy: actorUid || null
  };
  await set(target, payload);
  await writeAudit("create", path, target.key, actorUid, data);
  return { id: target.key, ...payload };
}

export async function saveRecord(path, id, data, actorUid = null) {
  const clean = { ...data };
  Object.keys(clean).forEach(key => clean[key] === undefined && delete clean[key]);
  const previous = await getNode(`${path}/${id}`);
  const payload = {
    ...clean,
    updatedAt: Date.now(),
    updatedBy: actorUid || null,
    createdAt: previous?.createdAt || Date.now(),
    createdBy: previous?.createdBy || actorUid || null
  };
  await set(ref(db, pathFor(`${path}/${id}`)), payload);
  await writeAudit(previous ? "update" : "create", path, id, actorUid, clean);
  return payload;
}

export async function deleteRecord(path, id, actorUid = null) {
  const previous = await getNode(`${path}/${id}`);
  await remove(ref(db, pathFor(`${path}/${id}`)));
  await writeAudit("delete", path, id, actorUid, previous || {});
}

export async function setCurrentAcademicYear(yearId, actorUid = null) {
  await set(ref(db, pathFor("settings/currentAcademicYearId")), yearId);
  await writeAudit("set_current_year", "settings", "currentAcademicYearId", actorUid, { yearId });
}

export async function getCurrentAcademicYearId() {
  return (await getNode("settings/currentAcademicYearId")) || "";
}

export async function assignClass(yearId, studentId, classId, actorUid = null) {
  const payload = { studentId, classId, academicYearId: yearId, assignedAt: Date.now(), assignedBy: actorUid || null };
  await set(ref(db, pathFor(`assignments/classes/${yearId}/${studentId}`)), payload);
  await writeAudit("assign_class", "assignments/classes", studentId, actorUid, payload);
}

export async function unassignClass(yearId, studentId, actorUid = null) {
  await remove(ref(db, pathFor(`assignments/classes/${yearId}/${studentId}`)));
  await writeAudit("unassign_class", "assignments/classes", studentId, actorUid, { academicYearId: yearId });
}

export async function assignRoom(yearId, studentId, roomId, actorUid = null) {
  const payload = { studentId, roomId, academicYearId: yearId, assignedAt: Date.now(), assignedBy: actorUid || null };
  await set(ref(db, pathFor(`assignments/rooms/${yearId}/${studentId}`)), payload);
  await writeAudit("assign_room", "assignments/rooms", studentId, actorUid, payload);
}

export async function unassignRoom(yearId, studentId, actorUid = null) {
  await remove(ref(db, pathFor(`assignments/rooms/${yearId}/${studentId}`)));
  await writeAudit("unassign_room", "assignments/rooms", studentId, actorUid, { academicYearId: yearId });
}

export async function setGroupMembership(yearId, groupId, studentId, enabled, actorUid = null) {
  const target = ref(db, pathFor(`assignments/groups/${yearId}/${groupId}/${studentId}`));
  if (enabled) {
    const payload = { studentId, groupId, academicYearId: yearId, assignedAt: Date.now(), assignedBy: actorUid || null };
    await set(target, payload);
    await writeAudit("assign_group", "assignments/groups", studentId, actorUid, payload);
  } else {
    await remove(target);
    await writeAudit("unassign_group", "assignments/groups", studentId, actorUid, { groupId, academicYearId: yearId });
  }
}

export async function getClassAssignments(yearId) {
  return (await getNode(`assignments/classes/${yearId}`)) || {};
}
export async function getRoomAssignments(yearId) {
  return (await getNode(`assignments/rooms/${yearId}`)) || {};
}
export async function getGroupAssignments(yearId, groupId) {
  return (await getNode(`assignments/groups/${yearId}/${groupId}`)) || {};
}

export async function bulkSave(path, rows, idSelector, actorUid = null) {
  const changes = {};
  const now = Date.now();
  rows.forEach(row => {
    const id = idSelector(row);
    changes[`${path}/${id}`] = {
      ...row,
      updatedAt: now,
      updatedBy: actorUid || null,
      createdAt: row.createdAt || now,
      createdBy: row.createdBy || actorUid || null
    };
  });
  await update(ref(db, pathFor("")), changes);
  await writeAudit("bulk_import", path, `batch-${now}`, actorUid, { count: rows.length });
}

export async function bulkPatchRoot(changes, actorUid = null, auditLabel = "bulk_patch") {
  await update(ref(db, pathFor("")), changes);
  await writeAudit(auditLabel, "root", `batch-${Date.now()}`, actorUid, { count: Object.keys(changes).length });
}

export async function transact(path, updater) {
  const result = await runTransaction(ref(db, pathFor(path)), current => updater(current));
  return result.snapshot.val();
}

export async function writeAudit(action, entity, entityId, actorUid, detail = {}) {
  try {
    const auditRef = push(ref(db, pathFor("audit_logs")));
    await set(auditRef, {
      action,
      entity,
      entityId,
      actorUid: actorUid || null,
      detail,
      timestamp: Date.now(),
      serverTimestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("Audit log gagal:", err);
  }
}

/** Additive workspace records: server clock and audit in one atomic update. */
export async function createWorkspaceRecord(path, data, actorUid) {
  const target=push(ref(db,pathFor(path)));
  const audit=push(ref(db,pathFor('audit_logs')));
  const record={...data,createdBy:actorUid,updatedBy:actorUid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await update(ref(db,pathFor('')),{
    [`${path}/${target.key}`]:record,
    [`audit_logs/${audit.key}`]:{action:'workspace_create',path,recordId:target.key,actorUid,createdAt:serverTimestamp()}
  });
  return {id:target.key,...record};
}

/** Compare-and-transition prevents stale screens from overwriting newer workflow state. */
export async function transitionWorkspaceRecord(path, id, transition, actorUid) {
  await get(ref(db,pathFor(`${path}/${id}`)));
  let rejection='Rekam tidak ditemukan.';
  const result=await runTransaction(ref(db,pathFor(`${path}/${id}`)),current=>{
    if(!current)return;
    try {
      const next=transition(current);
      return {...next,updatedAt:serverTimestamp(),updatedBy:actorUid};
    } catch(error){rejection=error.message;return;}
  },{applyLocally:false});
  if(!result.committed)throw new Error(rejection);
  return result.snapshot.val();
}

export async function saveWorkspaceRecord(path,id,data,actorUid) {
  const previous=await getNode(`${path}/${id}`);
  const audit=push(ref(db,pathFor('audit_logs')));
  const record={...data,createdBy:previous?.createdBy||actorUid,createdAt:previous?.createdAt||serverTimestamp(),updatedBy:actorUid,updatedAt:serverTimestamp()};
  await update(ref(db,pathFor('')),{
    [`${path}/${id}`]:record,
    [`audit_logs/${audit.key}`]:{action:previous?'workspace_update':'workspace_create',path,recordId:id,actorUid,createdAt:serverTimestamp()}
  });
  return record;
}

/** Observe profile revocation/role changes without waiting for another login. */
export function watchUserProfile(uid,callback,onError){
  return onValue(ref(db,pathFor(`users/${uid}`)),snapshot=>callback(snapshot.val()),onError);
}

/** Atomic teacher session revision. A repeated check-in returns the original timestamp. */
export async function saveTeacherSession(path,payload,{expectedVersion=null,createOnly=false,actorUid}={}) {
  const initial=await get(ref(db,pathFor(path)));
  if(createOnly&&initial.exists())return initial.val();
  let rejection='Data telah berubah. Muat ulang sebelum menyimpan.';
  const result=await runTransaction(ref(db,pathFor(path)),current=>{
    if(createOnly&&current)return;
    if(expectedVersion!==null&&(current?.version||0)!==expectedVersion)return;
    if(current?.teacherUid&&current.teacherUid!==actorUid){rejection='Sesi ini telah dicatat guru lain.';return;}
    return {...payload,createdBy:current?.createdBy||actorUid,createdAt:current?.createdAt||serverTimestamp(),updatedBy:actorUid,updatedAt:serverTimestamp()};
  },{applyLocally:false});
  if(!result.committed){if(createOnly&&result.snapshot.exists())return result.snapshot.val();throw Error(rejection);}
  return result.snapshot.val();
}

/** UKS stock, examination and permission changes commit together, independent of finance. */
export async function commitHealthOperation(yearId,operation,actorUid){
 const {applyHealthOperation}=await import('./health-model.js');
 const profile=await getNode(`users/${actorUid}`);
 const roles=new Set([profile?.role,...(Array.isArray(profile?.roles)?profile.roles:[]),...Object.keys(profile?.roleFlags||{}).filter(r=>profile.roleFlags[r])]);
 if(!profile||profile.active===false||profile.accessRevoked===true)throw Error('Akun tidak aktif.');
 const decision=operation.type==='permit-decision',allowed=decision?['director','deputy_director','admin','super_admin']:['kesehatan','admin','super_admin'];
 if(!allowed.some(r=>roles.has(r)))throw Error('Role tidak berwenang menyimpan operasi UKS ini.');
 let rejection='Perubahan UKS belum dapat disimpan.';
 const path=decision?`health/${yearId}/permits/${operation.examId}`:`health/${yearId}`;
 await get(ref(db,pathFor(path)));
 const result=await runTransaction(ref(db,pathFor(path)),current=>{
  try{
   if(decision)return applyHealthOperation({permits:{[operation.examId]:current}},operation,actorUid,Date.now()).permits[operation.examId];
   return applyHealthOperation(current,operation,actorUid,Date.now());
  }catch(error){rejection=error.message;return;}
 },{applyLocally:false});
 if(!result.committed)throw Error(rejection);
 if(operation.type==='exam'&&operation.data?.learningStatus==='TIDAK_MENGIKUTI'){try{await correctHealthAttendance(yearId,operation.id,operation.data.studentId,actorUid);}catch(error){throw Error('Pemeriksaan dan stok sudah tersimpan; sinkronisasi absensi belum selesai. Tekan Simpan kembali dengan data yang sama. '+error.message);}}
 return result.snapshot.val();
}

/** Case is authoritative; deterministic projections can be repaired by retrying the same operation. */
export async function commitCaseOperation(yearId,caseId,operation,session){
 const {applyCaseOperation}=await import('./counselor-model.js');
 const record=await transitionWorkspaceRecord(`boarding/cases/${yearId}`,caseId,current=>applyCaseOperation(current,operation,session,Date.now()),session.user.uid);
 const projections={};
 if(operation.type==='session')projections[`boarding/counseling/${yearId}/${caseId}/${operation.id}`]=record.sessions[operation.id];
 if(operation.type==='action')projections[`boarding/case_actions/${yearId}/${operation.id}`]={...record.actions[operation.id],caseId,studentId:record.studentId};
 if(operation.type==='points')projections[`discipline/points/${yearId}/${record.studentId}/${operation.id}`]={...record.pointRecord,caseId};
 if(operation.type==='escalation')projections[`boarding/escalations/${yearId}/${operation.id}`]={...record.escalations[operation.id],caseId,studentId:record.studentId,createdByUid:session.user.uid,status:'menunggu_arahan'};
 if(Object.keys(projections).length)await update(ref(db,pathFor('')),projections);
 return record;
}

/** Retroactive UKS correction is a retryable projection of an already committed examination. */
export async function correctHealthAttendance(yearId,examId,studentId,actorUid){
 const {correctAttendanceFromHealth}=await import('./health-model.js');
 const memo=await getNode(`health/${yearId}/learning_memos/${studentId}/${examId}`);
 if(!memo?.excusedFromLearning)return {count:0};
 const [assignment,schedules,programs]=await Promise.all([getNode(`assignments/classes/${yearId}/${studentId}`),listNode('schedules/academic'),getNode(`boarding/program_attendance/${yearId}/${memo.date}`)]);
 const staffIds=[...new Set(schedules.filter(s=>(!s.academicYearId||s.academicYearId===yearId)&&(s.classIds||s.combinedClassIds||[s.classId]).includes(assignment?.classId)).map(s=>s.staffId||s.teacherStaffId).filter(Boolean))];
 const sessions=await Promise.all(staffIds.map(async id=>[id,await getNode(`academic/learning_sessions/${yearId}/${id}/${memo.date}`)]));
 const targets=[];
 for(const [staff,rows]of sessions)for(const [id,row]of Object.entries(rows||{}))if(row.students?.[studentId]?.status==='Alfa')targets.push(`academic/learning_sessions/${yearId}/${staff}/${memo.date}/${id}/students/${studentId}`);
 for(const [id,rows]of Object.entries(programs||{}))if(rows?.[studentId]?.status==='Alfa')targets.push(`boarding/program_attendance/${yearId}/${memo.date}/${id}/${studentId}`);
 let count=0;
 for(const path of targets){const result=await runTransaction(ref(db,pathFor(path)),current=>{if(current?.status!=='Alfa')return;return correctAttendanceFromHealth(current,memo,examId,actorUid,Date.now());},{applyLocally:false});if(result.committed)count++;}
 return {count};
}

/** Reopen only status/revision metadata; the existing grades stay intact. */
export async function requestExamRevision(yearId,staffId,recordId,reason,actorUid){
 const {examRevisionChanges}=await import('./academic-review.js');
 const profile=await getNode(`users/${actorUid}`),roles=new Set([profile?.role,...(Array.isArray(profile?.roles)?profile.roles:[]),...Object.keys(profile?.roleFlags||{}).filter(r=>profile.roleFlags[r])]);
 if(profile?.active===false||profile?.accessRevoked||!['head_formal_school','admin','super_admin'].some(r=>roles.has(r)))throw Error('Revisi dibuka oleh Kepala Sekolah atau administrator.');
 const path=`academic/exam_sessions/${yearId}/${staffId}/${recordId}`,record=await getNode(path);
 if(!record||record.staffId!==staffId)throw Error('Sesi nilai tidak ditemukan.');
 if(!roles.has('admin')&&!roles.has('super_admin')){const scope=profile.roleScopes?.head_formal_school||profile,ids=record.classIds||[record.classId];if(scope.classIds?.length&&ids.some(id=>!scope.classIds.includes(id)))throw Error('Kelas di luar penugasan.');if(scope.unitIds?.length){const classes=await Promise.all(ids.map(id=>getNode(`classes/${id}`)));if(classes.some(c=>!scope.unitIds.includes(c?.unitId)))throw Error('Unit sekolah di luar penugasan.');}}
 await update(ref(db,pathFor(path)),examRevisionChanges(record,reason,actorUid,Date.now()));
}

export async function commitReportPublication(yearId,request,actorUid){
 const {reportKey,reportReadiness,mutatePublication,rankClassReports}=await import('./report-publication.js');
 const profile=await getNode(`users/${actorUid}`),roles=new Set([profile?.role,...(Array.isArray(profile?.roles)?profile.roles:[]),...Object.keys(profile?.roleFlags||{}).filter(r=>profile.roleFlags[r])]);
 if(!profile||profile.active===false||profile.accessRevoked||!roles.has(request.role))throw Error('Role peninjau tidak aktif.');
 const [assignment,student,schedules,tree]=await Promise.all([getNode(`assignments/classes/${yearId}/${request.studentId}`),getNode(`students/${request.studentId}`),listNode('schedules/academic'),getNode(`academic/exam_sessions/${yearId}`)]);
 if(assignment?.classId!==request.classId||!student)throw Error('Penempatan santri berubah.');
 const scope=profile.roleScopes?.[request.role]||profile;
 if(scope.unitIds?.length&&!scope.unitIds.includes(student.unitId)||scope.classIds?.length&&!scope.classIds.includes(request.classId))throw Error('Santri di luar penugasan.');
 const assignments=await getNode(`assignments/classes/${yearId}`)||{};
 const sessions=[];function walk(v){if(!v||typeof v!=='object')return;if(v.schema&&v.students){sessions.push(v);return;}Object.values(v).forEach(walk);}walk(tree);
 const readiness=reportReadiness(sessions,schedules.filter(s=>!s.academicYearId||s.academicYearId===yearId),request.studentId,request.classId,request.type,request.period),path=`academic/report_publications/${yearId}/${request.studentId}/${reportKey(request.type,request.period)}`,target=ref(db,pathFor(path));
 const ranking=rankClassReports(Object.entries(assignments).filter(([,a])=>a.classId===request.classId).map(([studentId])=>({studentId,readiness:reportReadiness(sessions,schedules.filter(s=>!s.academicYearId||s.academicYearId===yearId),studentId,request.classId,request.type,request.period)}))).find(r=>r.studentId===request.studentId)||null;
 await get(target);let failure;const result=await runTransaction(target,current=>{try{return mutatePublication(current,request.action,{...request,actorUid,actorName:profile.name||'',readiness,ranking,now:Date.now()});}catch(error){failure=error;return;}},{applyLocally:false});
 if(!result.committed)throw failure||Error('Publikasi belum tersimpan.');return result.snapshot.val();
}

export async function submitFindingResponse(yearId,findingId,id,data,actorUid){
 const [finding,profile]=await Promise.all([getNode(`workspaces/${yearId}/findings/${findingId}`),getNode(`users/${actorUid}`)]);
 if(!profile||profile.active===false||profile.accessRevoked||finding?.assigneeUid!==actorUid||['RESOLVED','DISMISSED'].includes(finding.status))throw Error('Temuan tidak ditugaskan kepada Anda atau sudah ditutup.');
 if(!data.result?.trim()||!data.evidence?.trim())throw Error('Isi hasil dan bukti tindak lanjut.');
 const target=ref(db,pathFor(`workspaces/${yearId}/finding_responses/${id}`)),existing=await get(target);if(existing.exists()){const old=existing.val();if(old.actorUid!==actorUid||old.findingId!==findingId)throw Error('ID tindak lanjut sudah digunakan.');return old;}
 const result=await runTransaction(target,current=>current||{findingId,actorUid,actorName:profile.name||'',result:data.result.trim(),evidence:data.evidence.trim(),createdAt:Date.now()},{applyLocally:false});
 if(!result.committed)throw Error('Tindak lanjut belum tersimpan.');return result.snapshot.val();
}
