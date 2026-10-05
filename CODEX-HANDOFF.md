# CODEX HANDOFF — MadaniApp V2 Pilot

**Koreksi terbaru pengguna:** Jurnal Liburan beserta monitoring dinonaktifkan (menu, akses route, dan write rules lokal); rekam lama dipertahankan. Penitipan tetap aktif. Pada data rombel, `homeroomStaffId` berlabel **Wali Kelas**, berbeda dari role Guru Wali untuk mentoring. Lima role pimpinan juga tersedia pada form pembuatan akun. Catatan implementasi awal di bawah merupakan riwayat sebelum koreksi ini.


## Brief terbaru (2 Oktober 2026)

Pengguna meminta audit dan penambahan fitur setiap role memakai Cahaya di folder `fajrulislam` sebagai acuan, dengan identitas Madani tosca BSI/emas dan keuangan tetap dipertahankan. Brief ini menggantikan pembatasan pilot lama di bawah untuk KPI/evidence, ruang manajemen, Jurnal Liburan dan Penitipan. Lihat `AGENTS.md` dan `docs/CAHAYA-PARITY.md` untuk implementasi, hasil uji dan selisih yang belum selesai. Pembatasan database produksi tetap berlaku.

## Tujuan repository

Repository ini adalah pilot MadaniApp berbasis Firebase RTDB untuk Pondok Pesantren Al-Madani. Jangan mengubahnya menjadi clone hard-code CAHAYA APP. Ambil **cara berpikir sistemnya**, bukan data/warna/struktur personelnya.

## Keputusan arsitektur yang dilindungi

- Firebase project: `madanilombok-f692d`.
- Root RTDB: `madani_app`.
- Satu santri = satu `studentId`.
- Kelas/kamar/kelompok = assignment per tahun ajaran.
- Core master data tidak boleh ditanam permanen di JavaScript.
- Satu SDM dapat memiliki banyak role.
- Guru Wali menjalankan mentoring individu; jangan membuat Mentor individu sebagai role terpisah kecuali ada keputusan baru.
- Naqib hanya mengawal kehidupan asrama, mencatat pelaksanaan/inisiatif dan melaporkan kasus. Tindakan kasus formal berada di Konselor.
- Tahsin/Tahfiz memakai role `mentor_tahsin_tahfiz`.
- Keuangan memisahkan `savings` dan `spending` wallet.
- Kasir Putra/Putri terpisah melalui `financeUnit` / `cashierUnits`.
- Jurnal Liburan dan Penitipan Wali Santri tidak aktif pada pilot.
- Jangan menebak pencocokan nama personel yang ambigu dari bagan. Lihat `seed/role-assignment-suggestions.json`.

## Scope yang boleh aktif sekarang

### Akademik
`teacher_attendance`, `student_attendance`, `quran`, `grades`, `schedule`, `lesson_plans`.

### Asrama
Semua route Naqib, Guru Wali/Mentoring Individu dan Konselor yang sudah ada di `permissions.js`.

### Wali Santri
Semua route parent yang sudah ada, kecuali tidak menambah Jurnal Liburan dan Penitipan.

### Keuangan
`dashboard`, `bills`, `payments`, `wallets`, `cashier`, `products`, `history`, `reports`.

Jangan menambah modul Dapur, Sarpras, Kesehatan, Media, KPI, Layanan, Penitipan, atau Jurnal Liburan sebelum brief berikutnya.

## File inti

- `assets/js/permissions.js` — role & feature matrix.
- `assets/js/app.js` — portal routing.
- `assets/js/modules/academic.js` — domain akademik.
- `assets/js/modules/boarding.js` — Naqib, Guru Wali, Konselor.
- `assets/js/modules/finance.js` — SPP/tagihan, wallet, kasir, laporan.
- `assets/js/modules/parent.js` — portal Wali Santri.
- `assets/js/app-store.js` — master & assignment cache.
- `assets/js/repository.js` — Firebase repository/audit/transaction helpers.
- `assets/js/admin.js` — CRUD Master Data.
- `seed/master-data.json` — baseline master data konsolidasi.
- `seed/organization-structure.json` — struktur dari bagan pengguna.
- `database.rules.json` — rules PILOT, belum final production.

