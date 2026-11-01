import {minimartAPI} from './client.js';
import {pageHeader,panel,rupiah as rp,escapeHtml as e,table} from '../modules/common.js';
export async function renderLocalParentFinance(ctx){
 const ids=ctx.session.profile.studentIds||[ctx.session.profile.studentId].filter(Boolean);
 if(!ids.length){ctx.root.innerHTML=pageHeader('Keuangan Anak','Belum ada anak terhubung.');return;}
 ctx.root.innerHTML=pageHeader('Keuangan Anak','Saldo dan riwayat belanja yang terhubung dengan akun wali.')+'<div id="mmParent" role="status">Memuat…</div>';
 const host=ctx.root.querySelector('#mmParent');
 async function load(studentId){try{
  const data=await (ctx.minimartAPI||minimartAPI).parent({studentId});
  host.innerHTML=`<label class="field">Anak<select id="mmChild">${ids.map(id=>`<option value="${e(id)}" ${id===studentId?'selected':''}>${e(id===studentId?data.student.name:id)}</option>`).join('')}</select></label><div class="mm-stats"><article><span>Saldo belanja</span><b>${rp(data.wallet.spending)}</b></article><article><span>Tabungan</span><b>${rp(data.wallet.savings)}</b></article></div>${panel('Riwayat Belanja',table(['Nomor','Tanggal','Produk','Total','Metode','Status'],data.sales.map(s=>`<tr><td>${e(s.reference||s.id)}</td><td>${e(s.date)}</td><td>${e((s.items||[]).map(i=>`${i.name} × ${i.qty}`).join(', '))}</td><td>${rp(s.total)}</td><td>${e(s.method||'WALLET')}</td><td>${e(s.status)}</td></tr>`).join(''),650))}${panel('Tagihan',table(['Periode','Nominal','Terbayar','Status'],data.bills.map(b=>`<tr><td>${e(b.period)}</td><td>${rp(b.amount)}</td><td>${rp(b.paidAmount)}</td><td>${e(b.status)}</td></tr>`).join(''),450))}`;
  host.querySelector('#mmChild').onchange=ev=>load(ev.target.value);
 }catch(error){host.textContent=error.message;host.setAttribute('role','alert');}}
 await load(ids[0]);
}
