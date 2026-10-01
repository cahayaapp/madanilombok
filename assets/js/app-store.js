import { getNode, listNode, getCurrentAcademicYearId } from "./repository.js";

const state = {
  master: null,
  yearId: "",
  year: null,
  loadedAt: 0
};

export async function loadMaster(force = false) {
  if (state.master && !force) return state.master;
  const [students, staff, classes, units, rooms, groups, subjects, programs, academicSchedules, dailySchedules, dormitories] = await Promise.all([
    listNode("students"), listNode("staff"), listNode("classes"), listNode("units"), listNode("rooms"),
    listNode("groups"), listNode("subjects"), listNode("programs"), listNode("schedules/academic"), listNode("schedules/daily"), listNode("dormitories")
  ]);
  const yearId = await getCurrentAcademicYearId();
  const [year, classAssignments, roomAssignments, groupAssignments] = await Promise.all([
    yearId ? getNode(`academic_years/${yearId}`) : null,
    yearId ? getNode(`assignments/classes/${yearId}`) : null,
    yearId ? getNode(`assignments/rooms/${yearId}`) : null,
    yearId ? getNode(`assignments/groups/${yearId}`) : null
  ]);
  state.yearId = yearId;
  state.year = year;
  state.master = {
    students, staff, classes, units, rooms, groups, subjects, programs, academicSchedules, dailySchedules, dormitories,
    classAssignments: classAssignments || {}, roomAssignments: roomAssignments || {}, groupAssignments: groupAssignments || {}
  };
  state.loadedAt = Date.now();
  return state.master;
}

export function currentAcademicYearId() { return state.yearId; }
export function currentAcademicYear() { return state.year; }
export function masterCache() { return state.master || {}; }
export function resetMaster() { state.master = null; }

export function byId(list = []) {
  return Object.fromEntries(list.map(row => [row.id, row]));
}

export function studentsForClass(classId, master = state.master) {
  if (!master) return [];
  const ids = Object.entries(master.classAssignments || {})
    .filter(([, a]) => a?.classId === classId)
    .map(([studentId]) => studentId);
  const map = byId(master.students || []);
  return ids.map(id => map[id]).filter(Boolean).sort((a,b) => (a.name || "").localeCompare(b.name || ""));
}

export function studentsForGroup(groupId, master = state.master) {
  if (!master) return [];
  const members = master.groupAssignments?.[groupId] || {};
  const map = byId(master.students || []);
  return Object.keys(members).map(id => map[id]).filter(Boolean).sort((a,b) => (a.name || "").localeCompare(b.name || ""));
}

export function childrenForParent(profile = {}, master = state.master) {
  if (!master) return [];
  const ids = profile.studentIds || (profile.studentId ? [profile.studentId] : []);
  const map = byId(master.students || []);
  return ids.map(id => map[id]).filter(Boolean);
}