## Data integrity

- Pertahankan `validationStatus`, `source`, dan `seeded` pada master seed.
- Jangan otomatis mengaitkan boarding roster yang belum exact-match.
- Jangan mengisi anggota halaqah putra yang belum ada pada sumber.
- Jangan menyatakan jadwal ASPURA 2025 sebagai jadwal 2026/2027 yang sudah terverifikasi.
- Jadwal SMP ganjil 2026/2027 dan pembagian mentor diperbarui dari dua XLSX pengguna pada 4 Oktober 2026; lihat `docs/SMP-UPDATE-2026-10-04.md` untuk penerapan dan batasnya. Jadwal SMK masih perlu normalisasi dari sumber gambar.

## Acceptance checklist sebelum merge

- `node --check` seluruh JavaScript lolos.
- Semua JSON parse valid.
- Semua menu yang diizinkan oleh `permissions.js` punya route/handler.
- Role lain tidak melihat menu yang bukan scope-nya.
- Tidak ada penambahan core roster hard-code.
- Record operasional menyimpan ID referensi dan tahun ajaran.
- Transaksi uang tidak menghasilkan saldo negatif tanpa validasi eksplisit.
- Refund/void sudah tersedia pada baseline dan wajib mempertahankan audit trail, pemulihan saldo, serta pemulihan stok. Jangan menghapus transaksi asal.
- UI tetap usable pada mobile.
- Perubahan node Firebase disertai update schema/docs/rules.
- Jangan deploy production tanpa memperketat Firebase Rules sesuai `docs/SECURITY-PILOT.md`.

## Prioritas lanjutan yang disarankan setelah pilot

1. Verifikasi role/personel dari struktur organisasi.
2. Lengkapi jadwal SMP dan normalisasi jadwal SMK.
3. Validasi roster asrama, kamar dan halaqah putra.
4. Perketat Firebase Rules dengan scope kelas/gender/student ownership.
5. Tambahkan finalisasi nilai/rapor bila format rapor Al-Madani sudah diputuskan.
6. Harden finance ledger dan refund melalui Cloud Functions sebelum production.

## 2026-10-04 — Jadwal 24 jam umum/GEMA

Dua DOCX baru sudah diimpor lokal: 14 slot umum dan 17 GEMA, mixed gender, 24 jam penuh. 50 slot/program lama inactive (riwayat dipertahankan), TK/akademik/finance tidak diubah. Scope berdasarkan kamar GEMA putra/putri; umum hanya kamar non-GEMA yang terpetakan. Jadwal wali dan roster presensi mengikuti scope; presensi patch tidak menghapus gender lain. Admin Import Data punya tombol Terapkan Jadwal 24 Jam; belum deploy/live. Detail dan batas di `docs/DAILY-UPDATE-2026-10-04.md`. Script `scripts/import-daily-update.py`; source/package `seed/imports/daily-2026-*.json`. 78 tes lokal lulus.

## 2026-10-04 — Roster halaqah, kamar, bahasa Arab

21 kelompok baru lokal (15 Quran, 6 bahasa Arab), penempatan kamar yang cocok, dan 11 kegiatan pekanan/bulanan. User menyetujui seluruh tabel usulan alias; Ferdi dua entri sama; Bain/Qoyyim/Al SKIP; Fahri Husain berbeda dari Effendi, Gontor belum pasti. Konfirmasi di seed/imports/boarding-2026-confirmations.json. Masih 40 kemunculan nama tertunda, jangan tambah siswa/tebak identitas. Penelusuran sumber lokal tidak menemukan kecocokan pasti untuk 10 nama tersisa. Feby Efrillia kelas V (koreksi dari pertanyaan sebelumnya). Poster Oktober 2025 SUDAH dikonfirmasi berlaku 2026/2027. Pembina yang ID-nya belum pasti hanya nama sumber; akun/scope role belum diubah. Lihat docs/BOARDING-ROSTER-UPDATE-2026-10-04.md. Belum deploy/live.

