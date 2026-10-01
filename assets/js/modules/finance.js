import { getNode, listNode, pushRecord, saveRecord, setNode, transact } from "../repository.js";
import { byId } from "../app-store.js";
import {
  pageHeader, panel, metric, table, formRow, input, textarea, select, studentOptions,
  attachAsync, escapeHtml, badge, rupiah, today, toast
} from "./common.js";

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
}

export async function renderFinanceDashboard(ctx) {
  const [payments, transactions, billsNode] = await Promise.all([
    listNode(`finance/payments/${ctx.yearId}`),
    listNode(`finance/cashier_transactions/${ctx.yearId}`),
    getNode(`finance/bills/${ctx.yearId}`)
  ]);
  const bills=[]; Object.entries(billsNode||{}).forEach(([studentId,node])=>Object.entries(node||{}).forEach(([id,b])=>bills.push({id,studentId,...b})));
  const billed=bills.reduce((s,b)=>s+Number(b.amount||0),0), paid=payments.reduce((s,p)=>s+Number(p.amount||0),0), sales=transactions.filter(t=>t.status==="paid").reduce((s,t)=>s+Number(t.total||0),0);
  ctx.root.innerHTML=pageHeader("Ringkasan Keuangan","SPP & tagihan, pembayaran, saldo santri, serta kasir kantin/koperasi.")+`
    <div class="portal-metrics">${metric("Total Tagihan",rupiah(billed),`${bills.length} tagihan`,"violet")}${metric("Pembayaran",rupiah(paid),`${payments.length} transaksi`,"blue")}${metric("Penjualan Kasir",rupiah(sales),`${transactions.length} transaksi`,"cyan")}${metric("Tunggakan",rupiah(Math.max(0,billed-paid)),"berdasarkan data tercatat","coral")}</div>
    <div class="notice info" style="margin-top:16px">Keuangan mengikuti konsep CAHAYA: SPP & Tagihan, Saldo Tabungan, Saldo Belanja, Kasir Putra/Putri, histori mutasi, dan laporan. PIN belanja dapat diaktifkan per santri melalui menu Saldo Santri.</div>`;
}

export async function renderBills(ctx) {
  const students=ctx.master.students||[]; const types=await listNode("finance/billingTypes"); const node=await getNode(`finance/bills/${ctx.yearId}`)||{}; const rows=[];
  Object.entries(node).forEach(([studentId,items])=>Object.entries(items||{}).forEach(([id,b])=>rows.push({id,studentId,...b})));
  const studentMap=byId(students);
  ctx.root.innerHTML=pageHeader("SPP & Tagihan","Buat dan pantau tagihan per santri.")+`<div class="portal-grid two">
    ${panel("Buat Tagihan",`<form id="billForm" class="portal-form">${formRow("Santri",select("studentId",studentOptions(students),"required"))}${formRow("Jenis Tagihan",select("typeId",`<option value=''>Pilih...</option>${types.map(t=>`<option value='${escapeHtml(t.id)}'>${escapeHtml(t.name)}</option>`).join("")}`,"required"))}${formRow("Periode",input("period","2026/2027","text","required"))}${formRow("Jatuh Tempo",input("dueDate",today(),"date","required"))}${formRow("Nominal",input("amount","","number","min='0' required"))}${formRow("Keterangan",textarea("description"),true)}<div class="form-actions"><button class="btn btn-primary">Buat Tagihan</button></div></form>`)}
    ${panel("Ringkasan",`<div class="portal-metrics compact">${metric("Tagihan",String(rows.length),"","violet")}${metric("Belum Lunas",String(rows.filter(r=>r.status!=="paid").length),"","coral")}</div>`)}
  </div><div style="margin-top:18px">${table(["Santri","Jenis","Periode","Jatuh Tempo","Nominal","Terbayar","Status"],rows.sort((a,b)=>String(b.dueDate||"").localeCompare(String(a.dueDate||""))).map(r=>`<tr><td><strong>${escapeHtml(studentMap[r.studentId]?.name||r.studentId)}</strong></td><td>${escapeHtml(types.find(t=>t.id===r.typeId)?.name||r.typeId||"—")}</td><td>${escapeHtml(r.period||"—")}</td><td>${escapeHtml(r.dueDate||"—")}</td><td>${rupiah(r.amount)}</td><td>${rupiah(r.paidAmount||0)}</td><td>${badge(r.status||"unpaid",r.status==="paid"?"":"gold")}</td></tr>`).join(""))}</div>`;
  attachAsync(document.getElementById("billForm"),async data=>{data.amount=Number(data.amount||0);data.paidAmount=0;data.status="unpaid";await pushRecord(`finance/bills/${ctx.yearId}/${data.studentId}`,data,ctx.session.user.uid);ctx.rerender();},"Tagihan dibuat.");
}

