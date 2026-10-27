import test from 'node:test';
import assert from 'node:assert/strict';
import {fitHomeViewport} from '../assets/js/home-viewport.js';
test('home fits overflowing menus without removing cards and restores size on taller viewport',()=>{
 const previous={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 let callback,disconnected=false;
 globalThis.ResizeObserver=class{constructor(cb){callback=cb;}observe(){}disconnect(){disconnected=true;}};
 globalThis.document={};globalThis.requestAnimationFrame=fn=>{fn();return 1;};globalThis.cancelAnimationFrame=()=>{};
 const root={clientHeight:600};const holder={parentElement:root,isConnected:true,style:{removeProperty(key){delete this[key]},setProperty(key,value){this[key]=value}},scrollHeight:900,getBoundingClientRect:()=>({height:900}),classList:{toggle(){}},querySelectorAll:()=>Array(20)};
 try{fitHomeViewport(holder);assert.equal(holder.style.transform,undefined);assert.equal(holder.style.width,'100%');assert.ok(Number(holder.style['--home-density'])<1);root.clientHeight=1000;callback();assert.equal(holder.style['--home-density'],1);holder.isConnected=false;callback();assert.equal(disconnected,true);}finally{Object.assign(globalThis,previous);}
});