Perbaikan screenshot siswa AMD-SMP-0052 belum tersedia: boarding-update.js kini melakukan impor parsial; siswa hilang ditunda, legacy groups tetap aktif sampai ID known tersedia, retry melanjutkan appliedPaths tanpa overwrite data sukses. Marker partial bukan marker final. Tidak membuat siswa baru atau menulis live dari tool. SW v35.

Master kamar: paket terpisah room-metadata-2026-v1 lewat tombol Terapkan Penyelarasan Master Kamar agar tetap bisa diterapkan setelah marker roster selesai. GEMA Putra → GEMA Gedung Cairo; GEMA Putri → GEMA I (Putri); Makkah 2 jenis Staf; Cordova 1 diberi catatan belum tercantum pada sumber terbaru, tanpa menonaktifkan/memindahkan penghuni. Tabel admin kini menampilkan building (Gedung), jenis penghuni dan catatan sumber, bukan floor lama. Belum menulis live. Tes importer revisi mencakup marker roster sudah selesai.

Sinkronisasi guru kelompok: docs/GROUP-TEACHER-SYNC.md. Paket group-teacher-links-2026-v1 menautkan 10 kelompok known-ID (11 unresolved tetap pending) ke SDM/nama canonical dan menambah role serta groupIds akun aktif lewat tombol Terapkan Sinkronisasi Guru. Tidak menautkan SDM ambigu. Guru Mapel menampilkan roster bahasa Arab pagi; Quran memakai ownership staffId dan multi-pembina. Ini belum seluruh KBM/GPS/nilai untuk kelompok bahasa. 91 tes lokal lulus, belum live. SW v37.

## 4 Oktober 2026 — pemisahan role & UKS (pekerjaan aktif)

Lihat `docs/ROLE-WORKFLOWS-2026-10-04.md` untuk implementasi, 113 tes lokal, dan pekerjaan yang masih terbuka. Permintaan user: tuntaskan seluruh instruksi saat ia tidur, tanpa mengulang permintaan izin yang sudah diberikan. SDM identity matching secara eksplisit ditunda.

Akun UKS `kesehatan@madani.app` belum tersimpan: auto-review menolak tombol Simpan dan meminta persetujuan langsung walaupun user sebelumnya memberi izin spesifik/umum. Form di VS Code masih siap; pertanyaan persetujuan async masih menunggu. Jangan melewati penolakan lewat CLI/API alternatif. Tidak ada credential yang disimpan pada source. Tidak ada deploy/data klinis produksi dari sesi pengujian.

Perubahan baru: role Pembina Tahfiz (ID lama), kesehatan; KPI diblok semua role; Guru Wali baru; UKS stock/exam/permit atomic; Konselor canonical case operations & retryable projections; Naqib rubric/muhasabah; registry/manajemen/personil/monitoring; guru mukim/ibadah. Keuangan dipertahankan. PWA cache v39. Pengujian penuh: `MADANI_JSDOM_MODULE=/Users/haimac/Documents/CahayaAppV2/node_modules/jsdom/lib/api.js node --experimental-vm-modules --test tests/*.mjs`.


### Penutupan verifikasi lokal lanjutan — 4 Oktober 2026
- 121 tests lulus; 73 JS syntax dan 29 JSON valid. Finance module/rules/parent finance sama dengan HEAD.
- Ditambahkan report-publication.js + management-reports.js: reviewer Wakil Direktur, completeness jadwal, revise/publish/withdraw, parent read memakai published snapshot untuk exam_sessions; legacy grades dipertahankan.
- Revisi nilai melalui requestExamRevision hanya stage/version/revision; tidak menimpa score.
- Observasi → temuan → pembinaan terhubung; escalationTargetRole membatasi keputusan; work-followups mengirim finding_responses tanpa menutup temuan.
- Browser Guru Wali 390px tosca, no overflow. Viewport sudah direset.
- Belum deploy. Java runtime tidak tersedia untuk Emulator. Root database read masih pilot luas; jangan klaim isolasi klinis/role di produksi.
- Akun kesehatan@madani.app BELUM dibuat: auto-review menolak Simpan dan meminta konfirmasi langsung. Pertanyaan tertunda. Jangan bypass dengan jalur API/CLI. Password tidak disimpan di repo.
- Audit kesetaraan 100%, ranking Santri Terbaik lintas domain, GPS Madani dan identitas yang ditunda belum selesai. Lihat docs/ROLE-WORKFLOWS-2026-10-04.md.