export async function renderPayments(ctx) {
  const students=ctx.master.students||[]; const studentMap=byId(students); const payments=await listNode(`finance/payments/${ctx.yearId}`);
  ctx.root.innerHTML=pageHeader("Pembayaran","Catat pembayaran tagihan dan cetak nomor referensi.")+`<div class="portal-grid two">
    ${panel("Terima Pembayaran",`<form id="paymentForm" class="portal-form">${formRow("Santri",select("studentId",studentOptions(students),"id='payStudent' required"))}${formRow("Tagihan",select("billId","<option value=''>Pilih santri dahulu...</option>","id='payBill' required"))}${formRow("Tanggal",input("date",today(),"date","required"))}${formRow("Jumlah",input("amount","","number","min='0' required"))}${formRow("Metode",select("method","<option>Tunai</option><option>Transfer</option><option>Virtual Account</option><option>Lainnya</option>"))}${formRow("Catatan",textarea("note"),true)}<div class="form-actions"><button class="btn btn-primary">Simpan Pembayaran</button></div></form>`)}
    ${panel("Transaksi Terakhir",payments.length?`<div class="stack-list">${payments.slice(-15).reverse().map(p=>`<article class="list-card"><div><span>${escapeHtml(p.date||"—")}</span><strong>${escapeHtml(studentMap[p.studentId]?.name||p.studentId)}</strong><small>${escapeHtml(p.method||"")} · ${escapeHtml(p.reference||p.id||"")}</small></div><b>${rupiah(p.amount)}</b></article>`).join("")}</div>`:`<div class="empty-state">Belum ada pembayaran.</div>`)}
  </div>`;
  const studentEl=document.getElementById("payStudent"), billEl=document.getElementById("payBill");
  studentEl?.addEventListener("change",async()=>{const bills=await listNode(`finance/bills/${ctx.yearId}/${studentEl.value}`);billEl.innerHTML=`<option value=''>Pilih tagihan...</option>`+bills.filter(b=>b.status!=="paid").map(b=>`<option value='${b.id}'>${escapeHtml(b.period||"")} · ${rupiah(Number(b.amount||0)-Number(b.paidAmount||0))}</option>`).join("");});
  attachAsync(document.getElementById("paymentForm"),async data=>{const billPath=`finance/bills/${ctx.yearId}/${data.studentId}/${data.billId}`;const bill=await getNode(billPath);if(!bill) throw new Error("Tagihan tidak ditemukan.");const amount=Number(data.amount||0);const outstanding=Math.max(0,Number(bill.amount||0)-Number(bill.paidAmount||0));if(amount<=0) throw new Error("Jumlah pembayaran harus lebih dari 0.");if(amount>outstanding) throw new Error(`Pembayaran melebihi sisa tagihan ${rupiah(outstanding)}.`);const newPaid=Number(bill.paidAmount||0)+amount;await setNode(billPath,{...bill,paidAmount:newPaid,status:newPaid>=Number(bill.amount||0)?"paid":"partial",updatedAt:Date.now()});await pushRecord(`finance/payments/${ctx.yearId}`,{...data,amount,reference:`PAY-${Date.now()}`},ctx.session.user.uid);ctx.rerender();},"Pembayaran tersimpan.");
}

