/* ==========================================
   🏥 CAHAYA APP - PUSAT DATA STATIS & AWAL
   ========================================== */

// 1. DAFTAR 114 SURAH AL-QUR'AN (Digunakan di modul Tahfiz)
window.daftarSurat = [
    { nama: "Al-Fatihah", ayat: 7 }, { nama: "Al-Baqarah", ayat: 286 },
    { nama: "Ali 'Imran", ayat: 200 }, { nama: "An-Nisa'", ayat: 176 },
    { nama: "Al-Ma'idah", ayat: 120 }, { nama: "Al-An'am", ayat: 165 },
    { nama: "Al-A'raf", ayat: 206 }, { nama: "Al-Anfal", ayat: 75 },
    { nama: "At-Taubah", ayat: 129 }, { nama: "Yunus", ayat: 109 },
    { nama: "Hud", ayat: 123 }, { nama: "Yusuf", ayat: 111 },
    { nama: "Ar-Ra'd", ayat: 43 }, { nama: "Ibrahim", ayat: 52 },
    { nama: "Al-Hijr", ayat: 99 }, { nama: "An-Nahl", ayat: 128 },
    { nama: "Al-Isra'", ayat: 111 }, { nama: "Al-Kahf", ayat: 110 },
    { nama: "Maryam", ayat: 98 }, { nama: "Taha", ayat: 135 },
    { nama: "Al-Anbiya'", ayat: 112 }, { nama: "Al-Hajj", ayat: 78 },
    { nama: "Al-Mu'minun", ayat: 118 }, { nama: "An-Nur", ayat: 64 },
    { nama: "Al-Furqan", ayat: 77 }, { nama: "Asy-Syu'ara'", ayat: 227 },
    { nama: "An-Naml", ayat: 93 }, { nama: "Al-Qasas", ayat: 88 },
    { nama: "Al-'Ankabut", ayat: 69 }, { nama: "Ar-Rum", ayat: 60 },
    { nama: "Luqman", ayat: 34 }, { nama: "As-Sajdah", ayat: 30 },
    { nama: "Al-Ahzab", ayat: 73 }, { nama: "Saba'", ayat: 54 },
    { nama: "Fatir", ayat: 45 }, { nama: "Yasin", ayat: 83 },
    { nama: "As-Saffat", ayat: 182 }, { nama: "Sad", ayat: 88 },
    { nama: "Az-Zumar", ayat: 75 }, { nama: "Ghafir", ayat: 85 },
    { nama: "Fussilat", ayat: 54 }, { nama: "Asy-Syura", ayat: 53 },
    { nama: "Az-Zukhruf", ayat: 89 }, { nama: "Ad-Dukhan", ayat: 59 },
    { nama: "Al-Jasiyah", ayat: 37 }, { nama: "Al-Ahqaf", ayat: 35 },
    { nama: "Muhammad", ayat: 38 }, { nama: "Al-Fath", ayat: 29 },
    { nama: "Al-Hujurat", ayat: 18 }, { nama: "Qaf", ayat: 45 },
    { nama: "Ad-Zariyat", ayat: 60 }, { nama: "At-Tur", ayat: 49 },
    { nama: "An-Najm", ayat: 62 }, { nama: "Al-Qamar", ayat: 55 },
    { nama: "Ar-Rahman", ayat: 78 }, { nama: "Al-Waqi'ah", ayat: 96 },
    { nama: "Al-Hadid", ayat: 29 }, { nama: "Al-Mujadilah", ayat: 22 },
    { nama: "Al-Hasyr", ayat: 24 }, { nama: "Al-Mumtahanah", ayat: 13 },
    { nama: "As-Saff", ayat: 14 }, { nama: "Al-Jumu'ah", ayat: 11 },
    { nama: "Al-Munafiqun", ayat: 11 }, { nama: "At-Taghabun", ayat: 18 },
    { nama: "At-Talaq", ayat: 12 }, { nama: "At-Tahrim", ayat: 12 },
    { nama: "Al-Mulk", ayat: 30 }, { nama: "Al-Qalam", ayat: 52 },
    { nama: "Al-Haqqah", ayat: 52 }, { nama: "Al-Ma'arij", ayat: 44 },
    { nama: "Nuh", ayat: 28 }, { nama: "Al-Jinn", ayat: 28 },
    { nama: "Al-Muzzammil", ayat: 20 }, { nama: "Al-Muddassir", ayat: 56 },
    { nama: "Al-Qiyamah", ayat: 40 }, { nama: "Al-Insan", ayat: 31 },
    { nama: "Al-Mursalat", ayat: 50 }, { nama: "An-Naba'", ayat: 40 },
    { nama: "An-Nazi'at", ayat: 46 }, { nama: "'Abasa", ayat: 42 },
    { nama: "At-Takwir", ayat: 29 }, { nama: "Al-Infitar", ayat: 19 },
    { nama: "Al-Mutaffifin", ayat: 36 }, { nama: "Al-Insyiqaq", ayat: 25 },
    { nama: "Al-Buruj", ayat: 22 }, { nama: "At-Tariq", ayat: 17 },
    { nama: "Al-A'la", ayat: 19 }, { nama: "Al-Ghasyiyah", ayat: 26 },
    { nama: "Al-Fajr", ayat: 30 }, { nama: "Al-Balad", ayat: 20 },
    { nama: "Asy-Syams", ayat: 15 }, { nama: "Al-Lail", ayat: 21 },
    { nama: "Ad-Duha", ayat: 11 }, { nama: "Asy-Syarh", ayat: 8 },
    { nama: "At-Tin", ayat: 8 }, { nama: "Al-'Alaq", ayat: 19 },
    { nama: "Al-Qadr", ayat: 5 }, { nama: "Al-Bayyinah", ayat: 8 },
    { nama: "Az-Zalzalah", ayat: 8 }, { nama: "Al-'Adiyat", ayat: 11 },
    { nama: "Al-Qari'ah", ayat: 11 }, { nama: "At-Takasur", ayat: 8 },
    { nama: "Al-'Asr", ayat: 3 }, { nama: "Al-Humazah", ayat: 9 },
    { nama: "Al-Fil", ayat: 5 }, { nama: "Quraisyi", ayat: 4 },
    { nama: "Al-Ma'un", ayat: 7 }, { nama: "Al-Kausar", ayat: 3 },
    { nama: "Al-Kafirun", ayat: 6 }, { nama: "An-Nasr", ayat: 3 },
    { nama: "Al-Masad", ayat: 5 }, { nama: "Al-Ikhlas", ayat: 4 },
    { nama: "Al-Falaq", ayat: 5 }, { nama: "An-Nas", ayat: 6 }
];

