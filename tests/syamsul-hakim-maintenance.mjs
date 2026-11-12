import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const source=await readFile(new URL('../assets/js/syamsul-hakim-maintenance-model.js',import.meta.url),'utf8');
const {prepareSyamsulMaintenance:prepare,TARGET_UID:uid,TARGET_STAFF:staffId,OLD_STAFF,YEAR,CLASS_ID,REQUESTED,same}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(){
 const profile={email:'hakim@madani.app',name:'SYAMSUL HAKIM',staffId,active:true,role:'guru_mapel',defaultRole:'guru_mapel',roles:['guru_mapel'],roleFlags:{guru_mapel:true},roleScopes:{guru_mapel:{classIds:['preserve'],subjectIds:['preserve-mapel']}},accessVersion:4};
 const old={staffId:OLD_STAFF,roles:['guru_mapel','guru_wali'],roleScopes:{guru_wali:{classIds:[CLASS_ID],menteeStudentIds:[...REQUESTED.slice(1).map(r=>r[0]),'keep-habib','keep-joni']}}};
 return {year:YEAR,profile,staff:{name:'SYAMSUL HAKIM',appRoles:['guru_mapel']},oldStaff:{roleScopes:{guru_wali:{menteeStudentIds:old.roleScopes.guru_wali.menteeStudentIds}}},users:{[uid]:profile,old},classes:{[CLASS_ID]:{unitId:'UNIT-SMK',status:'active'}},rows:REQUESTED.map(([id,name,nisn],i)=>({id,student:i?{name,nisn,unitId:'UNIT-SMK',status:'active'}:null,matches:i?[{id}]:[],classAssignment:{classId:CLASS_ID,status:'active'},mentor:i?{mentorStaffId:OLD_STAFF,status:'active',custom:'preserve'}:null,history:{session:{note:'preserve history'}}}))};
}
test('restores the same missing identity and assigns all five without touching protected records',()=>{
 const s=fixture(),copy=structuredClone(s),p=prepare(s,'admin',123);
 assert.deepEqual(s,copy);
 assert.deepEqual(p.restored,['Abdul Rohim']);
 assert.equal(p.changes['students/AMD-SMK-0001'].nisn,'0085862261');
 for(const [id]of REQUESTED)assert.equal(p.changes[`assignments/mentors/${YEAR}/${id}`].mentorStaffId,staffId);
 assert.equal(p.changes[`assignments/mentors/${YEAR}/AMD-SMK-0002`].custom,'preserve');
 assert.deepEqual(p.changes[`users/${uid}/roles`],['guru_mapel','guru_wali']);
 assert.deepEqual(p.changes['users/old/roleScopes/guru_wali/menteeStudentIds'],['keep-habib','keep-joni']);
 assert(!Object.keys(p.changes).some(k=>/finance|boarding\/|schedules|assignments\/classes|homeroom|guru_mapel/.test(k)));
 assert(!Object.keys(p.changes).some(k=>/defaultRole|\/role$/.test(k)));
});
test('rejects another missing student, identity mismatch, duplicate, changed class or unexpected mentor',()=>{
 for(const mutate of [s=>s.rows[1].student=null,s=>s.rows[2].student.nisn='wrong',s=>s.rows[0].matches=[{id:'duplicate'}],s=>s.rows[1].classAssignment.classId='other',s=>s.rows[1].mentor.mentorStaffId='other']){
  const s=fixture();mutate(s);assert.throws(()=>prepare(s,'admin',123));
 }
});
test('rejects revoked/wrong accounts and a changed academic year',()=>{
 for(const mutate of [s=>s.profile.accessRevoked=true,s=>s.profile.email='other',s=>s.profile.staffId='other',s=>s.year='other']){const s=fixture();mutate(s);assert.throws(()=>prepare(s,'admin',123));}
});
test('preserves other role flags and compares server object keys independent of ordering',()=>{
 const s=fixture();s.profile.roles.push('mentor_tahsin_tahfiz');
 assert(prepare(s,'admin',123).changes[`users/${uid}/roles`].includes('mentor_tahsin_tahfiz'));
 assert(same({b:2,a:{d:4,c:3}},{a:{c:3,d:4},b:2}));assert(same(undefined,null));
});
test('is idempotent after applying the narrow plan',()=>{
 const s=fixture(),p=prepare(s,'admin',123);
 const root={users:s.users,staff:{[staffId]:s.staff,[OLD_STAFF]:s.oldStaff},students:{},assignments:{mentors:{[YEAR]:{}}}};
 for(const [path,value]of Object.entries(p.changes)){const parts=path.split('/');let n=root;for(const k of parts.slice(0,-1))n=n[k]??={};n[parts.at(-1)]=value;}
 for(const row of s.rows){row.student=root.students[row.id]||row.student;row.mentor=root.assignments.mentors[YEAR][row.id];row.matches=[{id:row.id}];}
 assert.deepEqual(prepare(s,'admin',456).changes,{});
});
