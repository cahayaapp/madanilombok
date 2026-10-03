// Effective-dated Quran placement, keyed by Madani student IDs. No source-school roster.
export function programPlacement(studentId, date, records, yearId) {
  const rows = Object.entries(records || {}).filter(([, r]) => r && r.studentId === studentId && r.academicYearId === yearId && r.status !== 'inactive' && r.effectiveFrom && r.effectiveFrom <= date)
    .sort(([a, x], [b, y]) => x.effectiveFrom.localeCompare(y.effectiveFrom) || Number(x.updatedAt || 0) - Number(y.updatedAt || 0) || a.localeCompare(b));
  const entry = rows.at(-1);
  return entry ? {placementId: entry[0], programQuran: entry[1].programQuran, tahsinLevel: entry[1].programQuran === 'TAHSIN' ? entry[1].tahsinLevel || null : null, effectiveFrom: entry[1].effectiveFrom} : {programQuran: null, tahsinLevel: null};
}

export function programEligible(kind, placement) {
  const key = kind.toUpperCase();
  if (key.startsWith('TAHSIN_LEVEL_')) return placement.programQuran === 'TAHSIN' && placement.tahsinLevel === key.slice(7);
  if (key === 'TAHSIN') return placement.programQuran === 'TAHSIN';
  // Cahaya's Tahfiz roster is the complement of Tahsin, including unplaced students.
  if (key === 'TAHFIZ') return placement.programQuran !== 'TAHSIN';
  return true;
}

export function subjectEligible(schema, name) {
  const quran = /al\s*[- ]?qur|qur[’'`]?an/i.test(name);
  if (schema === 'tahfiz') return quran || /tahfi[dz]/i.test(name);
  if (schema.startsWith('tahsin')) return quran || /tahsin/i.test(name);
  if (schema === 'bahasa_arab') return /bahasa\s*arab/i.test(name);
  return !quran && !/bahasa\s*arab|tahfi[dz]|tahsin/i.test(name);
}
