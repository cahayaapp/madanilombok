import {SURAHS} from './surahs.js';
import {e} from './ui.js';

export function expandSurahRange(first,last,end){
 const a=Number(first),b=Number(last),n=Number(end);
 if(first===''||last===''||![a,b,n].every(Number.isInteger)||!SURAHS[a]||!SURAHS[b]||n<1||n>SURAHS[b].ayat)throw Error('Lengkapi rentang surat dan ayat terakhir sesuai jumlah ayat surat.');
 const parts=[],step=b>=a?1:-1;
 for(let i=a;;i+=step){parts.push({surah:i,start:1,end:i===b?n:SURAHS[i].ayat});if(i===b)break;}
 return parts;
}
export function mountPortions(card,validate){
 const host=card.querySelector('[data-portions]'),options=SURAHS.map((s,i)=>`<option value="${i}">${i+1}. ${e(s.nama)}</option>`).join('');
 host.innerHTML=`<div class="quran-mode" role="group" aria-label="Cara memilih surat"><button type="button" class="teacher-secondary" data-portion-mode="manual" aria-pressed="true">Satu Surat / Manual</button><button type="button" class="teacher-secondary" data-portion-mode="range" aria-pressed="false">Banyak Surat</button></div><div data-manual></div><button type="button" class="teacher-secondary quran-add" data-add>＋ Tambah Baris Surat</button><div data-range hidden class="quran-range"><label class="field">Dari Surat<select data-first>${options}</select></label><label class="field">Sampai Surat<select data-last>${options}</select></label><label class="field">Ayat Terakhir<input data-last-verse type="number" min="1" value="1"></label><p class="teacher-muted">Setiap surat dihitung mulai ayat 1 hingga akhir, kecuali surat terakhir sesuai ayat yang diisi. Urutan maju atau mundur mengikuti pilihan surat.</p></div><p class="quran-total" aria-live="polite">Total ayat: <strong data-total>1</strong></p>`;
 let mode='manual';
 const read=()=>validate(mode==='range'?expandSurahRange(host.querySelector('[data-first]').value,host.querySelector('[data-last]').value,host.querySelector('[data-last-verse]').value):[...host.querySelectorAll('[data-portion]')].map(row=>({surah:+row.querySelector('[data-surah]').value,start:row.querySelector('[data-start]').value,end:row.querySelector('[data-end]').value})));
 const update=()=>{try{host.querySelector('[data-total]').textContent=read().reduce((n,p)=>n+p.end-p.start+1,0);}catch{host.querySelector('[data-total]').textContent='Periksa rentang ayat';}};
 const add=()=>{const row=document.createElement('div');row.className='quran-portion';row.dataset.portion='';row.innerHTML=`<label class="field quran-surah">Surat<select data-surah>${options}</select></label><label class="field">Dari Ayat<input data-start type="number" min="1" value="1"></label><label class="field">Sampai Ayat<input data-end type="number" min="1" value="1"></label><button type="button" class="teacher-secondary quran-remove" data-remove>Hapus Baris</button>`;row.querySelector('[data-remove]').onclick=()=>{row.remove();update();};host.querySelector('[data-manual]').append(row);update();};
 host.querySelector('[data-add]').onclick=add;
 host.querySelectorAll('[data-portion-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.portionMode;host.querySelector('[data-manual]').hidden=mode!=='manual';host.querySelector('[data-add]').hidden=mode!=='manual';host.querySelector('[data-range]').hidden=mode!=='range';host.querySelectorAll('[data-portion-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update();});
 host.addEventListener('input',update);host.addEventListener('change',update);add();return read;
}
