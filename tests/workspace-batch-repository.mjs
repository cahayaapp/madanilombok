import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
async function harness(fail=false){
 let serial=0;const calls=[];
 const sdk={ref:(_,path)=>path,push:()=>({key:`key${++serial}`}),serverTimestamp:()=>123,update:async(path,patch)=>{calls.push({path,patch});if(fail)throw Error('permission denied');}};
 const context=vm.createContext({console}),module=new vm.SourceTextModule(readFileSync(new URL('../assets/js/repository.js',import.meta.url),'utf8'),{context});
 await module.link(spec=>{const names=spec.startsWith('https:')?['ref','get','set','update','remove','push','serverTimestamp','runTransaction','onValue','query','orderByKey','startAt','endAt']:spec.endsWith('/firebase.js')?['db']:spec.endsWith('/boarding-personnel-scope.js')?['counselorGender']:spec.endsWith('/read-deadline.js')?['withReadDeadline']:['appConfig'];return new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,name==='db'?{}:name==='appConfig'?{databaseRoot:'madani_app'}:sdk[name]||(()=>{}));},{context});});await module.evaluate();return {save:module.namespace.createWorkspaceRecord,calls};
}
test('batch sends all coaching records and individual audit entries in one atomic update',async()=>{
 const h=await harness(),result=await h.save('workspaces/y/coaching',[{personUid:'a',academicYearId:'y'},{personUid:'b',academicYearId:'y'}],'manager');assert.equal(result.length,2);assert.notEqual(result[0].id,result[1].id);assert.equal(h.calls.length,1);const {path,patch}=h.calls[0];assert.equal(path,'madani_app');assert.equal(Object.keys(patch).length,4);for(const r of result){assert.equal(patch[`workspaces/y/coaching/${r.id}`].createdBy,'manager');assert.equal(r.updatedAt,123);}assert.equal(Object.keys(patch).filter(k=>k.startsWith('audit_logs/')).length,2);
});
test('denied atomic batch propagates failure and single-record callers retain their result shape',async()=>{
 const failed=await harness(true);await assert.rejects(failed.save('workspaces/y/coaching',[{personUid:'a'},{personUid:'b'}],'manager'),/permission denied/);assert.equal(failed.calls.length,1);
 const h=await harness();const result=await h.save('workspaces/y/targets',{title:'Target'},'manager');assert.equal(result.title,'Target');assert.equal(Array.isArray(result),false);
 await assert.rejects(h.save('workspaces/y/coaching',[],'manager'),/minimal/);assert.equal(h.calls.length,1);
});
