import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
async function setup(current){
 let listening=false,stopped=false,written;
 const context=vm.createContext({crypto:webcrypto,setTimeout,clearTimeout});
 const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../assets/js/leadership-data-repository.js',import.meta.url),'utf8'),{context});
 const exports={ref:()=>({}),onValue:(_r,ready)=>{listening=true;queueMicrotask(ready);return()=>{listening=false;stopped=true;};},runTransaction:async(_r,mutate)=>{assert.equal(listening,true);written=mutate(current);return {committed:written!==undefined,snapshot:{val:()=>written}};},writeAudit:async()=>{},db:{},appConfig:{databaseRoot:'madani_app'}};
 await mod.link(async spec=>{const keys=spec.includes('firebase-database')?['ref','onValue','runTransaction']:spec.includes('firebase-config')?['appConfig']:spec.endsWith('/firebase.js')?['db']:['writeAudit'];return new vm.SyntheticModule(keys,function(){for(const key of keys)this.setExport(key,exports[key]);},{context});});await mod.evaluate();
 return {save:mod.namespace.commitLeadershipData,stopped:()=>stopped,value:()=>written};
}
test('existing record stays loaded through transaction and listener is released',async()=>{const r={name:'7 Putra',homeroomStaffId:'t'};const repo=await setup(r);await repo.save('classes/c',{id:'c',...r},r,'leader');assert.equal(repo.value().homeroomStaffId,'t');assert.equal(repo.stopped(),true);});
test('concurrent change still rejects stale editor and releases listener',async()=>{const repo=await setup({name:'New'});await assert.rejects(repo.save('classes/c',{name:'Old'},{name:'Overwrite'},'leader'),/Data telah berubah/);assert.equal(repo.value(),undefined);assert.equal(repo.stopped(),true);});
