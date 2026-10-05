import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
const pack=JSON.parse(fs.readFileSync('seed/imports/smp-2026-2027-update.json'));
async function setup(current={},unit='SMP'){
 const data=unit==='SD'?JSON.parse(fs.readFileSync('seed/imports/sd-2026-2027-update.json')):pack;
 const dom=new JSDOM('<section></section>');let written=null;const context=vm.createContext({document:dom.window.document,Date,fetch:async()=>({ok:true,json:async()=>data})});
 const repository=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',async path=>current[path]||null);this.setExport('bulkPatchRoot',async changes=>{written=changes;Object.assign(current,changes);});},{context});
 const utils=new vm.SyntheticModule(['escapeHtml'],function(){this.setExport('escapeHtml',s=>String(s).replaceAll('<','&lt;'));},{context});
 const mod=new vm.SourceTextModule(fs.readFileSync('assets/js/smp-update.js','utf8'),{context});await mod.link(s=>s.includes('repository')?repository:utils);await mod.evaluate();
 const root=dom.window.document.querySelector('section');await mod.namespace[unit==='SD'?'renderSdUpdate':'renderSmpUpdate'](root,{user:{uid:'admin'}});
 return {root,current,writes:()=>written,run:()=>root.querySelector('button').onclick()};
}
test('incremental SMP import preserves unrelated role scopes and stops repeated imports',async()=>{
 const x=await setup({users:{bintang:{staffId:'AMD-SDM-0013',role:'naqib',roles:['naqib'],active:true,unitIds:['UNIT-PONDOK'],roleScopes:{naqib:{groupIds:['cordoba']}}}},'staff/AMD-SDM-0013/appRoles':['naqib']});
 await x.run();const changes=x.writes();assert.ok(changes);assert.ok(!Object.keys(changes).some(k=>k.startsWith('finance')));
 assert.ok(changes['users/bintang/roles'].includes('naqib'));assert.ok(changes['users/bintang/roles'].includes('guru_mapel'));assert.ok(changes['users/bintang/roleScopes/guru_mapel'].unitIds.includes('UNIT-SMP'));assert.equal(changes['users/bintang/roleScopes/naqib'],undefined);
 assert.equal(changes['students/AMD-SMP-0101'].name,'DINDA CAHYATI');assert.match(x.root.textContent,/tersimpan/);
 await x.run();assert.match(x.root.textContent,/sudah diterapkan/);
});
test('incremental import refuses a conflicting existing identity before any write',async()=>{
 const x=await setup({'students/AMD-SMP-0101':{name:'Different student'}});await x.run();assert.equal(x.writes(),null);assert.match(x.root.textContent,/nama lain/);
});
test('SD import retires existing SD slots only and assigns the SD unit to teachers',async()=>{
 const x=await setup({'schedules/academic/JSD-0001':{unitId:'UNIT-SD',academicYearId:'TA-2026-2027-GANJIL'},users:{miftah:{staffId:'AMD-SDM-0087',role:'guru_mapel',active:true}}},'SD');
 await x.run();const changes=x.writes();assert.ok(changes);assert.equal(changes['schedules/academic/JSD-0001/status'],'inactive');assert.equal(changes['schedules/academic/JSD-0002/status'],undefined);assert.deepEqual([...changes['users/miftah/roleScopes/guru_mapel'].unitIds],['UNIT-SD']);assert.match(x.root.textContent,/Pembaruan SD tersimpan/);
});
