import fs from 'node:fs';
import {buildStaffAccountPlan} from '../assets/js/staff-account-plan.js';
const d=JSON.parse(fs.readFileSync('seed/master-data.json','utf8'));
const rows=node=>Object.entries(node||{}).map(([id,r])=>({id,...r}));
const norm=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const students=rows(d.students),pairs=new Map();
for(const field of ['nik','nisn','name']){
 const groups=new Map();
 for(const r of students){const key=norm(r[field]);if(!key||/^0+$/.test(key))continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 for(const members of groups.values())if(members.length>1){
  for(let a=0;a<members.length;a++)for(let b=a+1;b<members.length;b++){
   const ids=[members[a].id,members[b].id].sort(),key=ids.join('|');
   if(!pairs.has(key))pairs.set(key,{studentIds:ids,name:members[a].name,matchingFields:[],differingFields:[...new Set([...Object.keys(members[a]),...Object.keys(members[b])])].filter(k=>k!=='id'&&JSON.stringify(members[a][k])!==JSON.stringify(members[b][k])),status:'needs_identity_review'});
   pairs.get(key).matchingFields.push(field);
  }
 }
}
const orphans=[];
for(const [kind,years] of Object.entries(d.assignments||{}))for(const [yearId,items] of Object.entries(years)){
 if(kind==='groups'){for(const [groupId,members] of Object.entries(items))for(const id of Object.keys(members))if(!d.students[id])orphans.push({kind,yearId,groupId,studentId:id});}
 else for(const id of Object.keys(items))if(!d.students[id])orphans.push({kind,yearId,studentId:id});
}
const report={source:'Master lokal; belum diverifikasi terhadap database aktif',studentCount:students.length,schoolCounts:Object.fromEntries([...new Set(students.map(s=>s.unitId))].map(unit=>[unit,students.filter(s=>s.unitId===unit).length])),nonSchoolStudents:students.filter(s=>!['UNIT-TK','UNIT-SD','UNIT-SMP','UNIT-SMA','UNIT-SMK'].includes(s.unitId)).map(s=>s.id),duplicateCandidates:[...pairs.values()],orphanAssignments:orphans,unresolvedRooms:Object.keys(d.seed_validation?.unresolvedRoomPlacements||{}).length,unresolvedGroups:Object.keys(d.seed_validation?.unresolvedGroupMemberships||{}).length};
fs.writeFileSync('seed/student-identity-audit.json',JSON.stringify(report,null,2)+'\n');
const suggestions=JSON.parse(fs.readFileSync('seed/role-assignment-suggestions.json')).people;
const leadership=JSON.parse(fs.readFileSync('seed/leadership-assignments.json')).assignments;
const accounts=buildStaffAccountPlan(rows(d.staff),[],rows(d.classes),suggestions,leadership);
fs.writeFileSync('seed/staff-account-plan.json',JSON.stringify({source:report.source,accounts},null,2)+'\n');
console.log(JSON.stringify({students:students.length,duplicateCandidates:pairs.size,orphans:orphans.length,accounts:accounts.length,ready:accounts.filter(r=>r.status==='ready').length,pending:accounts.filter(r=>r.status!=='ready').map(r=>({staffId:r.staffId,name:r.name,status:r.status}))},null,2));