### 5 Oktober — presensi memakai jadwal resmi
Keluhan jadwal contoh: teacherSchedules sebelumnya membuat fallback otomatis untuk kelas cakupan tanpa jadwal aktif, sedangkan master disimpan sepanjang sesi. Generator contoh dihapus dari jalur operasional; row isExample/example-* disaring. Konteks app menyediakan refreshMaster, dipanggil sebelum daftar jadwal/presensi dibuka; kegagalan baca ditampilkan tanpa memakai data lama. 123 tests lulus. Tidak mengubah/mengimpor database produksi; status impor akun pengguna belum diverifikasi. SW v40.

### 5 Oktober — gabungkan JP berurutan
- teacherSchedules menggabungkan slot yang waktunya tepat bersambung dengan guru, kelas/kelas gabungan, mapel, hari, tahun dan status penugasan yang sama. Istirahat/jeda tetap memisahkan sesi.
- ID slot pertama tetap ID sesi; sourceScheduleIds mempertahankan rujukan seluruh slot. Master/import dan riwayat tidak dihapus/ditulis ulang.
- Presensi guru mengenali presensi lama pada slot anggota. KBM memakai rekam anggota pertama yang sudah ada; jika beberapa slot dahulu sudah tercatat, riwayat tambahan tetap disimpan dan diberi keterangan.
- Seed Husnul Hatimah Senin terverifikasi: 8 Putra 08:00–10:00 (3 JP), 8 Putri 10:20–12:20 (3 JP), 7 Putra 13:30–14:50 (2 JP). PJOK gabungan Hasrul juga menjadi satu sesi 08:00–09:20 dengan kedua rombel.
- 125 tests lulus; syntax checks dan diff whitespace bersih. SW v41. Tidak menulis database produksi.

### 6 Oktober — lokasi absensi diterapkan
Atas instruksi langsung pengguna, lokasi Kampus Al-Madani sudah disimpan lewat UI Admin ke database: latitude -8.5854457, longitude 116.5755207, radius 700 meter, unit kosong (semua sekolah), Aktif. Tabel setelah simpan menampilkan 1 record dengan nilai tersebut. ID dibuat otomatis form; tidak memakai ID rencana GPS-ALMADANI. Uji GPS fisik guru belum dilakukan.

### 6 Oktober — jadwal SMK resmi diterapkan
- Sumber: DATABASE SMKS ISLAM PLUS AL-MADANI 2026-2027.xlsx, sheet kedua JADWAL MAPEL + WALI KELAS. Sebelumnya master aplikasi hanya memuat jadwal SD/SMP, sehingga Kusma Dewi tidak mendapat jadwal SMK.
- scripts/extract-smk-update.py menghasilkan paket seed/imports/smk-2026-2027-update.json: 398 slot untuk 7 kelas; kode guru ditautkan ke ID SDM yang sudah ada; merged cells mengikuti Excel. Tidak menambah identitas atau mengubah Wali Kelas/mentor/finance.
- Tombol Pembaruan SMK pada Import Data memeriksa referensi master sebelum menulis, menyesuaikan penugasan akun guru terkait, dan mencegah impor ulang melalui marker smk-2026-2027-sheet2-v1.
- SUDAH diterapkan ke database lewat UI Administrator atas instruksi pengguna. UI mengonfirmasi “Pembaruan SMK tersimpan” dan tombol menjadi disabled. Bukti /tmp/madani-smk-import-success.png.
- Kusma Dewi (AMD-SDM-0042/kode 2), Selasa XII DKV: 08:00–10:00, 10:20–12:20, 13:00–14:20. Penggabungan sesuai jeda teruji lokal. Akun guru perlu masuk ulang; tampilan sesi guru setelah impor belum diuji produksi.
- E89 Jumat tertulis 14.20.15.00, diparsing 14:20–15:00 dengan catatan sumber. Paket tidak mengubah file Excel asli.
- 128 tests lulus; JS syntax dan git diff --check lulus. Tidak deploy/commit/push.