export async function renderWallets(ctx) {
  const students=ctx.master.students||[]; const wallets=await getNode("finance/wallets")||{}; const rows=students.map(s=>({student:s,wallet:wallets[s.id]||{savings:0,spending:0}}));
  ctx.root.innerHTML=pageHeader("Saldo Santri","Pisahkan Saldo Tabungan dan Saldo Belanja. PIN 6 digit digunakan untuk transaksi kasir.")+`
    ${panel("Mutasi Saldo",`<form id="walletForm" class="portal-form max-860">${formRow("Santri",select("studentId",studentOptions(students),"required"))}${formRow("Dompet",select("walletType","<option value='savings'>Tabungan</option><option value='spending'>Belanja</option>"))}${formRow("Jenis",select("direction","<option value='in'>Setor / Tambah</option><option value='out'>Tarik / Kurangi</option>"))}${formRow("Nominal",input("amount","","number","min='0' required"))}${formRow("Keterangan",textarea("note"),true)}<div class="form-actions"><button class="btn btn-primary">Simpan Mutasi</button></div></form>`)}
    <div style="margin-top:18px">${table(["Santri","Tabungan","Saldo Belanja","PIN","Aksi"],rows.map(({student,wallet})=>`<tr><td><strong>${escapeHtml(student.name)}</strong></td><td>${rupiah(wallet.savings||0)}</td><td>${rupiah(wallet.spending||0)}</td><td>${wallet.pinHash?badge("Sudah diatur"):badge("Belum","gold")}</td><td><button class="mini-btn set-pin" data-student="${student.id}">Atur PIN</button></td></tr>`).join(""),760)}</div>`;
  attachAsync(document.getElementById("walletForm"),async data=>{const base=Number(data.amount||0);if(base<=0) throw new Error("Nominal harus lebih dari 0.");const amount=base*(data.direction==="out"?-1:1);await transact(`finance/wallets/${data.studentId}/${data.walletType}`,current=>{const now=Number(current||0);if(data.direction==="out"&&now<base) throw new Error("Saldo tidak mencukupi untuk mutasi ini.");return now+amount;});await pushRecord(`finance/wallet_transactions/${ctx.yearId}/${data.studentId}`,{date:today(),walletType:data.walletType,amount,direction:data.direction,note:data.note,actorUid:ctx.session.user.uid},ctx.session.user.uid);ctx.rerender();},"Mutasi saldo tersimpan.");
  document.querySelectorAll(".set-pin").forEach(btn=>btn.addEventListener("click",async()=>{const pin=prompt("Masukkan PIN 6 digit baru:");if(!/^\d{6}$/.test(pin||"")) return toast("PIN harus 6 digit.","warning");const hash=await sha256(pin);const wallet=await getNode(`finance/wallets/${btn.dataset.student}`)||{};await setNode(`finance/wallets/${btn.dataset.student}`,{...wallet,pinHash:hash,pinUpdatedAt:Date.now()});toast("PIN berhasil diatur.");ctx.rerender();}));
}

export async function renderProducts(ctx) {
  let units=await listNode("finance/cashierUnits"); const lockedUnit=ctx.session.activeRole==="kasir"&&ctx.session.profile.financeUnit?ctx.session.profile.financeUnit:""; if(lockedUnit) units=units.filter(u=>u.id===lockedUnit); const unit=lockedUnit||units[0]?.id||"PUTRA"; const products=await listNode(`finance/products/${unit}`);
  ctx.root.innerHTML=pageHeader("Produk & Stok","Produk kantin/koperasi dipisah per unit Putra/Putri.")+`<div class="portal-grid two">
    ${panel("Tambah Produk",`<form id="productForm" class="portal-form">${formRow("Unit",select("unitId",units.map(u=>`<option value='${u.id}' ${u.id===unit?"selected":""}>${escapeHtml(u.name)}</option>`).join("")))}${formRow("Nama Produk",input("name","","text","required"))}${formRow("Harga",input("price","","number","min='0' required"))}${formRow("Stok Awal",input("stock","0","number","min='0' required"))}${formRow("SKU",input("sku"))}<div class="form-actions"><button class="btn btn-primary">Simpan Produk</button></div></form>`)}
    ${panel("Produk Unit",products.length?`<div class="stack-list">${products.map(p=>`<article class="list-card"><div><span>${escapeHtml(p.sku||p.id)}</span><strong>${escapeHtml(p.name)}</strong><small>Stok ${escapeHtml(p.stock||0)}</small></div><b>${rupiah(p.price)}</b></article>`).join("")}</div>`:`<div class="empty-state">Belum ada produk.</div>`)}
  </div>`;
  attachAsync(document.getElementById("productForm"),async data=>{const unitId=data.unitId;delete data.unitId;data.price=Number(data.price||0);data.stock=Number(data.stock||0);data.active=true;await pushRecord(`finance/products/${unitId}`,data,ctx.session.user.uid);ctx.rerender();},"Produk tersimpan.");
}

