import fs from 'node:fs';import assert from 'node:assert/strict';
const path='seed/master-data.json',d=JSON.parse(fs.readFileSync(path)),src=JSON.parse(fs.readFileSync('seed/imports/sd-2026-2027-source.json'));
const year='TA-2026-2027-GANJIL',updateId='sd-2026-2027-20261004',changes={},schedules={},breaks={},warnings=[];
const source=(cell)=>({source:src.file,sourceSheet:'Sheet1',sourceCell:cell,seeded:true});
// Sheet1 and the new staff identity were explicitly confirmed by the user.
const miftah='AMD-SDM-0087';assert(!d.staff[miftah]||d.staff[miftah].name==='MIFTAHUSSURUR');
changes[`staff/${miftah}`]={name:'MIFTAHUSSURUR',unitIds:['UNIT-SD'],unitTask:'SD',roles:'Guru Bahasa Inggris kelas 3–6 dan Fiqih kelas 6',appRoles:['guru_mapel'],status:'active',validationStatus:'Penambahan dikonfirmasi pengguna; biodata lain belum tersedia',...source('K19'),...d.staff[miftah]};
const classTeachers={1:'AMD-SDM-0080',2:'AMD-SDM-0067',3:'AMD-SDM-0063',4:'AMD-SDM-0048',5:'AMD-SDM-0065',6:'AMD-SDM-0026'};
const roman={I:1,II:2,III:3,IV:4,V:5,VI:6},days={C:'Senin',D:'Selasa',E:'Rabu',F:'Kamis',G:'Jumat',H:'Sabtu'};
const subjectMap={"Muraja'ah dan Sholat Dhuha":'01',TAHFIDZ:'02',BTA:'03',PJOK:'04',PAI:'05','B.INDONESIA':'06','B.INGGRIS':'07','B.SASAK':'08','SENI RUPA':'09',MTK:'10','P.PANCASILA':'11',IPAS:'12',SBDP:'13',FIQIH:'14','AKIDAH AHLAK':'15','B.ARAB':'16',PRAMUKA:'17','Sholat Ashar Berjamaah':'19','Sholat Zuhur Berjamaah':'20',Mahfuzat:'21','Latihan Wushu':'22'};
const norm=s=>String(s).toUpperCase().replace(/\s/g,'');
const subjects=new Map(Object.entries(subjectMap).map(([name,n])=>[norm(name),`MPL-SD-${n}`]));
for(const [n,name] of [['20','Sholat Zuhur Berjamaah'],['21','Mahfuzat'],['22','Latihan Wushu']])changes[`subjects/MPL-SD-${n}`]={name,unitId:'UNIT-SD',unitIds:['UNIT-SD'],status:'active',...source('C25:C26')};
function assigned(subject,grade){
 if(subject==='04')return ['AMD-SDM-0017','L16'];
 if(subject==='05')return ['AMD-SDM-0066','L18'];
 if(subject==='07')return [grade<=2?'AMD-SDM-0020':miftah,grade<=2?'L8':'L19'];
 if(subject==='11')return ['AMD-SDM-0085','L17'];
 if(subject==='14')return [{3:'AMD-SDM-0080',4:'AMD-SDM-0085',5:'AMD-SDM-0085',6:miftah}[grade],{3:'L10',4:'L17',5:'L17',6:'L19'}[grade]];
 if(subject==='15')return [{3:'AMD-SDM-0066',4:'AMD-SDM-0063',5:'AMD-SDM-0026',6:'AMD-SDM-0065'}[grade],{3:'L18',4:'L12',5:'L15',6:'L14'}[grade]];
 if(subject==='16')return ['AMD-SDM-0029','L21'];
 if(subject==='22')return ['AMD-SDM-0086','L20'];
 if(['03','06','08','09','10','12','13'].includes(subject))return [classTeachers[grade],`L${{1:10,2:11,3:12,4:13,5:14,6:15}[grade]}`];
 return [null,null]; // No exact class assignment given for Tahfiz, prayer, Mahfuzat or the three Scout coaches.
}
let grade;
for(const {row,cells} of src.sheets.Sheet1.rows){
 if(roman[cells.A])grade=roman[cells.A];if(!grade||!cells.B)continue;
 const time=String(cells.B).match(/^(\d\d)\.(\d\d)-(\d\d\.\d\d|selesai)$/i);if(!time)continue;
 const startTime=`${time[1]}:${time[2]}`,endTime=time[3].toLowerCase()==='selesai'?'selesai':time[3].replace('.',':');
 const expanded={...cells};for(const merge of src.sheets.Sheet1.merges){const m=merge.match(/^([C-H])(\d+):([C-H])(\d+)$/);if(m&&+m[2]===row&&+m[4]===row)for(let c=m[1].charCodeAt(0);c<=m[3].charCodeAt(0);c++)expanded[String.fromCharCode(c)]=cells[m[1]];}
 for(const [col,day] of Object.entries(days)){
  const name=expanded[col];if(!name)continue;
  const id=`JSD-2627G-${grade}-${day.toUpperCase()}-${row}`,classId=`CLS-SD-${grade}`,meta={academicYearId:year,semester:'1',unitId:'UNIT-SD',classId,day,startTime,endTime,activityName:name,...source(`${col}${row}`)};
  if(norm(name)==='ISTIRAHAT'){breaks[id]=meta;continue;}
  const subjectId=subjects.get(norm(name));assert(subjectId,`Unknown subject ${name}`);
  const [teacherStaffId,teacherSourceCell]=assigned(subjectId.slice(-2),grade);assert(!teacherStaffId||d.staff[teacherStaffId]||teacherStaffId===miftah);
  schedules[id]={...meta,subjectId,teacherStaffId:teacherStaffId||'',teacherAssignmentStatus:teacherStaffId?'confirmed':'needs_review',teacherSourceCell:teacherSourceCell||'',status:'active',validationStatus:teacherStaffId?'Pengampu dari jabatan guru Sheet1':'Pengampu kelas belum ditentukan sumber'};
 }
}
for(const [id,r] of Object.entries(d.schedules.academic))if(r.unitId==='UNIT-SD'&&r.academicYearId===year&&!id.startsWith('JSD-2627G-')){
 changes[`schedules/academic/${id}/status`]='inactive';changes[`schedules/academic/${id}/supersededBy`]=updateId;
}
for(const [id,r] of Object.entries(schedules))changes[`schedules/academic/${id}`]=r;
for(const [grade,id] of Object.entries(classTeachers)){changes[`classes/CLS-SD-${grade}/homeroomStaffId`]=id;changes[`classes/CLS-SD-${grade}/homeroomName`]=d.staff[id].name;}
for(const id of new Set(Object.values(schedules).map(r=>r.teacherStaffId).filter(Boolean))){
 const current=d.staff[id]||changes[`staff/${id}`];changes[`staff/${id}/appRoles`]=[...new Set([...(current.appRoles||[]),'guru_mapel'])];changes[`staff/${id}/unitIds`]=[...new Set([...(current.unitIds||[]),'UNIT-SD'])];
}
for(const s of Object.values(schedules))if(s.classId==='CLS-SD-6'&&s.startTime==='14:30')warnings.push({type:'source_overlap',cell:s.sourceCell,day:s.day,detail:'Pelajaran 14.30–15.30 beririsan dengan Asar pukul 15.00. Jam sumber dipertahankan.'});
changes[`reference/sdBreaks/${year}`]=breaks;
const report={academicYearId:year,source:src.file,authoritativeSheet:'Sheet1',scheduleCount:Object.keys(schedules).length,linkedSchedules:Object.values(schedules).filter(s=>s.teacherStaffId).length,unassignedSchedules:Object.values(schedules).filter(s=>!s.teacherStaffId).length,homerooms:6,breaks:Object.keys(breaks).length,openEndedSchedules:Object.values(schedules).filter(s=>s.endTime==='selesai').length,warnings};
const set=(path,value)=>{const keys=path.split('/');let r=d;for(const k of keys.slice(0,-1))r=r[k]??={};r[keys.at(-1)]=value;};for(const [p,v] of Object.entries(changes))set(p,v);
changes[`staff/${miftah}`]=d.staff[miftah];for(const p of Object.keys(changes))if(p.startsWith(`staff/${miftah}/`))delete changes[p];
d.metadata.sdUpdate={id:updateId,source:src.file,authoritativeSheet:'Sheet1',confirmedBy:'Pengguna 4 Oktober 2026'};
fs.writeFileSync(path,JSON.stringify(d,null,2)+'\n');fs.writeFileSync('seed/imports/sd-2026-2027-update.json',JSON.stringify({id:updateId,report,changes},null,2)+'\n');console.log(JSON.stringify(report,null,2));