### 6 Oktober — penyederhanaan menu dan tampilan operasional
- Guru Mapel: Ruang Kerja menyaring ID yang sudah berada pada Akses Cepat (Presensi Santri dan Materi Pembelajaran); Materi di Akses Cepat tetap membuka pilihan target/capaian. Pimpinan sudah menyaring menu cepat dari Ruang Kerja; beranda role lain tidak memiliki duplikasi pasangan ini.
- Label pilot/demo di admin, validasi, setup dan inisialisasi diganti istilah operasional. Panel pembuatan akun pilot dihapus beserta fetch konfigurasi/password serta handler provisioning pilot; manajemen user dan provisioning SDM tetap tersedia. Tidak menghapus/mengubah akun live.
- Hosting ignore menambahkan setup awal, konfigurasi akun pilot, dokumen internal, sumber, script, tests dan outputs. Ini konfigurasi lokal untuk deployment berikutnya; tidak melakukan deploy. Cache PWA v42.
- 128 tes lulus termasuk nonduplikasi menu; 74 JS syntax/31 JSON valid; diff whitespace bersih. Database/finance tidak diubah.
- Penghapusan label uji coba BUKAN sertifikasi kesiapan produksi: batas akses root RTDB dan uji Emulator pada docs/SECURITY-PILOT.md masih perlu dituntaskan sebelum peluncuran. Catatan audit internal dipertahankan.

### 6 Oktober — index satu layar dan instalasi PWA
- Entry memakai tinggi viewport dinamis, safe area, ukuran komponen adaptif dan layout ringkas untuk layar pendek. Tidak ada document scroll pada 320×568, 375×667, 390×844, 844×390, 1366×768 (terukur di browser). Login juga pas pada 320×568, 844×390, 390×450. Tinggi ekstrem <=360px mengizinkan scroll internal untuk akses form/zoom/keyboard, bukan memotong kontrol.
- Standalone/fullscreen/minimal-ui dan iOS standalone langsung ke login; tombol lanjut browser, kembali instalasi dan instalasi disembunyikan. Perubahan display mode dipantau.
- beforeinstallprompt hanya dipakai sekali, mencegah klik ganda, menangani batal/gagal/retry; appinstalled membuka login. Fallback petunjuk spesifik iOS/Android/desktop, koneksi offline dan konteks non-HTTPS. Tidak menjanjikan dialog otomatis pada browser yang tidak mendukung.
- SW registration menangani dokumen yang sudah loaded, scope tetap root; manifest.webmanifest disamakan dengan manifest.json. Cache v43, entry CSS/JS v43.
- 131 tests lulus; syntax/diff checks lulus. Bukti tampilan /tmp/madani-entry-mobile.png. Instalasi native pada perangkat nyata belum diuji, tidak deploy.

