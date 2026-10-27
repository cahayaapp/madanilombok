import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {roleMenuItems,menuSelection,menuVisible,configuredBottom} from '../assets/js/menu-layout.js';
import {setFeatureSwitches} from '../assets/js/feature-switches.js';
import {arrangeHome} from '../assets/js/home-layout.js';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('per-role placements support empty sections, preserve defaults and constrain bottom routes',()=>{
 try{
 setFeatureSwitches({naqib:{_menus:{quick:{'naqib-report':true,'naqib-attendance':false},sidebar:{'naqib-report':false},bottom:{schedule:'finance-dashboard',messages:'naqib-report',profile:''}}}});
 assert.deepEqual(menuSelection('naqib','quick',[]),['naqib-report']);
 assert.equal(menuVisible('naqib','sidebar','naqib-report'),false);
 assert.equal(menuVisible('guru_mapel','sidebar','naqib-report'),true);
 assert.deepEqual(configuredBottom('naqib',{home:'dashboard'},id=>id==='naqib-report'),{home:'dashboard',schedule:null,messages:'naqib-report',profile:null});
 assert.ok(!roleMenuItems('naqib').some(i=>i.id==='admin-accounts'));
 assert.ok(!roleMenuItems('naqib').some(i=>i.id==='naqib-kpi'));
 }finally{setFeatureSwitches({});}
});
test('home uses configured quick and other menus and rejects injected unauthorized routes',()=>{
 const dom=new JSDOM('<div id="root"></div>');const previous=globalThis.document;globalThis.document=dom.window.document;
 try{
 setFeatureSwitches({naqib:{_menus:{quick:{'naqib-report':true,'admin-accounts':true},other:{'work-guide':true}}}});
 const root=document.getElementById('root');let target;
 arrangeHome({root,session:{activeRole:'naqib'},navigate:id=>target=id},roleMenuItems('naqib'));
 assert.deepEqual([...root.querySelectorAll('.premium-quick')].map(b=>b.dataset.homeRoute),['naqib-report']);
 assert.deepEqual([...root.querySelectorAll('.premium-menu-grid button')].map(b=>b.dataset.homeRoute),['work-guide']);
 root.querySelector('.premium-quick').click();assert.equal(target,'naqib-report');
 setFeatureSwitches({naqib:{'boarding~naqib~reports':false,_menus:{quick:{'naqib-report':true},other:{'work-guide':false}}}});
 arrangeHome({root,session:{activeRole:'naqib'},navigate:()=>{}},roleMenuItems('naqib'));
 assert.equal(root.querySelectorAll('.premium-quick').length,0);
 assert.equal(root.querySelectorAll('.premium-menu-grid button').length,0);
 }finally{setFeatureSwitches({});globalThis.document=previous;dom.window.close();}
});
test('configured homes cap at four quick and six other cards; overflow routes remain in all menus',()=>{
 const dom=new JSDOM('<div id="root"></div>');const previous=globalThis.document;globalThis.document=dom.window.document;
 try{
 const items=roleMenuItems('naqib').filter(i=>i.id!=='dashboard');
 setFeatureSwitches({naqib:{_menus:{quick:Object.fromEntries(items.slice(0,5).map(i=>[i.id,true])),other:Object.fromEntries(items.slice(5).map(i=>[i.id,true]))}}});
 const root=document.getElementById('root');let target;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 arrangeHome({root,session:{activeRole:'naqib'},navigate:id=>target=id},items);
 assert.equal(root.querySelectorAll('.premium-quick').length,4);
 assert.equal(root.querySelectorAll('.premium-menu-grid button').length,Math.min(6,items.length-5));
 root.querySelector('[data-all-menus]').click();
 const overflow=root.querySelector(`dialog [data-home-route="${items[4].id}"]`);assert.ok(overflow);overflow.click();assert.equal(target,items[4].id);
 }finally{setFeatureSwitches({});globalThis.document=previous;dom.window.close();}
});
