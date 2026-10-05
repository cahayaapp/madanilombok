import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
const pack=JSON.parse(fs.readFileSync('seed/imports/boarding-2026-update.json'));
async function setup(conflict=false,missing=[],metadata=false){
 const data=metadata?JSON.parse(fs.readFileSync("seed/imports/room-metadata-2026-update.json")):pack;
 const current={...data.expected};for(const v of Object.values(data.changes))if(v?.studentId)current['students/'+v.studentId]={name:'Existing student'};
 if(conflict)current[Object.keys(pack.changes).find(k=>k.startsWith('assignments/rooms/'))]={roomId:'OTHER'};
 for(const id of missing)delete current['students/'+id];
 const writes=[],dom=new JSDOM('<section></section>'),context=vm.createContext({Date,fetch:async()=>({ok:true,json:async()=>data})});
 const repo=new vm.SyntheticModule(['getNode','bulkPatchRoot'],function(){this.setExport('getNode',async p=>current[p]??null);this.setExport('bulkPatchRoot',async p=>{writes.push(p);Object.assign(current,p);});},{context});
 const util=new vm.SyntheticModule(['escapeHtml'],function(){this.setExport('escapeHtml',String);},{context});
 const m=new vm.SourceTextModule(fs.readFileSync('assets/js/boarding-update.js','utf8'),{context});await m.link(s=>s.includes('repository')?repo:util);await m.evaluate();const root=dom.window.document.querySelector('section');await m.namespace[metadata?"renderRoomMetadataUpdate":"renderBoardingUpdate"](root,{user:{uid:'admin'}});
 return {root,writes,current,run:()=>root.querySelector('button').onclick()};
}
test('boarding import refuses stale room assignments before writing',async()=>{const x=await setup(true);await x.run();assert.equal(x.writes.length,0);assert.match(x.root.textContent,/Data tujuan berubah/);});
test('boarding import refuses repeats and never touches finance',async()=>{const x=await setup();await x.run();assert.equal(x.writes.length,1);assert.ok(!Object.keys(x.writes[0]).some(k=>k.startsWith('finance/')));await x.run();assert.equal(x.writes.length,1);assert.match(x.root.textContent,/sudah diterapkan/);});

test('missing student is deferred and retry preserves already imported data',async()=>{
 const id='AMD-SMP-0052',x=await setup(false,[id]);await x.run();assert.equal(x.writes.length,1);
 const first=x.writes[0],marker='settings/imports/'+pack.id;
 assert.equal(first[marker].status,'partial');assert.ok(!Object.values(first).some(v=>v?.studentId===id));
 assert.equal(first['groups/HLQ-PTI-01/status'],undefined);assert.match(x.root.textContent,/ditunda/);
 const savedPath=Object.keys(first).find(k=>k.startsWith('assignments/rooms/'));x.current[savedPath]={roomId:'EDITED-LATER'};
 x.current['students/'+id]={name:'M. RANDI ALWI'};await x.run();assert.equal(x.writes.length,2);
 assert.equal(x.writes[1][savedPath],undefined);assert.ok(Object.values(x.writes[1]).some(v=>v?.studentId===id));assert.equal(x.writes[1][marker].status,'complete');
 await x.run();assert.equal(x.writes.length,2);
});

test('room metadata revision applies after roster import without moving residents',async()=>{
 const x=await setup(false,[],true);x.current['settings/imports/'+pack.id]={status:'complete'};x.current['rooms/ROOM-PTR-GEMA/building']='ASPURA';
 await x.run();assert.equal(x.writes.length,1);const changes=x.writes[0];assert.equal(changes['rooms/ROOM-PTR-GEMA/name'],'GEMA Gedung Cairo');assert.equal(changes['rooms/ROOM-PTRI-M2/occupantType'],'Staf');assert.ok(Object.keys(changes).every(p=>p.startsWith('rooms/')||p.startsWith('settings/imports/')));
});
