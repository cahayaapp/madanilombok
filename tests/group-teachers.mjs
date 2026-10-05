import test from 'node:test';import assert from 'node:assert/strict';import {teachingGroups,groupTeacherName,mergeTeachingRoles} from '../assets/js/group-teachers.js';
test('group ownership supports multiple staff IDs, excludes retired and Arabic groups from Quran',()=>{
 const master={groups:[{id:'q',programType:'quran',mentorStaffIds:['a','b']},{id:'ar',programType:'arabic',mentorStaffId:'b'},{id:'old',programType:'quran',mentorStaffId:'b',status:'inactive'},{id:'other',programType:'quran',mentorStaffId:'c'}]};
 assert.deepEqual(teachingGroups(master,{staffId:'b'},'quran').map(g=>g.id),['q']);assert.deepEqual(teachingGroups(master,{staffId:'b'},'arabic').map(g=>g.id),['ar']);assert.deepEqual(teachingGroups(master,{},'quran'),[]);
 assert.equal(groupTeacherName(master.groups[0],[{id:'a',name:'Nama SDM A'},{id:'b',name:'Nama SDM B'}]),'Nama SDM A & Nama SDM B');
});
test('sync adds teaching roles while preserving leadership, finance and academic scopes',()=>{
 const p={role:'head_girls_dorm',roles:['head_girls_dorm','kasir'],roleScopes:{kasir:{financeUnit:'PUTRI'},guru_mapel:{classIds:['c'],subjectIds:['s'],groupIds:['old']}}};
 const merged=mergeTeachingRoles(p,{guru_mapel:['ar'],mentor_tahsin_tahfiz:['q']});assert.ok(merged.roles.includes('kasir'));assert.deepEqual(merged.roleScopes.kasir,{financeUnit:'PUTRI'});assert.deepEqual(merged.roleScopes.guru_mapel.classIds,['c']);assert.deepEqual(merged.roleScopes.guru_mapel.groupIds,['old','ar']);assert.deepEqual(p.roleScopes.guru_mapel.groupIds,['old']);
});
