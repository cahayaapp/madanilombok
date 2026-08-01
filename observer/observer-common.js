
(() => {
  "use strict";
  const config = window.OBSERVER_PAGE_CONFIG;
  if (!config) throw new Error("OBSERVER_PAGE_CONFIG belum tersedia.");

  const firebaseConfig = window.CAHAYA_CONFIG.firebase;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const DB_PATH = "observasi_lapangan";
  const offlineKey = `cahayaObserverOffline_${config.type}`;
  let photoData = "";
  let currentUser = {};
  let records = [];

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const safeJSON = (value, fallback={}) => { try { return JSON.parse(value) || fallback; } catch { return fallback; } };
  const fmtDate = value => { if (!value) return "-"; const d=new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime())?value:d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}); };
  const statusClass = status => status==="Sangat Baik"?"obs-sangat":status==="Baik"?"obs-baik":status==="Perlu Perbaikan"?"obs-perlu":"obs-kritis";

  function loadUser(){
    const candidates=[
      safeJSON(localStorage.getItem("cahayaCurrentUser")),
      safeJSON(localStorage.getItem("cahayaCurrentProfile")),
      safeJSON(sessionStorage.getItem("cahayaCurrentUser")),
      safeJSON(sessionStorage.getItem("cahayaCurrentProfile"))
    ];
    currentUser=candidates.find(item=>item&&Object.keys(item).length)||{};
  }

  function fieldHTML(field){
    const required=field.required?'required':'';
    const mark=field.required?'<span class="obs-required">*</span>':'';
    const full=field.full?' full':'';
    const options=(field.options||[]).map(option=>{
      const value=typeof option==='string'?option:option.value;
      const label=typeof option==='string'?option:option.label;
      return `<option value="${esc(value)}">${esc(label)}</option>`;
    }).join('');
    let control='';
    if(field.type==='select') control=`<select class="obs-select" name="${esc(field.name)}" ${required}><option value="">${esc(field.placeholder||'Pilih data')}</option>${options}</select>`;
    else if(field.type==='textarea') control=`<textarea class="obs-textarea" name="${esc(field.name)}" placeholder="${esc(field.placeholder||'')}"></textarea>`;
    else control=`<input class="obs-input ${field.name==='tanggal'?'obs-date':''} ${field.name==='waktu'?'obs-time':''}" type="${esc(field.type||'text')}" name="${esc(field.name)}" placeholder="${esc(field.placeholder||'')}" ${field.min!=null?`min="${field.min}"`:''} ${required}>`;
    return `<div class="obs-field${full}"><label class="obs-label">${esc(field.label)} ${mark}</label>${control}</div>`;
  }

  function indicatorHTML(item,index){
    return `<div class="obs-indicator-item" data-index="${index}"><div class="obs-indicator-copy"><strong>${index+1}. ${esc(item[0])}</strong><span>${esc(item[1])}</span></div><div class="obs-ratings"><button type="button" class="obs-rating" data-value="4">Sangat Baik</button><button type="button" class="obs-rating" data-value="3">Baik</button><button type="button" class="obs-rating" data-value="2">Perlu Perbaikan</button><button type="button" class="obs-rating" data-value="1">Kritis</button></div></div>`;
  }

  function render(){
    document.title=`${config.title} | CAHAYA APP`;
    document.getElementById('observerApp').innerHTML=`
      <main class="observer-page">
        <section class="obs-hero">
          <div class="obs-hero-copy"><span class="obs-kicker">${config.icon} Modul Observer CAHAYA</span><h1>${esc(config.title)}</h1><p>${esc(config.subtitle)}</p></div>
          <div class="obs-hero-side"><strong id="obsToday">—</strong><span id="obsClock">—</span></div>
        </section>
        <div class="obs-reminder"><span>ℹ️</span><div><b>Peran observer:</b> mengamati dan mencatat fakta secara objektif. Observer tidak memberikan hukuman, tidak melakukan penindakan, dan tidak menggantikan tugas supervisor atau pimpinan.</div></div>
        <section class="obs-grid">
          <div>
            <article class="obs-card">
              <div class="obs-card-head"><div class="obs-title"><div class="obs-title-icon">${config.icon}</div><div><h2>Form ${esc(config.title)}</h2><p>${esc(config.formDescription)}</p></div></div></div>
              <div class="obs-card-body">
                <form id="observerForm">
                  <div class="obs-form-grid">${config.fields.map(fieldHTML).join('')}</div>
                  <div class="obs-indicator-shell"><div class="obs-indicator-head"><strong>Indikator Pengamatan</strong><span>Seluruh indikator wajib dinilai.</span></div><div>${config.indicators.map(indicatorHTML).join('')}</div></div>
                  <div class="obs-form-grid" style="margin-top:14px">
                    <div class="obs-field full"><label class="obs-label">Status Keseluruhan <span class="obs-required">*</span></label><div class="obs-status-grid">
                      <label class="obs-status-option"><input type="radio" name="status" value="Sangat Baik" required><span class="obs-status-card"><span>🌟</span>Sangat Baik</span></label>
                      <label class="obs-status-option"><input type="radio" name="status" value="Baik"><span class="obs-status-card"><span>✅</span>Baik</span></label>
                      <label class="obs-status-option"><input type="radio" name="status" value="Perlu Perbaikan"><span class="obs-status-card"><span>⚠️</span>Perlu Perbaikan</span></label>
                      <label class="obs-status-option"><input type="radio" name="status" value="Kritis"><span class="obs-status-card"><span>🚨</span>Kritis</span></label>
                    </div></div>
                    <div class="obs-field full"><label class="obs-label">Temuan Positif</label><textarea class="obs-textarea" name="temuanPositif" placeholder="Tuliskan hal baik yang perlu dipertahankan atau dicontoh."></textarea></div>
                    <div class="obs-field full"><label class="obs-label">Temuan yang Perlu Diperbaiki</label><textarea class="obs-textarea" name="temuanPerbaikan" placeholder="Tuliskan fakta lapangan secara objektif, spesifik, dan tidak menghakimi."></textarea></div>
                    <div class="obs-field"><label class="obs-label">Kategori Akar Masalah</label><select class="obs-select" name="kategoriMasalah"><option value="">Pilih kategori</option>${config.problemCategories.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
                    <div class="obs-field"><label class="obs-label">Tingkat Urgensi</label><select class="obs-select" name="urgensi"><option>Normal</option><option>Perlu Perhatian</option><option>Mendesak</option><option>Kritis</option></select></div>
                    <div class="obs-field full"><label class="obs-label">Rekomendasi Observer</label><textarea class="obs-textarea" name="rekomendasi" placeholder="Usulan awal sebagai bahan pertimbangan supervisor dan pimpinan."></textarea></div>
                    <div class="obs-field full"><label class="obs-label">Foto Bukti (Opsional)</label><label class="obs-photo-zone"><input id="obsPhotoInput" type="file" accept="image/*" capture="environment"><div class="obs-photo-placeholder" id="obsPhotoPlaceholder"><span>📷</span>Ketuk untuk mengambil atau memilih foto. Gambar dikompres otomatis.</div><img class="obs-photo-preview" id="obsPhotoPreview" alt="Pratinjau foto"></label></div>
                  </div>
                  <div class="obs-form-actions"><button type="button" class="obs-btn secondary" id="resetButton">↺ Reset Form</button><button type="submit" class="obs-btn" id="saveButton">💾 Simpan Observasi</button></div>
                </form>
              </div>
            </article>
          </div>
          <aside class="obs-side">
            <article class="obs-card"><div class="obs-card-head"><div class="obs-title"><div class="obs-title-icon">📊</div><div><h2>Ringkasan</h2><p>Data khusus ${esc(config.shortTitle.toLowerCase())}.</p></div></div></div><div class="obs-card-body"><div class="obs-stats"><div class="obs-stat"><i>📋</i><strong id="statTotal">0</strong><span>Total Observasi</span></div><div class="obs-stat"><i>📅</i><strong id="statToday">0</strong><span>Hari Ini</span></div><div class="obs-stat"><i>⚠️</i><strong id="statNeed">0</strong><span>Perlu Perbaikan</span></div><div class="obs-stat"><i>🚨</i><strong id="statCritical">0</strong><span>Kritis</span></div></div></div></article>
            <article class="obs-card"><div class="obs-card-head"><div class="obs-title"><div class="obs-title-icon">🕘</div><div><h2>Riwayat Terbaru</h2><p>Laporan terakhir pada kategori ini.</p></div></div></div><div class="obs-card-body"><div class="obs-recent" id="recentList"><div class="obs-empty">Memuat data...</div></div></div></article>
          </aside>
        </section>
      </main>
      <div class="obs-toast" id="obsToast"><div class="obs-toast-icon" id="obsToastIcon">✅</div><div><strong id="obsToastTitle">Berhasil</strong><span id="obsToastText">Data tersimpan.</span></div></div>`;
    bindEvents(); setDefaults(); tick(); listen();
  }

  function bindEvents(){
    document.querySelectorAll('.obs-rating').forEach(button=>button.addEventListener('click',()=>{const group=button.closest('.obs-ratings');group.querySelectorAll('.obs-rating').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');}));
    document.getElementById('observerForm').addEventListener('submit',save);
    document.getElementById('resetButton').addEventListener('click',resetForm);
    document.getElementById('obsPhotoInput').addEventListener('change',previewPhoto);
  }

  function setDefaults(){
    const now=new Date();
    const date=now.toLocaleDateString('en-CA');
    const time=now.toTimeString().slice(0,5);
    const dateInput=document.querySelector('.obs-date'); const timeInput=document.querySelector('.obs-time');
    if(dateInput&&!dateInput.value) dateInput.value=date;
    if(timeInput&&!timeInput.value) timeInput.value=time;
  }

  function tick(){const now=new Date();document.getElementById('obsToday').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});document.getElementById('obsClock').textContent=now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';}

  function collectIndicators(){
    return [...document.querySelectorAll('.obs-indicator-item')].map((item,index)=>{const selected=item.querySelector('.obs-rating.selected');return selected?{nama:config.indicators[index][0],nilai:Number(selected.dataset.value),label:selected.textContent.trim()}:null;});
  }

  async function save(event){
    event.preventDefault();
    const form=event.currentTarget; const indicators=collectIndicators();
    if(indicators.some(item=>!item)){toast('⚠️','Indikator belum lengkap','Nilai seluruh indikator terlebih dahulu.');document.querySelector('.obs-indicator-shell').scrollIntoView({behavior:'smooth',block:'center'});return;}
    const data=Object.fromEntries(new FormData(form).entries());
    if(['Perlu Perbaikan','Kritis'].includes(data.status)&&!String(data.temuanPerbaikan||'').trim()){toast('⚠️','Temuan wajib ditulis','Jelaskan kondisi yang perlu diperbaiki secara objektif.');form.elements.temuanPerbaikan.focus();return;}
    const button=document.getElementById('saveButton');button.disabled=true;button.textContent='⏳ Menyimpan...';
    const now=Date.now(); const score=indicators.reduce((sum,item)=>sum+item.nilai,0);
    const observerName=currentUser.label||currentUser.nama||currentUser.name||currentUser.displayName||currentUser.username||'Observer CAHAYA';
    const observerId=currentUser.uid||currentUser.id||currentUser.username||observerName.toLowerCase().replace(/\s+/g,'-');
    const custom={}; config.fields.forEach(field=>custom[field.name]=data[field.name]??'');
    const payload={jenis:config.type,jenisLabel:config.title,tanggal:data.tanggal,waktu:data.waktu,timestamp:new Date(`${data.tanggal}T${data.waktu||'00:00'}`).getTime()||now,dibuatPada:now,observer:{id:observerId,nama:observerName,role:currentUser.role||'observer'},dataUtama:custom,lokasi:data.lokasi||data.area||data.kelas||data.unit||'',program:data.program||data.mataPelajaran||data.sesi||data.jenisLayanan||'',pihakTerkait:data.pihakTerkait||data.guru||data.pic||data.penanggungJawab||data.petugas||'',indikator:indicators,skor:score,skorMaksimal:indicators.length*4,persentase:Math.round(score/(indicators.length*4)*100),status:data.status,temuanPositif:String(data.temuanPositif||'').trim(),temuanPerbaikan:String(data.temuanPerbaikan||'').trim(),kategoriMasalah:data.kategoriMasalah||'',urgensi:data.urgensi||'Normal',rekomendasi:String(data.rekomendasi||'').trim(),foto:photoData||'',validasi:{status:'Menunggu Validasi',supervisor:'',catatan:''},tindakLanjut:{status:'Belum Ditindaklanjuti',catatan:'',tanggal:0}};
    try{
      const recordRef=db.ref(DB_PATH).push();
      const recordId=recordRef.key;
      const photoPath=photoData?`observasi_lapangan_foto/${recordId}`:'';
      const mainPayload={...payload,foto:'',adaFoto:Boolean(photoData),fotoPath};
      const updates={};
      updates[`${DB_PATH}/${recordId}`]=mainPayload;
      if(photoData)updates[photoPath]={data:photoData,createdAt:now,jenis:config.type};
      await db.ref().update(updates);
      toast('✅','Observasi tersimpan','Laporan telah masuk ke Pusat Observasi.');resetForm();
    }
    catch(error){console.error(error);const offline=safeJSON(localStorage.getItem(offlineKey),[]);offline.push({...payload,id:`offline-${now}`,offline:true});localStorage.setItem(offlineKey,JSON.stringify(offline));toast('📦','Tersimpan sementara','Koneksi bermasalah. Data disimpan di perangkat.');resetForm();loadOffline();}
    finally{button.disabled=false;button.textContent='💾 Simpan Observasi';}
  }

  function resetForm(){const form=document.getElementById('observerForm');form.reset();document.querySelectorAll('.obs-rating').forEach(item=>item.classList.remove('selected'));photoData='';const preview=document.getElementById('obsPhotoPreview');preview.src='';preview.style.display='none';document.getElementById('obsPhotoPlaceholder').style.display='block';setDefaults();}

  async function previewPhoto(event){const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('⚠️','File tidak sesuai','Pilih file gambar.');return;}try{photoData=await compressImage(file);const preview=document.getElementById('obsPhotoPreview');preview.src=photoData;preview.style.display='block';document.getElementById('obsPhotoPlaceholder').style.display='none';}catch(error){console.error(error);toast('❌','Foto gagal diproses','Coba pilih gambar lain.');}}
  function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const image=new Image();image.onerror=reject;image.onload=()=>{let width=image.width,height=image.height;const max=900;if(Math.max(width,height)>max){const ratio=max/Math.max(width,height);width=Math.round(width*ratio);height=Math.round(height*ratio);}const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0,width,height);resolve(canvas.toDataURL('image/jpeg',.62));};image.src=reader.result;};reader.readAsDataURL(file);});}

  function listen(){db.ref(DB_PATH).orderByChild('jenis').equalTo(config.type).limitToLast(120).on('value',snapshot=>{const value=snapshot.val()||{};records=Object.entries(value).map(([id,data])=>({id,...data}));loadOffline(false);records.sort((a,b)=>(b.dibuatPada||b.timestamp||0)-(a.dibuatPada||a.timestamp||0));renderStats();},error=>{console.error(error);records=[];loadOffline();toast('📴','Mode lokal','Data online belum dapat dimuat.');});}
  function loadOffline(render=true){const offline=safeJSON(localStorage.getItem(offlineKey),[]);const ids=new Set(records.map(item=>item.id));offline.forEach(item=>{if(!ids.has(item.id))records.push(item);});records.sort((a,b)=>(b.dibuatPada||b.timestamp||0)-(a.dibuatPada||a.timestamp||0));if(render)renderStats();}
  function renderStats(){const today=new Date().toLocaleDateString('en-CA');document.getElementById('statTotal').textContent=records.length;document.getElementById('statToday').textContent=records.filter(x=>x.tanggal===today).length;document.getElementById('statNeed').textContent=records.filter(x=>x.status==='Perlu Perbaikan').length;document.getElementById('statCritical').textContent=records.filter(x=>x.status==='Kritis').length;const root=document.getElementById('recentList');root.innerHTML=records.length?records.slice(0,6).map(item=>`<div class="obs-recent-item"><div class="obs-recent-icon">${config.icon}</div><div class="obs-recent-copy"><strong>${esc(item.lokasi||item.program||config.shortTitle)}</strong><span>${fmtDate(item.tanggal)} • ${esc(item.observer?.nama||'Observer')}</span></div><span class="obs-chip ${statusClass(item.status)}">${esc(item.status||'-')}</span></div>`).join(''):'<div class="obs-empty">Belum ada laporan pada kategori ini.</div>';}
  function toast(icon,title,text){document.getElementById('obsToastIcon').textContent=icon;document.getElementById('obsToastTitle').textContent=title;document.getElementById('obsToastText').textContent=text;const el=document.getElementById('obsToast');el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3500);}

  loadUser(); render(); setInterval(tick,30000);
})();