// 2. DATA KELAS SANTRI 2026/2027
// Struktur baru: kelas langsung, tanpa rumpun
// Halqah Ilmiyah, Halqah Lughowiyah, dan Halqah Quraniyah.
window.dataSantri = {
    "Kelas 1 Putra": [
        "ALEXY PRATAMA HADRIAN",
        "AMIN SUGIONO",
        "FATIR AL MUQMINUN HAKIM",
        "MUHAMMAD RAFFI",
        "ILHAM MAULANA",
        "MEDIKA PRATAMA",
        "MUHAMMAD BILAL ARIFI",
        "RIFKI AHNAF",
        "MUHAMMAD AFIF AL BAIHAQI",
        "MUHAMMAD NABIL IRWANSYAH",
        "M. UMAR HALIM RAHMAPUTRA",
        "RIKI WARDANI",
        "RIKO WARDANA",
        "QENZO GAVRIEL ALIFIANDRA",
        "MIKO VAJAR",
        "HADINATA SAPUTRA",
        "DZIKRI MUDHOFFAR",
        "MUHAMMAD AQIL RIDHO",
        "MUHAMMAD YASIR AL FAZAR JHIRA",
        "MUHAMMAD ALMISKY PRATAMA",
        "CAHYIS ISZAM",
        "ALVIN HERFIANTINO",
        "MUHAMMAD USAMAH",
        "IHZA TRINANDI",
        "FAHRY AKBAR RAMDHANI"
    ],

    "Kelas 2 Putra": [
        "ADITYA PUTRA IBRAHIM",
        "AIRLANGGA AZKA ABQORI",
        "AQIELA MARSYAH",
        "BRILLY HANDRIAN",
        "DARREN ATHAYA",
        "ELLENO QUTHBIE HERMAWAN",
        "FADIL NURHALIM",
        "MUHAMMAD IZAM SAPUTRA",
        "MUHAMMAD SYAKIR HUTABARAT",
        "MUHAMMAD ZIYAD ZHAZHA",
        "RAFA",
        "ALIF SAMUDRA",
        "ILHAM",
        "ROID AFDAL",
        "MUHAMMAD ABIL IRWANSYAH",
        "EZA FEBRI AL FADZRI",
        "REZFY FAKHRYAZKA",
        "AHMAD FARHAAN",
        "SYAHRUL RAMADHAN",
        "MUHAMAD YUSUF ARROSIYD",
        "FAUZAN IBNI JABAR",
        "MUHAMMAD FAISAL FIKRIANSYAH"
    ],

    "Kelas 3 Putra": [
        "NIZAM KABISAT",
        "HAFIDZ ALRIZKY",
        "MUHAMMAD FADHIL BUANA",
        "NAJMIHADI SYAUQII TAMAAM",
        "NAUFAL AKBAR ALKHATIRI",
        "QHEIZAN ALQIZA ARISDA",
        "DAFFA AL MUSYARI",
        "WAHYU REYDINATA",
        "HAFIDZ AL ROZI"
    ],

    "Kelas 4 Putra": [
        "BASRI AL HAZIQ ZULFAHMI",
        "AHMAD RIYADI",
        "ABDULLAH MUKTI HAFIDZALLAH",
        "MAHESA AULIA GIFFARI",
        "ZULFAQIH HAERUNNASIHIN",
        "MUHAMMAD FIRAAS AL - INSYIROH",
        "RENAL MARTIN",
        "REYFAS RAMADHAN",
        "MUHAMMAD ALLAM NUR HUSHAIN",
        "MUHAMMAD FAQIH HAFIDZALLAH",
        "MUHAMMAD RIJALUL KAMIL",
        "ALIF MUHAMMAD YUSUF",
        "GHOZY FATHURRAHMAN",
        "WAFII FADHLURROHMAN",
        "MUHAMMAD RAID MAHRUS",
        "RAFI RAMADHAN",
        "AHMAD MAULANA",
        "REYNALDI MALIK IBRAHIM ALFARIDZI"
    ],

    "Kelas 5 Putra": [
        "PRAWIRO PUJO TUNGGAL JATI",
        "ANGGA PRATAMA PUTRA",
        "AKBAR PRAYOGA",
        "ANDES AFENDRA",
        "ARYA DIFA ALSYA",
        "DANANG PRASDITYA SANTOSO",
        "K.A. M. ABDULLAH SHIDDIQ AGTSALI",
        "MUHAMMAD AL FALAH"
    ],

    "Kelas 1 Putri": [
        "NAMI RIA RAMADHANI",
        "NAEVA MARNIA",
        "NAYYA SALSABILLA",
        "QIARA ANJANI DIVANTI",
        "NAURA ADELIA FITRI",
        "NAJIHA SHAFIYAH AFIFAH",
        "QONITA AZZAHRAH ALFANSYURI",
        "NABILA NUR WAMAWADDA AL- MAIRA"
    ],

    "Kelas 2 Putri": [
        "DINA RUHAYAH",
        "DAFIA NAFLA SYAKIRA",
        "INAYAH NOURAH ANINDYA",
        "AISYAH NURUL AULIA",
        "ASHIFA FITRI RAMADHONI",
        "ANISYA SEPTIANI",
        "ADIBA AILA KHANZA",
        "AISYAH NUR KHALIFAH",
        "WINDY WINDARI",
        "FITRAH KIRANA"
    ],

    "Kelas 3 Putri": [
        "JESSICA PUTRY AYRA",
        "QELZA RAMADHANI ATH THAHIRA",
        "EARLYTA ARSYFA SALSABILA",
        "GRINNETA NALANI PUTRI",
        "GHENIS ANDIENTIAZ",
        "WILDA"
    ],

    "Kelas 4 Putri": [
        "NYAYU MARLITSA ARDHANI"
    ]
};

