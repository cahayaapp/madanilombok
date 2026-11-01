import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {relationChecklist} from '../assets/js/relation-checklist.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('checklists retain all saved selections including missing references and serialize zero or multiple values',()=>{
 const dom=new JSDOM(`<form>${relationChecklist('unitIds',[{value:'a',label:'Unit A'},{value:'b',label:'<img src=x>'}],['a','legacy'])}</form>`),doc=dom.window.document;
 assert.equal(doc.querySelector('img'),null);assert.deepEqual(new dom.window.FormData(doc.querySelector('form')).getAll('unitIds'),['a','legacy']);
 doc.querySelector('[value=b]').checked=true;assert.deepEqual(new dom.window.FormData(doc.querySelector('form')).getAll('unitIds'),['a','b','legacy']);
 for(const input of doc.querySelectorAll('input'))input.checked=false;assert.deepEqual(new dom.window.FormData(doc.querySelector('form')).getAll('unitIds'),[]);
});
