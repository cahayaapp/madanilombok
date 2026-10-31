import test from 'node:test';
import assert from 'node:assert/strict';
import {setFeatureSwitches,normalizeMenuSettings,featureEnabled} from '../assets/js/feature-switches.js';
import {menuSelection,roleMenuItems,menuVisible} from '../assets/js/menu-layout.js';
test('legacy counselor placements expose four primary and three supporting routes',()=>{
 setFeatureSwitches({konselor:{_menus:{quick:{'case-inbox':true,'case-active':true,counseling:true,'case-history':true},other:{'warning-letter':true},sidebar:{'case-inbox':true,'warning-letter':true}}}});
 assert.deepEqual(menuSelection('konselor','quick',[]),['case-inbox','counseling-book','violation-evaluation','warning-letter']);
 assert.deepEqual(menuSelection('konselor','other',[]),['work-profile','counselor-guide','education-calendar']);
 for(const id of [...menuSelection('konselor','quick',[]),...menuSelection('konselor','other',[])]){
  assert.ok(roleMenuItems('konselor').some(i=>i.id===id),id);assert.ok(menuVisible('konselor','sidebar',id));
 }
 setFeatureSwitches({});
});
test('current placements and intentional feature restrictions survive migration',()=>{
 const current={counselorVersion:2,quick:{'case-inbox':true,'counseling-book':false}};
 assert.equal(normalizeMenuSettings('konselor',current),current);
 const explicit={quick:{'counseling-book':false}};
 assert.equal(normalizeMenuSettings('konselor',explicit),explicit);
 assert.equal(normalizeMenuSettings('naqib',current),current);
 setFeatureSwitches({konselor:{'boarding~counselor~session':false,_menus:{quick:{'case-inbox':true}}}});
 assert.equal(featureEnabled('boarding.counselor.session','konselor'),false);
 setFeatureSwitches({});
});
