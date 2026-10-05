import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
const pack=JSON.parse(fs.readFileSync('seed/imports/daily-2026-update.json'));
async function setup(current={}){
 const dom=new JSDOM('<section></section>');let writes=[];const context=vm.createContext({Date,fetch:async()=>({ok:true,json:async()=>pack})});
 const repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',async p=>current[p]||null);this.setExport('bulkPatchRoot',async p=>{writes.push(p);Object.assign(current,p);});},{context});
 const utils=new vm.SyntheticModule(['escapeHtml'],function(){this.setExport('escapeHtml',String);},{context});
 const mod=new vm.SourceTextModule(fs.readFileSync('assets/js/daily-update.js','utf8'),{context});await mod.link(s=>s.includes('repository')?repo:utils);await mod.evaluate();
 const root=dom.window.document.querySelector('section');await mod.namespace.renderDailyUpdate(root,{user:{uid:'admin'}});return {root,writes,run:()=>root.querySelector('button').onclick()};
}
test('daily import preserves missing history nodes and stops repeated imports',async()=>{
 const x=await setup();await x.run();assert.equal(x.writes.length,1);assert.equal(x.writes[0]['schedules/daily/DS-001/status'],undefined);assert.equal(x.writes[0]['schedules/daily/DS-2026-GEMA-01'].participantScope,'boarding_gema');
 await x.run();assert.equal(x.writes.length,1);assert.match(x.root.textContent,/sudah diterapkan/);
});
test('daily import refuses conflicting IDs before any database write',async()=>{
 const x=await setup({'programs/PRG-2026-GEMA-01':{name:'Other'}});await x.run();assert.equal(x.writes.length,0);assert.match(x.root.textContent,/ID jadwal/);
});
