import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setSidebarOpen,toggleSidebar} from '../assets/js/sidebar-control.js';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('shared drawer opens and closes with matching controls and backdrop state',()=>{
 const dom=new JSDOM('<aside id="sidebar"></aside><button id="sidebarOverlay" class="hidden"></button><button aria-controls="sidebar" aria-expanded="false"></button><button aria-controls="sidebar" aria-expanded="false"></button>');
 const previous=globalThis.document;globalThis.document=dom.window.document;
 try{
 toggleSidebar();assert.equal(document.getElementById('sidebar').classList.contains('open'),true);assert.equal(document.getElementById('sidebarOverlay').classList.contains('hidden'),false);assert.ok([...document.querySelectorAll('[aria-controls]')].every(b=>b.getAttribute('aria-expanded')==='true'));
 setSidebarOpen(false);assert.equal(document.getElementById('sidebar').classList.contains('open'),false);assert.equal(document.getElementById('sidebarOverlay').classList.contains('hidden'),true);assert.ok([...document.querySelectorAll('[aria-controls]')].every(b=>b.getAttribute('aria-expanded')==='false'));
 }finally{globalThis.document=previous;dom.window.close();}
});
