// Only the programs explicitly requested on 10 October are attendance/report items.
// The complete 24-hour timetable remains available as a guidance schedule.
export const NAQIB_PROGRAM_KINDS=['tahajjud','subuh','zuhur','ashar','magrib','isya','makan_pagi','makan_siang','makan_malam','pengecekan_tidur','apel_transisi','apel_pagi','senam'];
export function naqibProgramKind(schedule,program){
 if(schedule?.naqibAttendance===false||program?.status==='inactive')return null;

 const kind=schedule?.naqibProgramKind;
 if(kind)return NAQIB_PROGRAM_KINDS.includes(kind)&&!(schedule?.participantScope==='boarding_gema'&&kind==='apel_transisi')?kind:null;
 const name=(program?.name||'').toLowerCase().replace(/^asrama (?:umum|gema) \d{2}:\d{2}\s*·\s*/,'').trim();
 const names={
  'sholat tahajjud':'tahajjud','salat tahajud':'tahajjud',
  'sholat subuh':'subuh','salat subuh':'subuh',
  'sholat zuhur':'zuhur','salat zuhur':'zuhur',
  'sholat asar':'ashar','sholat ashar':'ashar','salat asar':'ashar',
  'sholat magrib':'magrib','salat magrib':'magrib','sholat maghrib':'magrib',
  'sholat isya':'isya','salat isya':'isya',
  'apel transisi pondok-formal':'apel_transisi','apel transisi pondok–formal':'apel_transisi'
 };
 return names[name]||null;
}
