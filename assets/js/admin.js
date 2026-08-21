(function(){
  const cms=window.AlMadaniCMS;
  if(!cms.session()){location.href='login.html';return}
  let data=cms.getData();
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const session=cms.session();
  $('#userName').textContent=session.name||'Admin Al-Madani';

  function toast(msg){const t=$('#adminToast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2200)}
  function get(obj,path){return path.split('.').reduce((o,k)=>o&&o[k],obj)}
  function set(obj,path,val){const p=path.split('.');let o=obj;p.slice(0,-1).forEach(k=>{if(!o[k]||typeof o[k]!=='object')o[k]={};o=o[k]});o[p[p.length-1]]=val}
  function bindFields(){
    $$('[data-field]').forEach(el=>{const p=el.dataset.field;const v=get(data,p);el.value=v==null?'':v;el.oninput=()=>set(data,p,el.value)});
  }
  function switchPanel(name){
    $$('.panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`));
    $$('.side-nav button').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
    $('#sidebar').classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});
  }
  $$('.side-nav button').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.panel)));
  $$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.jump)));
  $('#mobileToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('show'));
  $('#logoutBtn').addEventListener('click',()=>{cms.logout();location.href='login.html'});
  $$('[data-save]').forEach(b=>b.addEventListener('click',()=>{cms.saveData(data);metrics();toast('Perubahan tersimpan.')}));

  function metrics(){
    $('#metricPrograms').textContent=(data.programs||[]).length;
    $('#metricNews').textContent=(data.news||[]).length;
    $('#metricVideos').textContent=(data.videos||[]).length;
    $('#metricFacilities').textContent=(data.facilities||[]).length;
  }
  function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function renderPrograms(){
    const h=$('#programEditors');h.innerHTML=(data.programs||[]).map((x,i)=>`<div class="item-editor" data-program-index="${i}"><div class="item-head"><strong>Program ${String(i+1).padStart(2,'0')}</strong><button class="btn btn-danger" data-remove-program="${i}">Hapus</button></div><div class="item-grid"><div class="field"><label>Kode</label><input data-pf="code" value="${esc(x.code)}"></div><div class="field"><label>Nama Program</label><input data-pf="title" value="${esc(x.title)}"></div><div class="field wide"><label>Deskripsi</label><textarea data-pf="desc">${esc(x.desc)}</textarea></div></div></div>`).join('');
    $$('[data-program-index]',h).forEach(card=>{const i=+card.dataset.programIndex;$$('[data-pf]',card).forEach(inp=>inp.addEventListener('input',()=>data.programs[i][inp.dataset.pf]=inp.value))});
    $$('[data-remove-program]',h).forEach(b=>b.addEventListener('click',()=>{data.programs.splice(+b.dataset.removeProgram,1);renderPrograms();metrics()}));
  }
  function renderNews(){
    const h=$('#newsEditors');h.innerHTML=(data.news||[]).map((x,i)=>`<div class="item-editor" data-news-index="${i}"><div class="item-head"><strong>Berita ${String(i+1).padStart(2,'0')}</strong><button class="btn btn-danger" data-remove-news="${i}">Hapus</button></div><div class="item-grid"><div class="field"><label>Tanggal</label><input data-nf="date" value="${esc(x.date)}"></div><div class="field"><label>Kategori</label><input data-nf="category" value="${esc(x.category)}"></div><div class="field wide"><label>Judul</label><input data-nf="title" value="${esc(x.title)}"></div><div class="field wide"><label>Ringkasan</label><textarea data-nf="excerpt">${esc(x.excerpt)}</textarea></div><div class="field"><label>URL Gambar</label><input data-nf="image" value="${esc(x.image)}"></div><div class="field"><label>URL Dokumentasi</label><input data-nf="url" value="${esc(x.url)}"></div><div class="wide"><img class="thumb-preview" src="${esc(x.image)}" onerror="this.src='../assets/img/spmb-students.webp'" alt="Preview"></div></div></div>`).join('');
    $$('[data-news-index]',h).forEach(card=>{const i=+card.dataset.newsIndex;$$('[data-nf]',card).forEach(inp=>inp.addEventListener('input',()=>{data.news[i][inp.dataset.nf]=inp.value;if(inp.dataset.nf==='image')$('.thumb-preview',card).src=inp.value}))});
    $$('[data-remove-news]',h).forEach(b=>b.addEventListener('click',()=>{data.news.splice(+b.dataset.removeNews,1);renderNews();metrics()}));
  }
  function renderVideos(){
    const h=$('#videoEditors');h.innerHTML=(data.videos||[]).map((x,i)=>`<div class="item-editor" data-video-index="${i}"><div class="item-head"><strong>Video ${String(i+1).padStart(2,'0')}</strong><button class="btn btn-danger" data-remove-video="${i}">Hapus</button></div><div class="item-grid"><div class="field"><label>YouTube Video ID</label><input data-vf="id" value="${esc(x.id)}"></div><div class="field"><label>Meta</label><input data-vf="meta" value="${esc(x.meta)}"></div><div class="field wide"><label>Judul</label><input data-vf="title" value="${esc(x.title)}"></div><div class="wide"><img class="thumb-preview" src="https://i.ytimg.com/vi/${esc(x.id)}/maxresdefault.jpg" onerror="this.src='../assets/img/spmb-students.webp'" alt="Preview"></div></div></div>`).join('');
    $$('[data-video-index]',h).forEach(card=>{const i=+card.dataset.videoIndex;$$('[data-vf]',card).forEach(inp=>inp.addEventListener('input',()=>{data.videos[i][inp.dataset.vf]=inp.value;if(inp.dataset.vf==='id')$('.thumb-preview',card).src=`https://i.ytimg.com/vi/${inp.value}/maxresdefault.jpg`}))});
    $$('[data-remove-video]',h).forEach(b=>b.addEventListener('click',()=>{data.videos.splice(+b.dataset.removeVideo,1);renderVideos();metrics()}));
  }
  $('#addProgram').addEventListener('click',()=>{data.programs.push({code:'BARU',title:'Program Baru',desc:'Deskripsi program.'});renderPrograms();metrics()});
  $('#addNews').addEventListener('click',()=>{data.news.unshift({date:'',category:'Kegiatan',title:'Judul Berita Baru',excerpt:'Ringkasan berita.',image:'../assets/img/spmb-students.webp',url:'https://www.instagram.com/ponpesalmadani/'});renderNews();metrics()});
  $('#addVideo').addEventListener('click',()=>{data.videos.push({id:'',title:'Video Baru',meta:'Madani Channel Lombok'});renderVideos();metrics()});

  $('#exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='almadani-cms-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast('Backup JSON dibuat.')});
  $('#importInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);cms.saveData(data);bindFields();renderPrograms();renderNews();renderVideos();metrics();toast('Backup berhasil diimpor.')}catch(err){toast('File JSON tidak valid.')}};r.readAsText(f)});
  $('#resetBtn').addEventListener('click',()=>{if(confirm('Reset seluruh konten CMS ke data bawaan V2?')){data=cms.resetData();cms.saveData(data);bindFields();renderPrograms();renderNews();renderVideos();metrics();toast('CMS direset ke data bawaan.')}});
  $('#saveCredentials').addEventListener('click',()=>{const name=$('#adminName').value.trim()||'Admin Al-Madani',email=$('#adminEmail').value.trim(),pwd=$('#adminPassword').value;if(!email){toast('Email admin wajib diisi.');return}if(!pwd){toast('Isi password baru untuk menyimpan akun.');return}cms.setUserCredentials(email,pwd,name);cms.logout();alert('Akun diperbarui. Silakan login kembali.');location.href='login.html'});

  bindFields();renderPrograms();renderNews();renderVideos();metrics();
})();
