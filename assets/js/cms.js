(function(){
  const KEY='almadaniCmsV2';
  const AUTH='almadaniAdminSessionV2';
  const USERS='almadaniAdminUsersV2';
  const defaults={
    site:{
      name:'Pondok Pesantren Al-Madani Lombok',
      shortName:'AL-MADANI LOMBOK',
      descriptor:'Pusat Pembibitan Penghafal & Pemangku Al-Qur’an',
      tagline:'Sekolahnya Para Penghafal Qur’an dan Pemimpin Masa Depan',
      heroTitle:'Penghafal Qur’an. Pemimpin masa depan.',
      heroText:'Ekosistem pendidikan Qur’ani di Lombok Timur yang memadukan tahfiz, pendidikan formal, kepemimpinan, bahasa, dan keterampilan untuk menyiapkan generasi yang berilmu, berakhlak, dan berdaya.',
      aboutTitle:'Dua dekade bertumbuh bersama Al-Qur’an.',
      aboutText:'Al-Madani berdiri pada 26 Juni 2006 di Mamben Lauk, Wanasaba, Lombok Timur. Berawal dari kepedulian pada pendidikan masyarakat kurang mampu, Al-Madani kemudian berkembang menjadi pesantren dan ekosistem pendidikan dengan Al-Qur’an sebagai identitas utama.',
      founded:'26 Juni 2006',
      leader:'TGH. Fauzan Zakaria Amin, Lc., M.Si.',
      leaderRole:'Pendiri & Pimpinan Pondok Pesantren Al-Madani Lombok',
      phone:'087763303339',
      email:'',
      address:'Jl. Cendikia Lengkok, Desa Mamben Lauk, Kecamatan Wanasaba, Kabupaten Lombok Timur, Nusa Tenggara Barat',
      instagram:'https://www.instagram.com/ponpesalmadani/',
      facebook:'https://web.facebook.com/p/Ponpes-Al-Madani-Lombok-61558853485401/',
      facebookMedia:'https://www.facebook.com/MadaniChannelLombok/',
      youtube:'https://youtube.com/@madanichannellombok',
      website:'https://almadanilombok.com',
      spmbUrl:'https://bit.ly/psbalmadani2026',
      logo:'assets/img/logo-almadani.png',
      heroImage:'assets/img/spmb-students.webp'
    },
    stats:[
      {value:'20 Tahun',label:'Mengabdi sejak 26 Juni 2006'},
      {value:'6 Jalur',label:'Penerimaan pendidikan 2026–2027'},
      {value:'Ke-15',label:'Wisuda Huffaz pada Milad ke-20'},
      {value:'30 Juz',label:'Arah utama program tahfiz Al-Qur’an'}
    ],
    programs:[
      {code:'TK',title:'TK Islam Terpadu Al-Madani',desc:'Pendidikan usia dini dengan lingkungan Islami yang menumbuhkan kecintaan pada belajar, adab, dan Al-Qur’an.'},
      {code:'SD',title:'SD Islam Terpadu Al-Madani',desc:'Fondasi akademik, karakter, ibadah, dan pembiasaan Qur’ani untuk masa belajar yang kuat dan menyenangkan.'},
      {code:'SMP',title:'SMP Islam Al-Madani',desc:'Masa penguatan karakter santri, akademik, kemandirian, kepemimpinan, serta kedekatan dengan Al-Qur’an.'},
      {code:'SMK',title:'SMK Islam Plus Al-Madani',desc:'Pendidikan vokasi berbasis karakter pesantren dengan pilihan Tata Busana, DKV, ULP, dan Teknik Komputer & Jaringan.'},
      {code:'MAK',title:'MAK Al-Madani',desc:'Jalur pendidikan menengah keagamaan yang memperkuat ilmu Islam, bahasa, adab, dan kesiapan studi lanjutan.'},
      {code:'GEMA',title:'Program Takhassus GEMA',desc:'Program khusus Generasi Emas Al-Qur’an untuk pembinaan hafalan secara lebih intensif dan terarah.'}
    ],
    facilities:[
      'Laboratorium Komputer','Laboratorium Multimedia','Laboratorium Tata Busana','Laboratorium IPA/Fisika','Laboratorium Bahasa','Studio MMC (Madani Media Center)','Kopsan / Koperasi Santri','Madani Factory / Santri Preneur','Masjid','Perpustakaan','Lapangan Olahraga','Unit Kesehatan Pesantren (UKP)'
    ],
    news:[
      {date:'15 Juni 2026',category:'Milad & Huffaz',title:'Milad ke-20 & Wisuda Huffaz ke-15 Al-Madani',excerpt:'Dua dekade pengabdian Al-Madani diperingati bersama prosesi Wisuda Huffaz ke-15 di Mamben Lauk, Wanasaba, Lombok Timur.',image:'assets/img/spmb-2026-thumb.webp',url:'https://www.youtube.com/watch?v=T4ao9kLFOBE'},
      {date:'14 April 2026',category:'Kepemimpinan',title:'Pelantikan Pengurus Organisasi Santri Ma’had Al-Madani 2026–2027',excerpt:'Pengurus baru dilantik sebagai bagian dari estafet kepemimpinan santri dan pembelajaran tanggung jawab organisasi.',image:'assets/img/spmb-students.webp',url:'https://www.instagram.com/ponpesalmadani/'},
      {date:'12 Februari 2026',category:'Al-Qur’an',title:'Tasyakuran Khotmil Qur’an Santri Al-Madani',excerpt:'Keluarga besar Al-Madani mensyukuri pencapaian khatam Al-Qur’an para santri sebagai bagian dari perjalanan Qur’ani mereka.',image:'assets/img/spmb-students.webp',url:'https://www.instagram.com/ponpesalmadani/'},
      {date:'21 Januari 2026',category:'Alumni',title:'Alumni Al-Madani Melanjutkan Studi ke Al-Azhar Kairo',excerpt:'Al-Madani melepas alumni yang melanjutkan pendidikan ke Universitas Al-Azhar Kairo dengan pesan menjaga adab dan kesungguhan menuntut ilmu.',image:'https://i.ytimg.com/vi/HFYt2DNjHa4/maxresdefault.jpg',url:'https://www.instagram.com/ponpesalmadani/'},
      {date:'17 Februari 2026',category:'Wali Santri',title:'Pengajian Wali Santri Menyambut Ramadhan',excerpt:'Pengajian wali santri menjadi ruang penguatan sinergi keluarga dan pesantren menjelang program Ramadhan.',image:'assets/img/campus-poster-crop.webp',url:'https://www.facebook.com/MadaniChannelLombok/'},
      {date:'2026',category:'SPMB',title:'SPMB Al-Madani Tahun Ajaran 2026–2027 Dibuka',excerpt:'Pendaftaran tersedia untuk TK IT, SD IT, SMP Islam, SMK Islam Plus, MAK, serta program khusus Generasi Emas Al-Qur’an.',image:'assets/img/spmb-2026-thumb.webp',url:'https://bit.ly/psbalmadani2026'}
    ],
    videos:[
      {id:'HcsR-Q_Gc-Q',title:'Kedatangan Santri Baru Al-Madani 2024/2025',meta:'Madani Channel Lombok · 2024'},
      {id:'755nI4xnBHA',title:'Tips Menghafal Al-Qur\'an dengan Metode Otak Kanan',meta:'Madani Channel Lombok · 2024'},
      {id:'B29viR6gFfE',title:'Adab Santri Kepada Guru',meta:'Madani Channel Lombok · 2023'}
    ],
    tahfiz:{
      title:'Generasi Emas Al-Qur’an',
      intro:'GEMA menjadi salah satu identitas khas Al-Madani dalam menumbuhkan generasi penghafal dan pemangku Al-Qur’an. Publikasi SPMB 2026–2027 mencantumkan GEMA Takhassus, Generasi Emas Al-Qur’an, dan Generasi Emas Bahasa sebagai program khusus.',
      tracks:[
        {title:'GEMA Takhassus',desc:'Jalur khusus dengan fokus pembinaan Al-Qur’an secara lebih intensif.'},
        {title:'Generasi Emas Al-Qur’an',desc:'Pembinaan hafalan, murajaah, dan budaya hidup bersama Al-Qur’an.'},
        {title:'Generasi Emas Bahasa',desc:'Penguatan kompetensi bahasa sebagai bekal komunikasi, wawasan, dan studi lanjutan.'}
      ]
    },
    spmb:{
      year:'2026–2027',open:'1 Februari sampai kuota penuh',headline:'SPMB Pondok Pesantren Al-Madani Lombok',note:'Tanpa tes masuk. Kuota sangat terbatas.',
      contacts:['Ust. Muammar, S.E. · 087872860336','Ustzh. Ismi Dahlia H., S.Pd. · 087865763312','Informasi SPMB · 087763303339'],
      requirements:['Mengisi formulir pendaftaran','Fotokopi SKL · 2 lembar','Pas foto hitam putih 3×4 · 4 lembar','Fotokopi KTP wali/orang tua · 2 lembar','Fotokopi KK dan Akta Kelahiran · 2 lembar']
    }
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function getData(){
    try{const raw=localStorage.getItem(KEY);if(!raw)return clone(defaults);return deepMerge(clone(defaults),JSON.parse(raw));}catch(e){return clone(defaults)}
  }
  function deepMerge(base,extra){
    if(!extra||typeof extra!=='object')return base;
    Object.keys(extra).forEach(k=>{
      if(Array.isArray(extra[k])) base[k]=extra[k];
      else if(extra[k]&&typeof extra[k]==='object'&&!Array.isArray(extra[k])) base[k]=deepMerge(base[k]||{},extra[k]);
      else base[k]=extra[k];
    });return base;
  }
  function saveData(data){localStorage.setItem(KEY,JSON.stringify(data));}
  function resetData(){localStorage.removeItem(KEY);return clone(defaults)}
  function ensureUser(){
    if(!localStorage.getItem(USERS))localStorage.setItem(USERS,JSON.stringify([{email:'admin@almadanilombok.com',password:'Madani@2026',name:'Admin Al-Madani'}]));
  }
  function login(email,password){ensureUser();const users=JSON.parse(localStorage.getItem(USERS)||'[]');const u=users.find(x=>x.email===email&&x.password===password);if(u){sessionStorage.setItem(AUTH,JSON.stringify({email:u.email,name:u.name,at:Date.now()}));return true}return false}
  function logout(){sessionStorage.removeItem(AUTH)}
  function session(){try{return JSON.parse(sessionStorage.getItem(AUTH)||'null')}catch(e){return null}}
  function setUserCredentials(email,password,name){localStorage.setItem(USERS,JSON.stringify([{email,password,name:name||'Admin Al-Madani'}]))}
  window.AlMadaniCMS={KEY,defaults,getData,saveData,resetData,login,logout,session,setUserCredentials};
})();
