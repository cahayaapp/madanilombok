(function(global){
  'use strict';

  const CFG = window.CAHAYA_CONFIG.firebase;

  const ROOT = 'cahaya_app/keuangan';
  const P = {
    root: ROOT,
    accounts: `${ROOT}/rekening_santri`,
    bills: `${ROOT}/tagihan`,
    payments: `${ROOT}/pembayaran`,
    ledger: `${ROOT}/mutasi`,
    products: `${ROOT}/produk`,
    sales: `${ROOT}/transaksi_kantin`,
    audit: `${ROOT}/audit`,
    settings: `${ROOT}/pengaturan`,
    classes: 'cahaya_app/master_akademik/kelas'
  };

  function ensureFirebase(){
    if (!global.firebase) throw new Error('Firebase belum dimuat.');
    if (!firebase.apps.length) firebase.initializeApp(CFG);
    return firebase.database();
  }

  const db = ensureFirebase();

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function norm(value){
    return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  }
  function key(value){
    const n = norm(value);
    return n || `id${Date.now().toString(36)}`;
  }
  function vals(obj){
    return obj && typeof obj === 'object' ? Object.entries(obj).map(([__key,v]) => ({__key,...(v||{})})) : [];
  }
  function money(value){
    return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0);
  }
  function number(value){ return Number(value)||0; }
  function localDate(input){
    const d = input ? new Date(input) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,10);
  }
  function isoNow(){ return new Date().toISOString(); }
  function dateLabel(value){
    if(!value) return '-';
    const d = new Date(String(value).length===10 ? `${value}T00:00:00` : value);
    if(Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:String(value).includes('T')?'2-digit':undefined,minute:String(value).includes('T')?'2-digit':undefined}).format(d);
  }
  function uid(prefix='id'){
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
  }
  function readJSON(k){
    try { return JSON.parse(localStorage.getItem(k)||'{}'); } catch(e){ return {}; }
  }
  function actor(){
    const u = readJSON('cahayaCurrentUser');
    return {
      uid: u.uid || '',
      username: u.username || u.email?.split('@')[0] || 'sistem',
      nama: u.label || u.nama || u.username || 'Sistem CAHAYA',
      roles: Array.isArray(u.akses) ? u.akses : [u.role].filter(Boolean)
    };
  }
  function waliProfile(){ return readJSON('cahayaWaliStudentProfile'); }
  function waliStudentName(){
    const p = waliProfile();
    return p.namaAnak || p.namaSantri || p.label || '';
  }
  function accountDefaults(student={}){
    return {
      studentKey: student.studentKey || key(student.nama || student.namaSantri),
      namaSantri: student.nama || student.namaSantri || '',
      kelas: student.kelas || '',
      saldoTabungan: 0,
      saldoBelanja: 0,
      limitHarian: 50000,
      pengeluaranHariIni: 0,
      tanggalPengeluaran: localDate(),
      aktif: true,
      pinHash: '',
      pinSalt: '',
      pinGagal: 0,
      pinTerkunciSampai: 0,
      dibuatPada: isoNow(),
      diperbaruiPada: isoNow()
    };
  }

  function rightRotate(value, amount){ return (value >>> amount) | (value << (32-amount)); }
  function sha256(ascii){
    const mathPow = Math.pow, maxWord = mathPow(2,32), lengthProperty='length';
    let i,j,result='',words=[],asciiBitLength=ascii[lengthProperty]*8;
    let hash=sha256.h=sha256.h||[],k=sha256.k=sha256.k||[],primeCounter=k[lengthProperty];
    const isComposite={};
    for(let candidate=2;primeCounter<64;candidate++){
      if(!isComposite[candidate]){
        for(i=0;i<313;i+=candidate)isComposite[i]=candidate;
        hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
        k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;
      }
    }
    ascii+='\x80';
    while(ascii[lengthProperty]%64-56)ascii+='\x00';
    for(i=0;i<ascii[lengthProperty];i++){
      j=ascii.charCodeAt(i);
      if(j>>8)return '';
      words[i>>2]|=j<<((3-i)%4)*8;
    }
    words[words[lengthProperty]]=((asciiBitLength/maxWord)|0);
    words[words[lengthProperty]]=asciiBitLength;
    for(j=0;j<words[lengthProperty];){
      const w=words.slice(j,j+=16),oldHash=hash.slice(0); hash=hash.slice(0,8);
      for(i=0;i<64;i++){
        const i2=i+j,w15=w[i-15],w2=w[i-2],a=hash[0],e=hash[4];
        const temp1=hash[7]+(rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:((w[i-16]+(rightRotate(w15,7)^rightRotate(w15,18)^(w15>>>3))+w[i-7]+(rightRotate(w2,17)^rightRotate(w2,19)^(w2>>>10)))|0));
        const temp2=(rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
        hash=[(temp1+temp2)|0].concat(hash); hash[4]=(hash[4]+temp1)|0; hash.pop();
      }
      for(i=0;i<8;i++)hash[i]=(hash[i]+oldHash[i])|0;
    }
    for(i=0;i<8;i++)for(j=3;j+1;j--){const b=(hash[i]>>(j*8))&255;result+=(b<16?'0':'')+b.toString(16);} return result;
  }
  function randomSalt(){ return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,12)}`; }
  function hashPin(pin,salt){ return sha256(`${salt}|${String(pin)}`); }
  function validPin(pin){ return /^\d{6}$/.test(String(pin||'')); }

  async function loadStudents(){
    let map={};
    try { const s=await db.ref(P.classes).once('value'); map=s.val()||{}; } catch(e){}
    if(!Object.keys(map).length && global.dataSantri) map=global.dataSantri;
    const rows=[];
    Object.entries(map||{}).forEach(([kelas,list])=>{
      const names=Array.isArray(list)?list:Object.values(list||{});
      names.forEach(n=>{ const nama=typeof n==='string'?n:(n.nama||n.namaSantri||''); if(nama) rows.push({studentKey:key(nama),nama,kelas}); });
    });
    return rows.sort((a,b)=>a.kelas.localeCompare(b.kelas,'id')||a.nama.localeCompare(b.nama,'id'));
  }

  async function ensureAccount(student){
    const sk=student.studentKey||key(student.nama||student.namaSantri);
    const ref=db.ref(`${P.accounts}/${sk}`);
    const snap=await ref.once('value');
    if(!snap.exists()) await ref.set(accountDefaults({...student,studentKey:sk}));
    else {
      const cur=snap.val()||{};
      const patch={studentKey:sk,namaSantri:student.nama||student.namaSantri||cur.namaSantri||'',kelas:student.kelas||cur.kelas||'',diperbaruiPada:isoNow()};
      await ref.update(patch);
    }
    return sk;
  }

  async function initializeAccounts(students, onProgress){
    let done=0;
    for(const s of students){ await ensureAccount(s); done++; if(onProgress) onProgress(done,students.length,s); }
    return done;
  }

  async function getAccount(studentKey){
    const snap=await db.ref(`${P.accounts}/${studentKey}`).once('value');
    return snap.exists()?{__key:studentKey,...snap.val()}:null;
  }

  async function setPin(studentKey,pin,who=actor()){
    if(!validPin(pin)) throw new Error('PIN harus terdiri dari 6 angka.');
    const salt=randomSalt();
    await db.ref(`${P.accounts}/${studentKey}`).update({pinSalt:salt,pinHash:hashPin(pin,salt),pinGagal:0,pinTerkunciSampai:0,diperbaruiPada:isoNow()});
    await audit('PIN_DIATUR',{studentKey},who);
  }

  async function verifyPin(studentKey,pin){
    const ref=db.ref(`${P.accounts}/${studentKey}`);
    const snap=await ref.once('value'); const a=snap.val();
    if(!a) return {ok:false,message:'Rekening santri belum tersedia.'};
    const now=Date.now();
    if(number(a.pinTerkunciSampai)>now) return {ok:false,locked:true,message:`PIN terkunci sementara sampai ${new Date(a.pinTerkunciSampai).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}.`};
    if(!a.pinHash||!a.pinSalt) return {ok:false,noPin:true,message:'PIN belanja belum diatur.'};
    const ok=hashPin(pin,a.pinSalt)===a.pinHash;
    if(ok){ await ref.update({pinGagal:0,pinTerkunciSampai:0}); return {ok:true,account:{__key:studentKey,...a}}; }
    let attempts=number(a.pinGagal)+1, lockedUntil=0;
    if(attempts>=3){ attempts=0; lockedUntil=Date.now()+5*60*1000; }
    await ref.update({pinGagal:attempts,pinTerkunciSampai:lockedUntil,diperbaruiPada:isoNow()});
    return {ok:false,locked:Boolean(lockedUntil),message:lockedUntil?'PIN salah 3 kali. Transaksi dikunci selama 5 menit.':`PIN salah. Sisa percobaan: ${3-attempts}.`};
  }

  async function audit(action,data={},who=actor()){
    const id=uid('audit');
    await db.ref(`${P.audit}/${id}`).set({id,action,data,actor:who,waktu:isoNow(),tanggal:localDate()});
    return id;
  }

  async function addLedger(entry){
    const id=entry.id||uid('mutasi');
    const payload={id,tanggal:entry.tanggal||localDate(),waktu:entry.waktu||isoNow(),...entry};
    await db.ref(`${P.ledger}/${id}`).set(payload);
    return payload;
  }

  async function mutateBalances(studentKey, deltaTabungan, deltaBelanja, meta={}){
    const ref=db.ref(`${P.accounts}/${studentKey}`);
    let before=null,after=null;
    const tx=await ref.transaction(current=>{
      if(!current) return;
      before={tabungan:number(current.saldoTabungan),belanja:number(current.saldoBelanja)};
      const nextTab=before.tabungan+number(deltaTabungan), nextBel=before.belanja+number(deltaBelanja);
      if(nextTab<0||nextBel<0) return;
      after={tabungan:nextTab,belanja:nextBel};
      return {...current,saldoTabungan:nextTab,saldoBelanja:nextBel,diperbaruiPada:isoNow()};
    });
    if(!tx.committed||!after) throw new Error('Saldo tidak mencukupi atau rekening belum tersedia.');
    const acc=tx.snapshot.val();
    const who=meta.actor||actor();
    const ledger=await addLedger({
      studentKey,namaSantri:acc.namaSantri||'',kelas:acc.kelas||'',
      jenis:meta.jenis||'KOREKSI',kategori:meta.kategori||'SALDO',keterangan:meta.keterangan||'',
      deltaTabungan:number(deltaTabungan),deltaBelanja:number(deltaBelanja),
      saldoTabunganSebelum:before.tabungan,saldoTabunganSesudah:after.tabungan,
      saldoBelanjaSebelum:before.belanja,saldoBelanjaSesudah:after.belanja,
      referensi:meta.referensi||'',actor:who
    });
    await audit('MUTASI_SALDO',{studentKey,ledgerId:ledger.id,deltaTabungan,deltaBelanja,keterangan:meta.keterangan||''},who);
    return {account:{__key:studentKey,...acc},ledger};
  }

  async function createBill(data){
    const sk=data.studentKey||key(data.namaSantri);
    const typeKey=key(data.jenisTagihan||'SPP');
    const period=String(data.periode||localDate().slice(0,7)).replace(/[^0-9-]/g,'');
    const id=data.id||`tagihan_${period}_${typeKey}_${sk}`;
    const nominal=number(data.nominal);
    const current=(await db.ref(`${P.bills}/${id}`).once('value')).val()||{};
    const paid=number(current.dibayar);
    const payload={
      id,studentKey:sk,namaSantri:data.namaSantri||current.namaSantri||'',kelas:data.kelas||current.kelas||'',
      jenisTagihan:data.jenisTagihan||'SPP',periode:period,nominal,jatuhTempo:data.jatuhTempo||'',
      dibayar:Math.min(paid,nominal),sisa:Math.max(0,nominal-Math.min(paid,nominal)),
      status:nominal-Math.min(paid,nominal)<=0?'LUNAS':paid>0?'SEBAGIAN':'BELUM_LUNAS',
      catatan:data.catatan||current.catatan||'',dibuatPada:current.dibuatPada||isoNow(),diperbaruiPada:isoNow(),dibuatOleh:data.actor||actor()
    };
    await db.ref(`${P.bills}/${id}`).set(payload);
    await audit('TAGIHAN_DIBUAT',{id,studentKey:sk,nominal,periode,jenisTagihan:payload.jenisTagihan},data.actor||actor());
    return payload;
  }

  async function recordPayment(billId,amount,method='Tunai',note='',who=actor()){
    amount=number(amount); if(amount<=0) throw new Error('Nominal pembayaran harus lebih dari nol.');
    const ref=db.ref(`${P.bills}/${billId}`); let before=null,after=null;
    const tx=await ref.transaction(current=>{
      if(!current) return;
      before={...current};
      const remain=number(current.sisa);
      const applied=Math.min(amount,remain);
      const paid=number(current.dibayar)+applied;
      const sisa=Math.max(0,number(current.nominal)-paid);
      after={...current,dibayar:paid,sisa,status:sisa===0?'LUNAS':'SEBAGIAN',diperbaruiPada:isoNow()};
      return after;
    });
    if(!tx.committed||!after) throw new Error('Tagihan tidak ditemukan.');
    const id=uid('bayar');
    await db.ref(`${P.payments}/${id}`).set({id,billId,studentKey:after.studentKey,namaSantri:after.namaSantri,kelas:after.kelas,jenisTagihan:after.jenisTagihan,periode:after.periode,nominal:Math.min(amount,number(before.sisa)),metode:method,catatan:note,tanggal:localDate(),waktu:isoNow(),petugas:who});
    await audit('PEMBAYARAN_DICATAT',{id,billId,nominal:Math.min(amount,number(before.sisa))},who);
    return after;
  }

  async function upsertProduct(product,who=actor()){
    const id=product.id||key(product.nama)||uid('produk');
    const old=(await db.ref(`${P.products}/${id}`).once('value')).val()||{};
    const payload={id,nama:String(product.nama||old.nama||'').trim(),kategori:String(product.kategori||old.kategori||'Umum'),harga:number(product.harga),stok:product.stok===''||product.stok===null?number(old.stok):number(product.stok),stokTakTerbatas:Boolean(product.stokTakTerbatas),aktif:product.aktif!==false,dibuatPada:old.dibuatPada||isoNow(),diperbaruiPada:isoNow(),petugas:who};
    if(!payload.nama) throw new Error('Nama barang wajib diisi.');
    await db.ref(`${P.products}/${id}`).set(payload);
    await audit('PRODUK_DISIMPAN',{id,nama:payload.nama,harga:payload.harga,stok:payload.stok},who);
    return payload;
  }

  async function processSale({studentKey,items,pin,kasir=actor(),note=''}){
    if(!Array.isArray(items)||!items.length) throw new Error('Keranjang masih kosong.');
    const total=items.reduce((s,i)=>s+number(i.harga)*number(i.qty),0);
    if(total<=0) throw new Error('Total transaksi tidak valid.');
    const productSnaps={};
    for(const item of items){
      const ps=(await db.ref(`${P.products}/${item.id}`).once('value')).val();
      if(!ps||ps.aktif===false) throw new Error(`Barang ${item.nama} sudah tidak tersedia.`);
      if(!ps.stokTakTerbatas&&number(ps.stok)<number(item.qty)) throw new Error(`Stok ${item.nama} tidak mencukupi.`);
      productSnaps[item.id]=ps;
    }

    const verification=await verifyPin(studentKey,pin);
    if(!verification.ok) throw new Error(verification.message);

    const date=localDate(); const saleId=uid('trx');
    const accountRef=db.ref(`${P.accounts}/${studentKey}`);
    let before=null,after=null;
    const tx=await accountRef.transaction(current=>{
      if(!current||current.aktif===false) return;
      const spendingDate=current.tanggalPengeluaran===date?number(current.pengeluaranHariIni):0;
      const limit=number(current.limitHarian);
      if(number(current.saldoBelanja)<total) return;
      if(limit>0 && spendingDate+total>limit) return;
      before={saldoBelanja:number(current.saldoBelanja),pengeluaran:spendingDate};
      after={saldoBelanja:before.saldoBelanja-total,pengeluaran:spendingDate+total};
      return {...current,saldoBelanja:after.saldoBelanja,pengeluaranHariIni:after.pengeluaran,tanggalPengeluaran:date,pinGagal:0,pinTerkunciSampai:0,diperbaruiPada:isoNow()};
    });
    if(!tx.committed||!after){
      const latest=(await accountRef.once('value')).val()||{};
      const spent=latest.tanggalPengeluaran===date?number(latest.pengeluaranHariIni):0;
      if(number(latest.saldoBelanja)<total) throw new Error('Saldo belanja santri tidak mencukupi.');
      if(number(latest.limitHarian)>0&&spent+total>number(latest.limitHarian)) throw new Error('Transaksi melewati batas belanja harian.');
      throw new Error('Transaksi gagal diproses.');
    }
    const acc=tx.snapshot.val();
    const payload={id:saleId,studentKey,namaSantri:acc.namaSantri||'',kelas:acc.kelas||'',items:items.map(i=>({id:i.id,nama:i.nama,harga:number(i.harga),qty:number(i.qty),subtotal:number(i.harga)*number(i.qty)})),total,saldoSebelum:before.saldoBelanja,saldoSesudah:after.saldoBelanja,tanggal:date,waktu:isoNow(),kasir,note,status:'BERHASIL'};
    const updates={}; updates[`${P.sales}/${saleId}`]=payload;
    for(const item of items){const ps=productSnaps[item.id]; if(!ps.stokTakTerbatas) updates[`${P.products}/${item.id}/stok`]=Math.max(0,number(ps.stok)-number(item.qty)); updates[`${P.products}/${item.id}/diperbaruiPada`]=isoNow();}
    const ledgerId=uid('mutasi');
    updates[`${P.ledger}/${ledgerId}`]={id:ledgerId,studentKey,namaSantri:acc.namaSantri||'',kelas:acc.kelas||'',jenis:'BELANJA_KANTIN',kategori:'BELANJA',keterangan:`Belanja kantin/koperasi • ${items.map(i=>`${i.nama} x${i.qty}`).join(', ')}`,deltaTabungan:0,deltaBelanja:-total,saldoTabunganSebelum:number(acc.saldoTabungan),saldoTabunganSesudah:number(acc.saldoTabungan),saldoBelanjaSebelum:before.saldoBelanja,saldoBelanjaSesudah:after.saldoBelanja,referensi:saleId,actor:kasir,tanggal:date,waktu:isoNow()};
    const auditId=uid('audit'); updates[`${P.audit}/${auditId}`]={id:auditId,action:'TRANSAKSI_KANTIN',data:{saleId,studentKey,total},actor:kasir,tanggal:date,waktu:isoNow()};
    await db.ref().update(updates);
    return payload;
  }

  async function cancelSale(saleId,reason,who=actor()){
    const saleRef=db.ref(`${P.sales}/${saleId}`); const snap=await saleRef.once('value'); const sale=snap.val();
    if(!sale) throw new Error('Transaksi tidak ditemukan.');
    if(sale.status==='DIBATALKAN') throw new Error('Transaksi sudah dibatalkan.');
    const date=localDate(); const accountRef=db.ref(`${P.accounts}/${sale.studentKey}`);
    const tx=await accountRef.transaction(current=>{
      if(!current)return;
      const sameDay=sale.tanggal===date&&current.tanggalPengeluaran===date;
      return {...current,saldoBelanja:number(current.saldoBelanja)+number(sale.total),pengeluaranHariIni:sameDay?Math.max(0,number(current.pengeluaranHariIni)-number(sale.total)):number(current.pengeluaranHariIni),diperbaruiPada:isoNow()};
    });
    if(!tx.committed) throw new Error('Rekening santri tidak ditemukan.');
    const acc=tx.snapshot.val(); const updates={};
    updates[`${P.sales}/${saleId}/status`]='DIBATALKAN'; updates[`${P.sales}/${saleId}/alasanPembatalan`]=reason||'Pembatalan oleh petugas'; updates[`${P.sales}/${saleId}/dibatalkanPada`]=isoNow(); updates[`${P.sales}/${saleId}/dibatalkanOleh`]=who;
    for(const item of sale.items||[]){ const ps=(await db.ref(`${P.products}/${item.id}`).once('value')).val(); if(ps&&!ps.stokTakTerbatas)updates[`${P.products}/${item.id}/stok`]=number(ps.stok)+number(item.qty); }
    const ledgerId=uid('mutasi'); updates[`${P.ledger}/${ledgerId}`]={id:ledgerId,studentKey:sale.studentKey,namaSantri:sale.namaSantri||'',kelas:sale.kelas||'',jenis:'PEMBATALAN_BELANJA',kategori:'BELANJA',keterangan:`Pengembalian transaksi ${saleId}: ${reason||'-'}`,deltaTabungan:0,deltaBelanja:number(sale.total),saldoTabunganSebelum:number(acc.saldoTabungan),saldoTabunganSesudah:number(acc.saldoTabungan),saldoBelanjaSebelum:number(acc.saldoBelanja)-number(sale.total),saldoBelanjaSesudah:number(acc.saldoBelanja),referensi:saleId,actor:who,tanggal:date,waktu:isoNow()};
    const auditId=uid('audit'); updates[`${P.audit}/${auditId}`]={id:auditId,action:'TRANSAKSI_DIBATALKAN',data:{saleId,reason,total:sale.total},actor:who,tanggal:date,waktu:isoNow()};
    await db.ref().update(updates); return true;
  }

  async function snapshot(path){ const s=await db.ref(path).once('value'); return s.val()||{}; }
  async function allData(){
    const [accounts,bills,payments,ledger,products,sales,audit]=await Promise.all([P.accounts,P.bills,P.payments,P.ledger,P.products,P.sales,P.audit].map(snapshot));
    return {accounts:vals(accounts),bills:vals(bills),payments:vals(payments),ledger:vals(ledger),products:vals(products),sales:vals(sales),audit:vals(audit)};
  }

  global.CahayaFinance={CFG,P,db,esc,norm,key,vals,money,number,localDate,isoNow,dateLabel,uid,actor,waliProfile,waliStudentName,accountDefaults,hashPin,validPin,loadStudents,ensureAccount,initializeAccounts,getAccount,setPin,verifyPin,audit,addLedger,mutateBalances,createBill,recordPayment,upsertProduct,processSale,cancelSale,snapshot,allData};
})(window);
