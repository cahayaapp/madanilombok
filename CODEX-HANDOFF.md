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
