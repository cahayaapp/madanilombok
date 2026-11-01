import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mountLeaveReview} from '../assets/js/teacher/leave-review-view.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('review filters include cancelled requests, accurate counts, safe content and actionable pending records',()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');
 const ctx={session:{user:{uid:'head'}},master:{units:[{id:'u',name:'SMP'}],classes:[{id:'c',name:'VII'}],subjects:[{id:'m',name:'IPA'}]}};
 const rows=['pending','approved','rejected','cancelled'].map((status,i)=>({id:String(i),owner:'teacher',teacherUid:'teacher',teacherName:'Guru Contoh',unitId:'u',type:'Sakit',reason:'<script>bad()</script>',contact:'Kontak contoh',handover:'Tugas kelas',lessons:[{classId:'c',subjectId:'m',date:'2026-11-01',startTime:'08:00',endTime:'09:00'}],...(status==='pending'?{}:{decision:{status,actorName:'Kepala Unit',note:'Catatan keputusan',decidedAt:1793491200000}})}));
 mountLeaveReview(root,rows,ctx);assert.equal(root.querySelectorAll('.leave-review-card').length,4);assert.equal(root.querySelector('script'),null);assert.equal(root.querySelectorAll('[data-request]').length,1);assert.match(root.textContent,/VII/);assert.match(root.textContent,/IPA/);assert.match(root.textContent,/WITA/);
 root.querySelector('[data-leave-status="approved"]').click();assert.equal(root.querySelectorAll('.leave-review-card:not([hidden])').length,1);assert.equal(root.querySelector('[data-leave-status="approved"]').getAttribute('aria-pressed'),'true');root.querySelector('[data-leave-status="all"]').click();assert.equal(root.querySelectorAll('.leave-review-card:not([hidden])').length,4);
 mountLeaveReview(root,[],ctx);assert.equal(root.querySelector('.leave-review-empty').hidden,false);
});
