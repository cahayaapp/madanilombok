import test from 'node:test';
import assert from 'node:assert/strict';
import {fitHomeViewport} from '../assets/js/home-viewport.js';
test('home fits overflowing menus without removing cards and restores size on taller viewport',()=>{
 const previous={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 let callback,disconnected=false;
 globalThis.ResizeObserver=class{constructor(cb){callback=cb;}observe(){}disconnect(){disconnected=true;}};
 globalThis.document={};globalThis.requestAnimationFrame=fn=>{fn();return 1;};globalThis.cancelAnimationFrame=()=>{};
 const root={clientHeight:600};const holder={parentElement:root,isConnected:true,style:{},scrollHeight:900,getBoundingClientRect:()=>({height:900}),classList:{toggle(){}},querySelectorAll:()=>Array(20)};
 try{fitHomeViewport(holder);assert.equal(holder.style.transform,'scale(0.6666666666666666)');root.clientHeight=1000;callback();assert.equal(holder.style.transform,'scale(1)');holder.isConnected=false;callback();assert.equal(disconnected,true);}finally{Object.assign(globalThis,previous);}
});
