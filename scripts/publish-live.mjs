// Reads only the named Madani source nodes, and writes only madani_live.
// Credentials come from the deployment environment; never embedded in frontend code.
import {pathToFileURL} from 'node:url';
import {firebaseConfig} from '../config/firebase-config.js';
import {buildLiveUnits} from '../assets/js/live-projection.js';
import {validateLiveSnapshot} from '../assets/js/live-model.js';
import {campusClock} from '../assets/js/live-prayer.js';

const databaseURL=firebaseConfig.databaseURL,root='madani_app';
export async function publishLive({token,fetcher=fetch,now=new Date(),check=false}={}){
 token??=process.env.MADANI_LIVE_ACCESS_TOKEN;
 if(!token)throw Error('Identitas penerbit otomatis belum tersedia.');
 const request=async(path,method='GET',value)=>{
  const url=new URL(`${path}.json`,databaseURL);url.searchParams.set('access_token',token);
  const response=await fetcher(url,{method,headers:method==='GET'?undefined:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value),signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error(`Sumber ${path} gagal (${response.status}).`);
  return response.status===204?null:response.json();
 };
 const read=path=>request(`${root}/${path}`),year=await read('settings/currentAcademicYearId');
 if(typeof year!=='string'||!year||year.includes('/'))throw Error('Tahun ajaran aktif belum tersedia.');
 const date=campusClock(now).date;
 const masterPaths={students:'students',staff:'staff',users:'users',classes:'classes',groups:'groups',units:'units',subjects:'subjects',academicSchedules:'schedules/academic',dailySchedules:'schedules/daily',classAssignments:`assignments/classes/${year}`,groupAssignments:`assignments/groups/${year}`};
 const sourcePaths={quran:`academic/quran_records/${year}`,learning:`academic/learning_sessions/${year}`,teacherAttendance:`academic/teaching_attendance/${year}`,legacyTeachers:`academic/teacher_attendance/${year}`,legacyStudents:`academic/student_attendance/${year}`,teacherLeaves:`academic/teacher_leaves/${year}`,boarding:`boarding/program_attendance/${year}/${date}`,calendar:'parent/calendar'};
 const object=async paths=>Object.fromEntries(await Promise.all(Object.entries(paths).map(async([key,path])=>[key,await read(path)])));
 const [raw,sources]=await Promise.all([object(masterPaths),object(sourcePaths)]);
 if(!raw.students||!raw.staff||!raw.classes)throw Error('Master santri, staf, atau kelas belum tersedia.');
 const master=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,key.endsWith('Assignments')?value||{}:Object.entries(value||{}).map(([id,row])=>({...row,id}))]));
 const snapshots=buildLiveUnits({master,sources,year,now});
 for(const snapshot of Object.values(snapshots))validateLiveSnapshot(snapshot,+now);
 if(campusClock().date!==date)throw Error('Hari WITA berubah. Ulangi penerbitan.');
 if(!check)await request('madani_live','PATCH',snapshots);
 return {date,counts:Object.fromEntries(Object.entries(snapshots).map(([unit,s])=>[unit,{quran:s.quran.total,teachers:s.teachers.total,students:s.students.total}]))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)publishLive({check:process.argv.includes('--check')}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
