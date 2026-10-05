import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
const pack=JSON.parse(fs.readFileSync('seed/imports/smk-mentor-2026-update.json'));
async function setup(){
 const current={users:{teacher:{staffId:'AMD-SDM-0042',active:true,roles:['guru_mapel'],roleScopes:{guru_mapel:{classIds:['other']},guru_wali:{menteeStudentIds:['existing-smp']}}}}};
 for(const r of pack.records){current['students/'+r.studentId]={name:r.studentName,status:'active',unitId:pack.unitId};current['staff/'+r.mentorStaffId]={name:r.mentorName,appRoles:['guru_mapel'],roleScopes:{guru_wali:{menteeStudentIds:['existing-smp']}}};}
 const writes=[],dom=new JSDOM('<section></section>'),context=vm.createContext({Date,fetch:async()=>({ok:true,json:async()=>pack})});
 const repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',async p=>current[p]??null);this.setExport('bulkPatchRoot',async p=>{writes.push(p);Object.assign(current,p);current['assignments/mentors/'+pack.academicYearId]=Object.fromEntries(Object.entries(p).filter(([k])=>k.startsWith('assignments/mentors/')).map(([k,v])=>[k.split('/').at(-1),v]));});},{context});
 const util=new vm.SyntheticModule(['escapeHtml'],function(){this.setExport('escapeHtml',String);},{context});
 const m=new vm.SourceTextModule(fs.readFileSync('assets/js/mentor-update.js','utf8'),{context});await m.link(s=>s.includes('repository')?repo:util);await m.evaluate();const root=dom.window.document.querySelector('section');await m.namespace.renderMentorUpdate(root,{user:{uid:'admin'}});return {current,writes,root,run:()=>root.querySelector('button').onclick()};
}
test('64 unique SMK mentees assigned to 12 canonical staff; only mentor roles and assignments change',async()=>{
 assert.equal(pack.records.length,64);assert.equal(new Set(pack.records.map(r=>r.studentId)).size,64);assert.equal(new Set(pack.records.map(r=>r.mentorStaffId)).size,12);
 assert.deepEqual(Object.values(Object.groupBy(pack.records,r=>r.mentorStaffId)).map(r=>r.length),[5,5,5,6,6,5,6,6,6,7,3,4]);
 const x=await setup();await x.run();assert.equal(x.writes.length,1);assert.match(x.root.textContent,/Berhasil: 64 siswa/);
 const c=x.writes[0];assert.ok(c['users/teacher/roles'].includes('guru_mapel'));assert.ok(c['users/teacher/roles'].includes('guru_wali'));assert.equal(c['users/teacher/roleScopes/guru_mapel'],undefined);assert.ok(c['users/teacher/roleScopes/guru_wali'].menteeStudentIds.includes('existing-smp'));
 assert.ok(Object.keys(c).every(k=>/^(assignments\/mentors\/|staff\/[^/]+\/(appRoles|roleScopes\/guru_wali)$|users\/[^/]+\/(roles|roleFlags\/guru_wali|roleScopes\/guru_wali|accessVersion)$|settings\/imports\/)/.test(k)));
 await x.run();assert.equal(x.writes.length,1);
});
test('changed student identity, missing staff, and conflicting mentor abort before any writes',async()=>{
 for(const kind of ['student','staff','mentor']){const x=await setup(),r=pack.records[0];if(kind==='student')x.current['students/'+r.studentId].name='OTHER';if(kind==='staff')delete x.current['staff/'+r.mentorStaffId];if(kind==='mentor')x.current[`assignments/mentors/${pack.academicYearId}/${r.studentId}`]={status:'active',mentorStaffId:'OTHER'};await x.run();assert.equal(x.writes.length,0);}
});