### 6 Oktober — beranda, navigasi, dan profil personal
- Beranda seluruh 15 role dipasangi tombol role di samping nama melalui home-role-switcher.js; pilihan hanya session.roles, memakai rolePicker yang sama untuk menyimpan role aktif/reset ke dashboard. Satu role tetap menampilkan status; tidak memberi role baru.
- Menu ruang kerja memakai tombol ringkas beraksen emas, akses cepat tetap berupa kartu. Bottom nav menjadi Jadwal, Pesan, Beranda, Profil, Lainnya: 5 slot sama lebar, Beranda tengah dengan label terlihat. Ikon pesan berupa SVG gelembung chat pada bottom, sidebar, dan quick menu.
- data-home pada app menerapkan beranda viewport tetap dan padding untuk bottom nav/safe area. Daftar panjang kelompok Arab tidak ditampilkan di beranda (tetap tersedia pada jadwal); ringkasan dekoratif dipadatkan. 15 mock-role home diuji lewat browser pada 320×568 dan 390×844: tidak ada tombol melampaui batas atas bottom nav, tidak ada horizontal overflow. Bukti /tmp/madani-home-navigation.png. Data panjang/jumlah anggota real tidak ditulis selama QA.
- Profil mengikuti alur fajrulislam/profil.html: nama sapaan, pilih/hapus foto, kompresi JPEG 250px, simpan identitas/foto, ganti password. Nama resmi SDM/role/scope tetap milik admin. Profil hanya patch users/{ownUid}/displayName dan photoURL. Password diverifikasi ulang memakai kredensial sekarang lalu updatePassword Firebase; tidak disimpan di database/log/repo. Tidak mengganti kredensial pengguna lewat tool.
- Aturan child displayName/photoURL mengizinkan akun aktif mengedit kolom sendiri, dengan batas tipe/ukuran. Rules lokal BELUM deploy/Emulator; penyimpanan profil non-admin membutuhkan rules ini di server. Batasan root read lama tetap belum dibereskan, jangan klaim hardening produksi selesai.
- 133 tests lulus (termasuk role picker dan profile patch), 77 JS syntax valid, JSON/diff checks lulus. Finance module tidak diubah. Preview outputs/home-preview hanya data mock, dikecualikan dari hosting. Cache v47. Tidak deploy/commit/push.

### 6 Oktober — perbaikan izin profil LIVE
- Pengguna melaporkan penolakan server pada Simpan Identitas & Foto. Aturan live diperiksa melalui Firebase Console Safari; users/$uid hanya mengizinkan admin, belum memuat child self-edit.
- Dua child rules displayName dan photoURL disisipkan pada aturan LIVE yang ada lalu Publish berhasil (draft unpublished/Publish hilang). Tidak mengganti seluruh rules dengan file lokal; aturan domain lain tetap seperti sebelumnya.
- Keduanya mewajibkan auth.uid===uid, profil sudah ada, aktif dan tidak dicabut; validasi nama 1–80 karakter serta foto JPEG data URL maksimal 180000 karakter. Hak role/scope tidak diperluas.
- Form Kusma Dewi yang masih berisi foto pilihan pengguna dicoba Simpan ulang lewat VS Code; UI mengonfirmasi “Identitas dan foto berhasil disimpan.” Bukti /tmp/madani-profile-save-success.png. Password tidak disentuh.
- Ini hanya deployment dua kolom profil; aturan lokal/domain lain serta hardening produksi tetap belum dideploy.

### 6 Oktober — tema resmi referensi beranda terbaru
- Referensi visual pengguna diterapkan sebagai tema bersama: header logo, lonceng pesan, avatar lingkaran penuh; hero masjid tosca; kartu akses cepat putih/tosca, menu ruang kerja aksen emas, ornamen gelombang, bottom Beranda bergaris emas.
- Header/hero yang sama dipasang pada seluruh 15 role, mempertahankan handler menu asli. Avatar menggunakan object-fit:cover, ukuran penuh, padding nol. Subtitle sesuai koreksi pengguna: PONDOK PESANTREN AL-MADANI.
- brand-theme.css v49 diperbarui pada aplikasi/admin/publik; entry tetap memakai entry.css sesuai kontrak identitas. SVG code-native home-mosque/home-waves ditambahkan dan masuk cache PWA v49. Acuan identitas ditambahkan ke AGENTS.md.
- 133 tests lulus; visual 15 role diperiksa dengan data mock, termasuk 320×568 tanpa tombol melewati batas navigasi bawah. Bukti /tmp/madani-official-home.png. Tidak deploy atau mengubah database pada pekerjaan tema.
