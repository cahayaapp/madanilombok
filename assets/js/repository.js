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
