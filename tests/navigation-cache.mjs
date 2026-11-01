import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({Response,self:{addEventListener(){}}});
vm.runInContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),context);
test('cached redirected document is safe for manual-mode navigation',async()=>{
 const response=new Response('<main>Kasir</main>',{headers:{'Content-Type':'text/html'}});
 Object.defineProperty(response,'redirected',{value:true});
 const result=context.navigationResponse({mode:'navigate'},response);
 assert.equal(result.redirected,false);
 assert.equal(result.headers.get('Content-Type'),'text/html');
 assert.equal(await result.text(),'<main>Kasir</main>');
});
test('non-navigation responses are left intact',()=>{
 const response=new Response('module');
 assert.equal(context.navigationResponse({mode:'cors'},response),response);
});
test('Hosting preserves html routes used by login',()=>{
 for(const file of ['firebase.json','firebase.spark.json'])assert.equal(JSON.parse(readFileSync(new URL('../'+file,import.meta.url))).hosting.cleanUrls,false);
});