export async function renderCashier(ctx) {
  const allStudents=(ctx.master.students||[]).filter(s=>s.boardingStatus==="boarding"); let units=await listNode("finance/cashierUnits"); const lockedUnit=ctx.session.activeRole==="kasir"&&ctx.session.profile.financeUnit?ctx.session.profile.financeUnit:""; if(lockedUnit) units=units.filter(u=>u.id===lockedUnit); const defaultUnit=lockedUnit||units[0]?.id||"PUTRA"; const initialGender=units.find(u=>u.id===defaultUnit)?.gender||""; const students=allStudents.filter(s=>!initialGender||s.gender===initialGender);
  ctx.root.innerHTML=pageHeader("Kasir Kantin / Koperasi","Transaksi memakai Saldo Belanja dan PIN santri.")+`<div class="portal-grid cashier-grid">
    ${panel("Transaksi",`<form id="cashierForm" class="portal-form">${formRow("Unit Kasir",select("unitId",units.map(u=>`<option value='${u.id}' ${u.id===defaultUnit?"selected":""}>${escapeHtml(u.name)}</option>`).join(""),"id='cashierUnit'"))}${formRow("Santri",select("studentId",studentOptions(students),"id='cashierStudent' required"))}${formRow("Produk",select("productId","<option value=''>Memuat produk...</option>","id='cashierProduct' required"))}${formRow("Jumlah",input("qty","1","number","min='1' required"))}${formRow("PIN 6 digit",input("pin","","password","inputmode='numeric' maxlength='6' required"))}<div id="cashierSummary" class="cashier-summary full">Pilih produk untuk melihat total.</div><div class="form-actions"><button class="btn btn-primary">Bayar dengan Saldo Belanja</button></div></form>`)}
    ${panel("Informasi",`<div id="cashierInfo" class="empty-state">Pilih santri untuk melihat saldo.</div><div class="notice" style="margin-top:12px">Batas belanja harian default mengikuti konfigurasi keuangan. Untuk production, transaksi besar sebaiknya dipindahkan ke Cloud Function agar saldo dan stok benar-benar atomic.</div>`)}
  </div>`;
  const unitEl=document.getElementById("cashierUnit"), studentEl=document.getElementById("cashierStudent"), productEl=document.getElementById("cashierProduct"), info=document.getElementById("cashierInfo"), summary=document.getElementById("cashierSummary");
  let products=[];
  async function loadProducts(){products=await listNode(`finance/products/${unitEl.value}`);productEl.innerHTML=`<option value=''>Pilih produk...</option>`+products.filter(p=>p.active!==false&&Number(p.stock||0)>0).map(p=>`<option value='${p.id}'>${escapeHtml(p.name)} · ${rupiah(p.price)} · stok ${p.stock}</option>`).join("");}
  async function loadStudent(){if(!studentEl.value)return;const w=await getNode(`finance/wallets/${studentEl.value}`)||{};info.className="";info.innerHTML=`<div class="portal-metrics compact">${metric("Saldo Belanja",rupiah(w.spending||0),"","cyan")}${metric("Tabungan",rupiah(w.savings||0),"","violet")}${metric("PIN",w.pinHash?"Aktif":"Belum diatur","","blue")}</div>`;}
  function updateSummary(){const p=products.find(x=>x.id===productEl.value);const qty=Number(document.querySelector("[name=qty]")?.value||1);summary.textContent=p?`Total: ${rupiah(Number(p.price||0)*qty)}`:"Pilih produk untuk melihat total.";}
  async function syncUnit(){const gender=units.find(u=>u.id===unitEl.value)?.gender||"";const scoped=allStudents.filter(s=>!gender||s.gender===gender);studentEl.innerHTML=studentOptions(scoped);info.className="empty-state";info.textContent="Pilih santri untuk melihat saldo.";await loadProducts();updateSummary();}
  unitEl?.addEventListener("change",syncUnit);studentEl?.addEventListener("change",loadStudent);productEl?.addEventListener("change",updateSummary);document.querySelector("[name=qty]")?.addEventListener("input",updateSummary);await syncUnit();
  attachAsync(document.getElementById("cashierForm"),async data=>{const product=products.find(p=>p.id===data.productId);if(!product) throw new Error("Produk tidak ditemukan.");const qty=Number(data.qty||1);if(Number(product.stock||0)<qty) throw new Error("Stok tidak cukup.");const wallet=await getNode(`finance/wallets/${data.studentId}`)||{};if(!wallet.pinHash) throw new Error("PIN santri belum diatur oleh admin keuangan.");if(await sha256(data.pin)!==wallet.pinHash) throw new Error("PIN salah.");const total=Number(product.price||0)*qty;const settings=await getNode("settings/finance")||{};const limit=Number(settings.dailySpendingLimit||50000);const dayTx=await listNode(`finance/cashier_transactions/${ctx.yearId}`);const spentToday=dayTx.filter(t=>t.studentId===data.studentId&&t.date===today()&&t.status!=="void").reduce((s,t)=>s+Number(t.total||0),0);if(spentToday+total>limit) throw new Error(`Melebihi batas belanja harian ${rupiah(limit)}.`);if(Number(wallet.spending||0)<total) throw new Error("Saldo belanja tidak cukup.");await transact(`finance/products/${data.unitId}/${data.productId}/stock`,cur=>{const stock=Number(cur||0);if(stock<qty) throw new Error("Stok berubah dan tidak lagi mencukupi.");return stock-qty;});try{await transact(`finance/wallets/${data.studentId}/spending`,cur=>{const balance=Number(cur||0);if(balance<total) throw new Error("Saldo berubah dan tidak lagi mencukupi.");return balance-total;});}catch(err){await transact(`finance/products/${data.unitId}/${data.productId}/stock`,cur=>Number(cur||0)+qty);throw err;}await pushRecord(`finance/cashier_transactions/${ctx.yearId}`,{date:today(),reference:`SALE-${Date.now()}`,unitId:data.unitId,studentId:data.studentId,items:[{productId:data.productId,name:product.name,qty,price:Number(product.price||0),subtotal:total}],total,status:"paid",cashierUid:ctx.session.user.uid,pinVerified:true},ctx.session.user.uid);await pushRecord(`finance/wallet_transactions/${ctx.yearId}/${data.studentId}`,{date:today(),walletType:"spending",amount:-total,direction:"out",note:`Belanja ${product.name} x${qty}`,source:"cashier"},ctx.session.user.uid);toast("Transaksi berhasil.");ctx.rerender();},"Transaksi kasir berhasil.");
}

