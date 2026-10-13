import test from 'node:test';
import assert from 'node:assert/strict';
import {dormPersonnel,counselorGender} from '../assets/js/boarding-personnel-scope.js';
import {filterScopedStudents} from '../assets/js/role-experience.js';
test('counselor scope fails closed and uses counselor-specific assignment',()=>{
 const master={students:[{id:'l',gender:'L'},{id:'p',gender:'P'}]};
 assert.deepEqual(filterScopedStudents(master,{},'konselor'),[]);
 assert.deepEqual(filterScopedStudents(master,{scopeGender:'L'},'konselor').map(s=>s.id),['l']);
 assert.equal(counselorGender({scopeGender:'L',roleScopes:{konselor:{scopeGender:'P'}}}),'P');
 assert.deepEqual(filterScopedStudents(master,{roleScopes:{konselor:{scopeGender:'P'}}},'konselor').map(s=>s.id),['p']);
});
test('dorm roster excludes formal-only staff and includes dual-role and Arabic teachers of own gender',()=>{
 const users=[{id:'formal',role:'guru_mapel'},{id:'wali',role:'guru_wali'},{id:'naqib',role:'naqib'},{id:'quran',role:'mentor_tahsin_tahfiz'},{id:'counselor',role:'konselor'},{id:'dual',role:'guru_mapel',roleFlags:{naqib:true}},{id:'arabic',role:'guru_mapel'},{id:'girl',role:'naqib'},{id:'unknown',role:'naqib'},{id:'revoked',role:'naqib',accessRevoked:true}].map(u=>({...u,staffId:u.id}));
 const master={staff:users.map(u=>({id:u.id,gender:u.id==='girl'?'P':u.id==='unknown'?'':'L'})),groups:[{programType:'arabic',mentorStaffIds:['arabic']}]};
 assert.deepEqual(dormPersonnel(users,'head_boys_dorm',master).map(u=>u.id),['naqib','quran','counselor','dual','arabic']);
 assert.deepEqual(dormPersonnel(users,'head_girls_dorm',master).map(u=>u.id),['girl']);
 assert.deepEqual(dormPersonnel(users,'head_boys_dorm',{}),[]);
 master.groups[0].status='inactive';assert.ok(!dormPersonnel(users,'head_boys_dorm',master).some(u=>u.id==='arabic'));
});
