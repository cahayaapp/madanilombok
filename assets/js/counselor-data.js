import {getCurrentAcademicYearId,listNode} from './repository.js';
let initial=null;
// Begin I/O before the student roster finishes. Consume once to avoid stale claims.
export function prefetchCounselorCases(){initial=getCurrentAcademicYearId().then(async year=>({year,rows:year?await listNode(`boarding/cases/${year}`):[]})).catch(error=>({error}));}
export async function readCounselorCases(year){if(!year)throw Error("Tahun ajaran aktif belum tersedia.");if(initial){const pending=initial;initial=null;const result=await pending;if(!result.error&&result.year===year)return result.rows;}return listNode(`boarding/cases/${year}`);}
