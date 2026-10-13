import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {labelMobileTables} from '../assets/js/mobile-layout.js';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('mobile table labels preserve controls, values, and spanning empty rows',()=>{
 const d=new JSDOM('<table><thead><tr><th>Nama</th><th>Status</th></tr></thead><tbody><tr><td>Santri</td><td><button>Simpan</button><input value="Hadir"></td></tr><tr><td colspan="2">Kosong</td></tr></tbody></table>').window.document;
 const button=d.querySelector('button');let clicks=0;button.onclick=()=>clicks++;
 labelMobileTables(d);labelMobileTables(d);
 assert.deepEqual([...d.querySelectorAll('td')].map(c=>c.dataset.mobileLabel),['Nama','Status','']);
 assert.equal(d.querySelector('button'),button);button.click();assert.equal(clicks,1);
 assert.equal(d.querySelector('input').value,'Hadir');
 const row=d.querySelector('tbody').insertRow();row.insertCell().textContent='Baru';row.insertCell().textContent='Izin';labelMobileTables(d);assert.equal(row.cells[1].dataset.mobileLabel,'Status');
});