export async function renderFinanceHistory(ctx) {
  const allTx=await listNode(`finance/cashier_transactions/${ctx.yearId}`);
  const students=byId(ctx.master.students||[]);
  const lockedUnit=ctx.session.activeRole==="kasir"&&ctx.session.profile.financeUnit?ctx.session.profile.financeUnit:"";
  const tx=allTx.filter(t=>!lockedUnit||t.unitId===lockedUnit).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const canVoid=["kasir","admin","super_admin","director","deputy_director"].includes(ctx.session.activeRole);
  ctx.root.innerHTML=pageHeader("Riwayat Transaksi","Riwayat kasir Putra/Putri beserta jejak pembatalan/refund.")+table(["Referensi","Tanggal","Santri","Unit","Item","Total","Status","Aksi"],tx.map(t=>`<tr><td><small>${escapeHtml(t.reference||t.id||"—")}</small></td><td>${escapeHtml(t.date||"—")}</td><td><strong>${escapeHtml(students[t.studentId]?.name||t.studentId||"—")}</strong></td><td>${escapeHtml(t.unitId||"—")}</td><td>${escapeHtml((t.items||[]).map(i=>`${i.name} x${i.qty}`).join(", ")||"—")}</td><td>${rupiah(t.total)}</td><td>${badge(t.status||"—",t.status==="void"?"red":"")}${t.voidReason?`<br><small>${escapeHtml(t.voidReason)}</small>`:""}</td><td>${canVoid&&t.status==="paid"?`<button class="mini-btn void-sale" data-id="${t.id}">Batalkan / Refund</button>`:"—"}</td></tr>`).join(""),1180);
  document.querySelectorAll(".void-sale").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=btn.dataset.id;
    const current=await getNode(`finance/cashier_transactions/${ctx.yearId}/${id}`);
    if(!current||current.status!=="paid") return toast("Transaksi tidak dapat dibatalkan.","warning");
    if(lockedUnit&&current.unitId!==lockedUnit) return toast("Transaksi berada di luar unit kasir Anda.","warning");
    const reason=prompt("Alasan pembatalan/refund:");
    if(!reason?.trim()) return;
    if(!confirm(`Refund ${rupiah(current.total)} ke saldo belanja santri? Stok produk juga akan dikembalikan.`)) return;
    await saveRecord(`finance/cashier_transactions/${ctx.yearId}`,id,{...current,status:"voiding",voidReason:reason.trim(),voidedBy:ctx.session.user.uid,voidedAt:Date.now()},ctx.session.user.uid);
    try {
      for(const item of current.items||[]){
        if(item.productId) await transact(`finance/products/${current.unitId}/${item.productId}/stock`,cur=>Number(cur||0)+Number(item.qty||0));
      }
      await transact(`finance/wallets/${current.studentId}/spending`,cur=>Number(cur||0)+Number(current.total||0));
      await pushRecord(`finance/wallet_transactions/${ctx.yearId}/${current.studentId}`,{date:today(),walletType:"spending",amount:Number(current.total||0),direction:"in",note:`Refund ${current.reference||id}: ${reason.trim()}`,source:"cashier_void",cashierTransactionId:id},ctx.session.user.uid);
      await saveRecord(`finance/cashier_transactions/${ctx.yearId}`,id,{...current,status:"void",voidReason:reason.trim(),voidedBy:ctx.session.user.uid,voidedAt:Date.now()},ctx.session.user.uid);
      toast("Transaksi dibatalkan, saldo dan stok dikembalikan.");ctx.rerender();
    } catch(err) {
      await saveRecord(`finance/cashier_transactions/${ctx.yearId}`,id,{...current,status:"void_error",voidReason:reason.trim(),voidedBy:ctx.session.user.uid,voidedAt:Date.now(),voidError:err.message||String(err)},ctx.session.user.uid);
      throw new Error(`Refund membutuhkan rekonsiliasi manual: ${err.message||err}`);
    }
  }));
}

