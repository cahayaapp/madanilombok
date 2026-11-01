import test from 'node:test';import assert from 'node:assert/strict';
import {boardingAudience,orderRundown,mountBoardingRundown} from '../assets/js/boarding-rundown.js';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('audience separates GEMA and UMUM while shared schedules remain in both',()=>{
 assert.deepEqual(boardingAudience({participantScope:'boarding_gema'}),['gema']);assert.deepEqual(boardingAudience({participantScope:'boarding_general'}),['umum']);assert.deepEqual(boardingAudience({participantScope:'all_boarding'}),['gema','umum']);assert.deepEqual(boardingAudience({}, {name:'Asrama GEMA 03:30 · Bangun tidur'}),['gema']);
});
test('rundown begins at waking and keeps after-midnight activity at the end of the cycle',()=>{
 const rows=[{id:'sleep',startTime:'22:00'},{id:'night',startTime:'01:00'},{id:'wake',startTime:'03:30',programId:'wake'},{id:'breakfast',startTime:'06:00'}];
 assert.deepEqual(orderRundown(rows,[{id:'wake',name:'Bangun tidur'}]).map(r=>r.id),['wake','breakfast','sleep','night']);assert.equal(rows[0].id,'sleep');
});
test('cards hide rundown until selected and back clears details and filters',()=>{
 const dom=new JSDOM('<main></main>');const root=dom.window.document.querySelector('main');const cache={programs:[{id:'g',name:'Halaqah GEMA'},{id:'u',name:'Kegiatan Umum'}],'daily-schedules':[{id:'g',programId:'g',participantScope:'boarding_gema',day:'Setiap Hari',startTime:'05:00'},{id:'u',programId:'u',participantScope:'boarding_general',day:'Senin',startTime:'06:00'}]};
 mountBoardingRundown({root,cache,add:()=>{},bindActions:()=>{}});assert.equal(root.querySelectorAll('.rundown-item').length,0);root.querySelector('[data-boarding-audience="gema"]').click();assert.match(root.querySelector('#dailyProgramCards').textContent,/Halaqah GEMA/);assert.doesNotMatch(root.querySelector('#dailyProgramCards').textContent,/Kegiatan Umum/);root.querySelector('#backBoarding').click();assert.equal(root.querySelector('#boardingRundown').hidden,true);assert.equal(root.querySelectorAll('.rundown-item').length,0);root.querySelector('[data-boarding-audience="umum"]').click();assert.match(root.querySelector('#dailyProgramCards').textContent,/Kegiatan Umum/);
});
