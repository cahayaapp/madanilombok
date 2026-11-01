import test from 'node:test';import assert from 'node:assert/strict';
import {planSparkCutover} from '../scripts/finance-spark-cutover.mjs';
import {prepareSparkRules} from '../scripts/finance-spark-rules.mjs';
const now=Date.parse('2026-11-01T04:00:00Z');
test('cutover plan preserves money, indexes legacy SPP and includes old daily spending',()=>{
 const f={wallets:{s:{spending:100000,pinHash:'a'.repeat(64)}},bills:{y:{s:{old:{typeId:'SPP',period:'2026-11'}}}},cashier_transactions:{y:{a:{studentId:'s',date:'2026-11-01',total:15000,status:'void'}}}};
 const old=structuredClone(f),p=planSparkCutover(f,now);assert.deepEqual(f,old);assert.equal(p.patch['wallets/s/pinConfigured'],true);assert.equal(p.patch['sparkBillPeriods/y/s/2026-11'],'legacy-old');assert.ok(Object.values(p.patch).some(v=>v.spent===15000));assert.ok(!JSON.stringify(p).includes('a'.repeat(64)));assert.ok(!Object.keys(p.patch).some(k=>k.endsWith('/spending')));
});
test('cutover refuses duplicate old SPP, unknown dates or repeated baseline',()=>{
 assert.throws(()=>planSparkCutover({bills:{y:{s:{a:{typeId:'SPP',period:'2026-11'},b:{typeId:'SPP',period:'2026-11'}}}}},now),/duplikat/);
 assert.throws(()=>planSparkCutover({cashier_transactions:{y:{a:{total:1}}}},now),/tanggal/);
 assert.throws(()=>planSparkCutover({sparkOps:{one:{}}},now),/sudah digunakan/);
});
test('rules preparation preserves nonfinance grants while removing inherited finance access',()=>{
 const base={rules:{madani_app:{'.read':'auth != null',students:{'.write':false},finance:{'.write':true}}}},r=prepareSparkRules(base);
 assert.equal(r.rules.madani_app['.read'],undefined);assert.equal(r.rules.madani_app.students['.read'],'auth != null');assert.equal(r.rules.madani_app.finance['.write'],false);assert.equal(base.rules.madani_app.finance['.write'],true);
 assert.throws(()=>prepareSparkRules({rules:{madani_app:{'.write':true}}}),/Ancestor/);
});
