import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareInputRulesPatch,WORKSPACE_INPUTS} from '../scripts/prepare-input-rules-patch.mjs';
const local=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url)));
test('targeted production patch only adds missing input branches and preserves finance and existing policy',()=>{
 const live={rules:{madani_app:{'.read':'existing-read',finance:{'.write':'existing-finance'},academic:{'.write':'existing-academic'},boarding:{'.write':'existing-boarding'},workspaces:{$yearId:{resident_staff:{'.write':'existing-residents'},staff_worship:{'.write':'existing-worship'},messages:{'.write':'existing-messages'}}}}}};
 const before=structuredClone(live),{rules,added}=prepareInputRulesPatch(live,local);
 assert.deepEqual(live,before);
 const root=rules.rules.madani_app;
 for(const key of ['.read','finance','academic','boarding'])assert.deepEqual(root[key],before.rules.madani_app[key]);
 for(const key of ['resident_staff','staff_worship','messages'])assert.deepEqual(root.workspaces.$yearId[key],before.rules.madani_app.workspaces.$yearId[key]);
 for(const key of WORKSPACE_INPUTS.filter(k=>k!=='messages'))assert.deepEqual(root.workspaces.$yearId[key],local.rules.madani_app.workspaces.$yearId[key]);
 assert.deepEqual(root.health,local.rules.madani_app.health);
 assert.equal(root.workspaces.$yearId.holiday_daily,undefined);assert.equal(root.workspaces.$yearId.holiday_reports,undefined);
 assert.equal(added.length,WORKSPACE_INPUTS.length);
 assert.equal(prepareInputRulesPatch(rules,local).added.length,0);
});
