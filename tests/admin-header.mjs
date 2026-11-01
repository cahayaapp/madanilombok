import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {mountAdminHeader,bindAdminDrawer} from '../assets/js/admin-header.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
for(const page of ['index','accounts']) test(`admin ${page} shares header actions and drawer controls`,()=>{
 const dom=new JSDOM(readFileSync(new URL(`../admin/${page}.html`,import.meta.url),'utf8'));
 const previous=globalThis.document;globalThis.document=dom.window.document;
 try{
  const routes=[];const session={profile:{name:'Admin',photoURL:'../assets/brand/logo.svg'},activeRole:'admin'};
  mountAdminHeader(session,route=>routes.push(route));
  mountAdminHeader(session,route=>routes.push(route));
  assert.equal(document.querySelectorAll('.admin-mobile-header').length,1);
  assert.equal(document.querySelector('.official-avatar img').getAttribute('src'),session.profile.photoURL);
  document.querySelector('.official-bell').click();document.querySelector('.official-avatar').click();
  assert.deepEqual(routes,['work-messages','work-profile']);
  bindAdminDrawer();document.querySelector('[data-admin-menu]').click();
  assert.equal(document.querySelector('#sidebar').classList.contains('open'),true);
  assert.equal(document.querySelector('#sidebarOverlay').classList.contains('hidden'),false);
  document.querySelector('#sidebarOverlay').click();
  assert.equal(document.querySelector('[data-admin-menu]').getAttribute('aria-expanded'),'false');
  document.querySelector('[data-admin-menu]').click();
  document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(document.querySelector('#sidebar').classList.contains('open'),false);
  mountAdminHeader({profile:{name:'Siti'},activeRole:'admin'});
  assert.equal(document.querySelector('.official-avatar').textContent,'S');
 }finally{globalThis.document=previous;dom.window.close();}
});