export async function renderFinanceReports(ctx) {
  const [payments,tx,walletTxNode]=await Promise.all([listNode(`finance/payments/${ctx.yearId}`),listNode(`finance/cashier_transactions/${ctx.yearId}`),getNode(`finance/wallet_transactions/${ctx.yearId}`)]);let walletCount=0;Object.values(walletTxNode||{}).forEach(n=>walletCount+=Object.keys(n||{}).length);
  const paid=payments.reduce((s,p)=>s+Number(p.amount||0),0),sales=tx.filter(t=>t.status==="paid").reduce((s,t)=>s+Number(t.total||0),0);
  ctx.root.innerHTML=pageHeader("Laporan Keuangan","Ringkasan awal untuk pembayaran dan kasir.")+`<div class="portal-metrics">${metric("Pembayaran Tagihan",rupiah(paid),`${payments.length} transaksi`,"blue")}${metric("Penjualan Kasir",rupiah(sales),`${tx.length} transaksi`,"cyan")}${metric("Mutasi Saldo",String(walletCount),"transaksi saldo","violet")}</div><div class="notice info" style="margin-top:16px">Laporan ini adalah baseline aplikasi. Rekonsiliasi bank/kas, tutup kas, dan ekspor laporan resmi dapat ditambahkan setelah alur keuangan Al-Madani dikunci.</div>`;
}
