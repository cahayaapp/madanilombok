import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
const pack=JSON.parse(fs.readFileSync('seed/imports/group-teacher-links-2026.json'));
async function setup(mismatch=false){
 const current={users:{teacher:{staffId:'AMD-SDM-0055',role:'head_boys_dorm',roles:['head_boys_dorm'],roleScopes:{head_boys_dorm:{scopeGender:'L'}}}}};
 for(const l of pack.links){current['groups/'+l.groupId]={name:l.groupId};for(const id of l.staffIds)current['staff/'+id]={name:l.staffNames[id]};}
 if(mismatch)current['staff/AMD-SDM-0055'].name='Different person';
 const dom=new JSDOM('<section></section>'),writes=[],context=vm.createContext({Date,fetch:async()=>({ok:true,json:async()=>pack})});
 const repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',async p=>current[p]||null);this.setExport('bulkPatchRoot',async c=>{writes.push(c);Object.assign(current,c);});},{context});
 const util=new vm.SyntheticModule(['escapeHtml'],function(){this.setExport('escapeHtml',String);},{context});
 const helpers=new vm.SourceTextModule(fs.readFileSync('assets/js/group-teachers.js','utf8'),{context});await helpers.link(()=>{});
 const m=new vm.SourceTextModule(fs.readFileSync('assets/js/group-teacher-update.js','utf8'),{context});await m.link(s=>s.includes('repository')?repo:s.includes('group-teachers')?helpers:util);await m.evaluate();const root=dom.window.document.querySelector('section');await m.namespace.renderGroupTeacherUpdate(root,{user:{uid:'admin'}});return {root,writes,run:()=>root.querySelector('button').onclick()};
}
test('group sync adds both teaching roles and retains leadership scopes',async()=>{const x=await setup();await x.run();assert.equal(x.writes.length,1);const c=x.writes[0];assert.ok(c['users/teacher/roles'].includes('guru_mapel'));assert.ok(c['users/teacher/roles'].includes('mentor_tahsin_tahfiz'));assert.equal(c['users/teacher/roleScopes'].head_boys_dorm.scopeGender,'L');assert.equal(c['groups/GRP-2026-arabic-L-gema/mentorName'],'Muhasim');await x.run();assert.equal(x.writes.length,1);});
test('group sync rejects a mismatched SDM identity before changing any account',async()=>{const x=await setup(true);await x.run();assert.equal(x.writes.length,0);assert.match(x.root.textContent,/berbeda dari acuan/);});