// Alias agar halaman baru juga dapat memakai window.dataKelas.
window.dataKelas = window.dataSantri;


// 3. DATA GURU
window.dataGuru = [
    "MULTAZAM",
    "ALVIN",
    "RASYIDIN",
    "NAQIEB",
    "FALAH",
    "FAHMI",
    "KHAIZURAN",
    "RAHIEL",
    "FAIQ",
    "KAMAL",
    "MEILISA",
    "FATIMAH",
    "EVITA"
];


// 4. DATA MATA PELAJARAN
window.dataMapel = [
    "AQIDAH",
    "FIQIH",
    "ADAB",
    "SHIRAH",
    "METODE PENGAJARAN",
    "KEWIRAUSAHAAN",
    "NAHWU",
    "SHARAF",
    "BALAGHAH",
    "TAHSIN",
    "TAHFIZ"
];

/* WHITE-LABEL OVERRIDE: satu file config/master-data.js */
if (window.CAHAYA_MASTER_DATA) {
  window.dataSantri = window.CAHAYA_MASTER_DATA.santriByClass || window.dataSantri || {};
  window.dataKelas = window.dataSantri;
  window.dataGuru = window.CAHAYA_MASTER_DATA.teachers || window.dataGuru || [];
  window.dataMapel = window.CAHAYA_MASTER_DATA.subjects || window.dataMapel || [];
}
