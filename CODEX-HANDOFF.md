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

### 6 Oktober — pembaruan Guru Wali SMK dan pemeriksaan ulang SMP
- Daftar screenshot SMK 6 Oktober: 64 siswa aktif live dipetakan ke 12 SDM canonical, termasuk ID STD yang dibuat admin. Paket seed/imports/smk-mentor-2026-update.json menyimpan nama sumber/master dan nomor urut untuk review.
- Admin Import Data: tombol Terapkan Guru Wali SMK, preview seluruh pencocokan; pemeriksaan identitas/status/unit siswa dan SDM serta konflik mentor sebelum atomic patch. Menambah role Guru Wali dan mentee scope akun aktif terkait; role lain/SMP dipertahankan. Marker menyimpan assignment sebelumnya; tidak membuat siswa atau mengganti Wali Kelas/jadwal/finance.
- File GURU WALI SMP 2026-2027 (1).xlsx diperiksa: seluruh isi baris sama dengan file awal, 80 assignment sama dengan export live. Tiga nama belum tercantum: HABIBURRAHMAN, HELGA ELVINA IRAWAN, SUJIYANA. ATIKA ZAHRA RATIFA dan BAIQ ATIKA ZAHRA RATIFA masih dua ID aktif; hanya yang berawalan BAIQ ada pada sumber (Ida Fitriana). Konfirmasi user diminta, belum menggabungkan atau menetapkan mentor tanpa sumber.
- Paket SMK belum diterapkan live; sesi VS Code masih Kusma Dewi. Permintaan login Admin sudah dikirim. Hasrul Ali belum punya akun aktif terhubung pada audit; provisioning tidak dilakukan di pembaruan ini.

### Konfirmasi identitas Atika — 6 Oktober 2026
Pengguna menegaskan AMD-SMP-0013 ATIKA ZAHRA RATIFA = AMD-SMP-0016 BAIQ ATIKA ZAHRA RATIFA. Simpan alias terkonfirmasi di seed/imports/student-identity-confirmations-20261006.json, mentor Ida Fitriana. Pemeriksaan export live menemukan konflik NISN/NIK/tanggal lahir/nama orang tua dan biodata lain. Belum memilih/menimpa biodata, menonaktifkan record, memindahkan riwayat atau menulis live; perlu kepastian record biodata mana yang benar. Tiga nama SMP lain tetap belum punya sumber mentor.

### Guru Wali SMK diterapkan LIVE
6 Oktober: user login Admin dan meminta penerapan. Tombol Terapkan Guru Wali SMK berhasil menyimpan atomic patch; pembacaan ulang memverifikasi seluruh 64 penugasan aktif ke 12 mentor. Tidak ada missingAccounts pada hasil. Bukti /tmp/madani-guru-wali-smk-success.png.
User kemudian memberi gambar NISN Baiq Atika; nomor cocok persis dengan AMD-SMP-0016, bukan AMD-SMP-0013. Biodata canonical AMD-SMP-0016 dikonfirmasi.

### Atika: arsip duplikat LIVE selesai
NISN canonical divalidasi sesuai screenshot user. Admin Import Data → Terapkan Identitas Atika: AMD-SMP-0013 status inactive, mergedInto AMD-SMP-0016, alasan validasi; canonical confirmedAliases ditambah. Pembacaan ulang berhasil: record canonical tetap aktif/binaan Ida Fitriana. Tidak menghapus/memindahkan riwayat lama, biodata canonical dan finance tidak ditulis. Daftar kelas/kelompok dan scoped roster lokal mengecualikan mergedInto untuk menghindari entri ganda; master lengkap tetap tersedia untuk lookup riwayat. 137 tes lulus. Tiga siswa SMP lain masih belum ada sumber Guru Wali.

### 6 Oktober — laporan pelanggaran lintas unit
Seluruh role internal memperoleh menu laporan (Naqib tetap memakai menu naqib-case agar tidak dobel). Guru Mapel, form workspace dan Naqib kini memilih reportableStudents dari seluruh santri aktif, tanpa batas unit/kelas/gender/mentee/asrama/jadwal, mengabaikan mergedInto. Submit memvalidasi ID dari roster aktif; metadata pelapor tetap disimpan; handler/transisi Konselor dan finance tidak diperluas. Pertanyaan cakupan Wali Santri/orang tua masih menunggu; asumsi sementara seluruh role internal, akses orang tua tetap seperti semula. Aturan boarding lokal sudah mengizinkan akun staf aktif lintas unit, tidak diubah/dideploy. 139 tes lulus termasuk pengiriman lintas unit untuk 13 role workspace dan Guru Mapel tanpa jadwal, rendering Naqib lintas scope. Cache v50. Tidak mengirim laporan kasus percobaan ke database produksi.

## 6 Oktober — Pembina Tahfiz berdasarkan halaqah

Permintaan terbaru: halaman Pembina Tahfiz mengikuti pembagian halaqah pengguna. `teacher/quran.js` sekarang hanya memakai kelompok binaan dari `teachingGroups`, tanpa memasukkan rombel dari jadwal pelajaran. Roster dan setoran baru memakai groupId; riwayat lama tidak diubah. Kelompok Tahsin otomatis memilih Tahsin dan menjadi acuan program anggota yang belum memiliki penempatan individual; kelompok campuran mendukung keduanya, penempatan individual bertanggal tetap diutamakan. Pembina yang belum pasti tidak dicocokkan otomatis.

Verifikasi: 141 tes lokal lulus, termasuk kelompok tanpa jadwal, penolakan fallback kelas, anggota Tahsin tanpa placement dan penyimpanan groupId. Halaman VS Code dengan sesi Muhasim dan database aktif setelah reload menampilkan GEMA Mutqin — Muhasim dengan sembilan nama anggota yang cocok dengan daftar terkonfirmasi; Bain tetap tidak masuk sesuai penundaan pengguna. Tidak menulis catatan setoran percobaan maupun mengubah database. Belum deploy website hosting. Cache v51-tahfiz-halaqah.

## 6 Oktober — Form banyak surat dan tata letak Tahfiz

Mengacu `fajrulislam/guru/inputSetoranTahfiz.html`: ditambahkan mode Satu Surat / Manual dan Banyak Surat (Dari Surat, Sampai Surat, Ayat Terakhir), total ayat otomatis, termasuk rentang mundur. Mode tersedia Tahfiz/Tahsin/Murojaah; beralih mode mempertahankan isian manual. Validasi rentang tetap dijalankan sebelum simpan ke groupId. Checkbox terjemah/tadabbur/Cahaya Tahfiz dihapus dari form dan field deepReflection tidak ditulis pada setoran baru; record lama tidak diubah. Tata letak row surat, Hapus Baris, tombol aksi, margin judul dan ruang navigasi bawah diatur khusus quran-page.

143 tes lokal lulus; tambahan menguji total/rincian banyak surat, ayat terakhir tidak valid, rentang mundur Tahsin, pelestarian isian manual, serta field checkbox yang dihapus. UI akun Muhasim di VS Code terverifikasi membuka mode Banyak Surat tanpa menyimpan setoran percobaan. Bukti /tmp/madani-banyak-surat.png. Cache v52-quran-multi-surah; stylesheet app v52. Belum deploy hosting.

## 6 Oktober — Dua pilihan program Quran

Pilihan program form kini hanya Ziyadah dan Muroja’ah sesuai permintaan pengguna. Ziyadah memakai form Tahsin/Tahfiz sesuai penempatan individual bertanggal atau jenis halaqah; seluruh anggota halaqah tetap terlihat. Muroja’ah mempunyai jenis Harian/Pekanan/Bulanan. Setoran baru menyimpan activity dengan type lama untuk kompatibilitas riwayat. Tidak migrasi atau menulis database saat tes. 144 tes lulus termasuk pilihan dua menu dan form yang mengikuti penempatan. Cache v53-ziyadah-murojaah. Perubahan lokal, belum deploy hosting.

## Koreksi pengguna — kartu beranda Tahfiz

Maksud dua menu adalah dua kartu pada beranda, bukan sekadar dropdown form. Beranda Pembina Tahfiz kini mempunyai kartu Ziyadah dan Muroja’ah, masing-masing menuju route quran-ziyadah/quran-murojaah dengan pilihan form awal yang sesuai. Header identitas dan pengalih role tetap. Daftar kartu halaqah diganti ringkasan jumlah; halaqah dipilih di form. 145 tes lulus termasuk klik kedua kartu dan default Muroja’ah. Cache v54-tahfiz-home-cards, belum deploy hosting.

## 6 Oktober — kartu emas dan form tanpa pemilih program

Kartu Muroja’ah memakai kelas secondary dengan gradasi emas Madani yang sudah tersedia. Dropdown Program dihapus dari lembar setoran; selectedProgram berasal dari route kartu dan tetap selama memilih halaqah/tanggal. Judul menjadi Setoran Ziyadah atau Setoran Muroja’ah; jenis Muroja’ah Harian/Pekanan/Bulanan tetap tersedia. 145 tes lulus. Cache v55-tahfiz-direct-forms; lokal, belum deploy hosting.

## 6 Oktober — pelanggaran SD kepada Wali Kelas

Instruksi pengguna: tidak ada Guru Wali/mentor individu untuk TK; pemetaan rombel/jadwal TK menunggu konfirmasi kepala sekolah. Pelanggaran siswa SD ditangani Wali Kelas (homeroomStaffId), bukan Konselor atau Guru Wali.

Ketiga formulir pelaporan (Guru Mapel, workspace role internal, Naqib) memakai schoolCaseRoute. Laporan baru SD masuk boarding/homeroom_cases/{year} dengan status menunggu_wali_kelas, classId dan assignedHomeroomStaffId; non-SD tetap boarding/cases. Laporan multi-siswa lintas unit dibagi sesuai penerima dalam patch yang sama. Wali belum tersedia ditandai needs_homeroom, tanpa fallback Konselor.

Menu Pelanggaran Kelas SD pada role Guru Mapel (kartu beranda muncul untuk pemegang Wali Kelas SD) membaca laporan kelasnya, termasuk legacy SD di node cases; catatan klarifikasi/pembinaan dan penutupan memakai transitionWorkspaceRecord dengan pemeriksaan ownership Wali Kelas saat ini, histori append, tanpa poin otomatis. Semua scoped case lists Konselor dan counselor-workspace mengecualikan SD. commitCaseOperation menolak SD berdasarkan master siswa dan model menolak handlingRole wali_kelas. Data historis tidak dimigrasi/dihapus. Implementasi ini bukan klaim penguatan Firebase Rules; rule boarding lama tidak berubah, belum uji emulator/produksi.

149 tes lokal lulus termasuk routing SD/non-SD, multi-unit atomic report, Wali Kelas berbeda ditolak, penyelesaian dengan histori dan baca legacy. Syntax JS, JSON rules, diff check lulus. Tidak menulis laporan percobaan ke live atau mengubah finance. Cache v56-sd-homeroom-cases; belum deploy hosting.

## 6 Oktober — konfirmasi Fahri/Ida dan Bahasa Arab

Pengguna mengonfirmasi Fahri Gontor = Fahri Aldian Effendi (0023); Fahri Husain tetap terpisah. Ida Fitriana 0037 digabung ke 0036 (Guru Wali SMP). Lokal: semua enam kelompok Arab terhubung, termasuk Sigor/Ida dan Cordova 3/Fahri; Halaqoh Khatam/Ida ikut tertaut. Master duplikat dihapus setelah arsip reference/staffIdentityMerges dan referensi dipindahkan. Akun Auth dan histori tidak dihapus; finance tetap. Jadwal umum/GEMA 05.40–06.10 berganti nama Bahasa Arab (ID tetap). Paket terpisah Admin Import Data: Terapkan Konfirmasi Guru & Bahasa Arab, marker arabic-staff-confirmed-20261006-v1. 151 tests lulus; cache v57. Belum diterapkan live atau deploy; sesi lokal Muhasim, sudah meminta pengguna masuk Administrator.

## 6 Oktober — diagnosis PWA toolbar dan GPS tablet

Read-only HTTP header check verified http://app.almadanilombok.com returns 200 directly (no HTTPS redirect), hosted by GitHub Pages; HTTPS works. Manifest deployed is already standalone/root scope. Portal/admin lacked manifest link. Screenshot browser toolbar is not DOM and cannot be removed by CSS; old HTTP/other-origin shortcut may need reinstall from HTTPS. Exact tablet install origin and actual geolocation error code not verified.

Local fixes: secure-origin.js redirects official HTTP origins to HTTPS preserving path/query/hash, excludes file/localhost; loaded before modules on entry, portal, admin. Portal/admin link shared root manifest, manifest id equals previous effective start_url to preserve identity. GPS helper distinguishes insecure/permission/unavailable/timeout, fresh high accuracy request with one fresh network-location fallback only after codes 2/3; same verifyLocation radius retained, no attendance bypass. SW v58. 156 tests passed, syntax/diff checks passed. No physical tablet test, no attendance written, no hosting deployment.

GitHub Pages settings opened in agent Chrome tab, but browser is logged out. Login requested asynchronously to enable server Enforce HTTPS; not changed yet. Do not claim live HTTPS enforced or installed tablet fixed. Pending previous Arabic identity live import remains separate.

### HTTPS hosting diterapkan melalui Safari
Pengguna mengarahkan memakai sesi Safari yang telah login. Enforce HTTPS pada GitHub Pages cahayaapp/madanilombok diaktifkan; UI checked + DNS successful. Read-only curl memverifikasi HTTP portal mengembalikan 301 Location https://app.almadanilombok.com/app/index.html (6 Oktober 2026 02:42 UTC). Bukti /tmp/madani-https-enabled.png. Ini perubahan setting hosting saja; kode lokal PWA/GPS belum dipublikasikan. Uji tablet/install lama dan presensi fisik belum dilakukan.

## 6 Oktober — popup izin lokasi pertama kali

Permintaan pengguna: tampilkan permintaan lokasi pertama kali, tidak berulang setelah disetel, tampil kembali bila lokasi dinonaktifkan. location-onboarding.js + boot/CSS dipasang di entry, portal, admin untuk semua role. Dialog Aktifkan & Izinkan Lokasi meminta native geolocation melalui klik pengguna; Nanti/Escape tetap tersedia. Flag kesiapan lokal disimpan hanya setelah callback lokasi berhasil; pemeriksaan onboarding tidak menyimpan koordinat atau mengirim ke server. Permission granted diperiksa diam-diam; prompt/denied menampilkan petunjuk, tanpa menganggap localStorage sebagai izin browser. Permissions API opsional (fallback Safari); perubahan izin serta app resume/pageshow diperiksa, throttle 60 detik dan single in-flight. Tidak memantau GPS terus-menerus. Kegagalan presensi GPS memunculkan dialog melalui event; posisi berhasil menutupnya. Perangkat GPS off tidak punya event web universal: terdeteksi ketika pembacaan lokasi gagal, tidak diklaim tahu sakelar OS. File preview tidak meminta lokasi.

160 tests passed (first-use, repeat granted, revocation, unavailable, Safari fallback, throttling, dialog/native request). Syntax/diff passed. Cache v59. Lokal saja, belum commit/push/deploy dan belum diuji pada tablet pengguna. Enforce HTTPS hosting tetap aktif dari langkah sebelumnya.

## 6 Oktober — prioritas perbaikan Absen Akhir
Pengguna menunda integrasi penuh Bahasa Arab Guru Mapel dan melaporkan finalisasi KBM ditolak dengan Data telah berubah. Ditemukan cold-cache hazard di saveTeacherSession: get() sebelum runTransaction tidak menjamin cache transaksi berisi record server; callback null + expectedVersion>0 langsung abort. Kini value listener ditahan sampai transaksi selesai, menunggu snapshot pertama, cleanup finally dan timeout baca 20s. Tidak mengganti pemeriksaan versi/ownership atau memaksa overwrite; createOnly tetap mempertahankan waktu awal. Regresi repository menggunakan Firebase boundary mock yang memisahkan get/server/cache, menguji finalisasi cold cache, concurrent revision, missing record, different owner, read permission failure, createOnly dan listener cleanup. 164 tests passed; syntax/diff checks passed. Belum Firebase Emulator/perangkat riil, belum mengklaim penyebab pasti screenshot dari observasi produksi; tidak menulis/mengubah absensi produksi. Cache v60, kode lokal belum dipublikasikan. Integrasi Bahasa Arab sebagai KBM kelompok tetap tertunda sesuai prioritas pengguna.

## 6 Oktober — Bahasa Arab pagi sebagai KBM kelompok
User melanjutkan eksekusi Bahasa Arab. group-schedules.js membentuk jadwal nyata dari metadata enam kelompok dan dailyScheduleId sumber jadwal 24 jam aktif tahun berjalan, staff ownership wajib; tidak fallback rombel formal. target groupId dipakai GPS/KBM/materi/capaian/nilai/tulisan/tindak lanjut; classId null, key group-prefixed. Anggota aktif dari groupAssignments, bukan siswa kelas. MPL-PONDOK-ARAB-PAGI ditambahkan. Sumber Setiap Hari mengikuti DOCX; pengecualian Jumat/pekanan tidak ditebak. Cache v61. 167 tes lulus termasuk workflow UI kelompok; sintaks/diff bersih. Keuangan/rules tidak diubah, uji produksi presensi belum dilakukan.

LIVE: sesi VS Code ternyata Administrator. Setelah reload membuka Import Data dan menekan Aktifkan Pelajaran Bahasa Arab Pagi. UI sukses: "Bahasa Arab pagi aktif sebagai pelajaran kelompok. Muat ulang halaman Guru Mapel." Paket arabic-group-lessons-20261006-v1 (1 subject + metadata6groups + marker) tersimpan. Validasi kelompok/pengajar/sumber lolos, tanpa menjalankan ulang merge Fahri/Ida pada turn ini. Tidak membuat catatan presensi percobaan. Kode aplikasi lokal belum commit/push/deploy oleh agent; aktivasi database saja tidak mempublikasikan kode portal.

## 6 Oktober — popup sukses Absen Akhir
Setelah simpan FINAL KBM dan sinkronisasi materi berhasil, learning.js menampilkan modal tosca/emas berikon centang, judul Presensi berhasil disimpan, rincian mapel/kelas atau kelompok/tanggal/jam, tombol Kembali ke Beranda yang menutup dialog dan navigate dashboard. Tidak muncul untuk Absen Awal, validasi gagal, transaksi gagal, atau sinkronisasi materi gagal. Dialog bisa ditutup untuk tetap membaca hasil; fokus tombol beranda, reduced-motion didukung. 168 tests passed termasuk final-save→popup→dashboard dan tidak muncul pada validasi gagal. Syntax/diff lulus. Cache/theme v62; belum publikasi hosting atau menulis presensi produksi.


## 8 Oktober — pembatasan program Naqib, menunggu jam yang pasti

Pengguna membatasi presensi/laporan Naqib sementara pada Tahajjud, lima salat wajib, piket kebersihan, dan apel transisi pondok–formal setelah Tahfiz. Koreksi penting: Tahfiz yang diganti Senin→Apel Pagi dan Sabtu→Senam adalah kegiatan pondok setelah Bahasa Arab, perkiraan pengguna 07.00–07.50, BUKAN Tahfiz akademik SD. Semua perubahan lokal SD yang keliru (12 slot, dua program, paket/tombol impor dan tes) sudah dibatalkan; tidak pernah diterapkan live.

`naqib-program-policy.js` membatasi jenis kegiatan. Presensi/laporan menyaring pilihan dan membaca ulang program/jadwal sebelum menyimpan, sehingga formulir lama tidak melewati pembatasan. Indeks program dari tombol Terapkan Piket juga memakai kebijakan yang sama. Panduan jadwal 24 jam, riwayat dan keuangan tetap. Pemilih kelompok Bahasa Arab di presensi Naqib dihapus; pembelajaran Bahasa Arab tetap melalui Guru Mapel.

Belum ada perubahan jam/master atau penerapan produksi. Sumber lama memuat Qobliyah Subuh (bukan otomatis salat Subuh), bangun tidur (bukan otomatis Tahajjud), Magrib 18.00–20.30, dan belum memiliki slot tersendiri Isya/kebersihan/apel transisi. Pertanyaan kepada pengguna masih menunggu: jam mulai–selesai Tahajjud/Subuh/Isya/kebersihan/apel transisi, kepastian Tahfiz 07.00–07.50, serta apakah Apel Pagi/Senam tetap ikut presensi di luar daftar terakhir. Jangan mengarang jam atau menerapkan paket jadwal sebelum jawaban. Kebijakan lokal saat ini mengecualikan Senam/Apel Pagi sampai cakupannya dipastikan. Pembatasan server bergantung penerapan ulang indeks settings/naqibDuty/programs dan deployment rules lama, belum diverifikasi produksi. Cache v67. 180 tes lokal lulus; tes rendering terkait diulang dan lulus setelah penambahan asersi yang menolak simpan dari formulir ketika program dikeluarkan. Syntax JavaScript, JSON, dan diff check lulus.


## 8 Oktober — konfirmasi halaqah pagi dan presensi GEMA (kode lokal)

User mengonfirmasi 07.00–07.50 seluruh halaqah putra/putri termasuk GEMA: Senin Apel Pagi, Sabtu Senam. Paket `morning-halaqah.json` dan tombol Import Data “Terapkan Jadwal Halaqah Pagi” tersedia. Blok lama Umum 07.00–07.50 dinonaktifkan, bagian GEMA 07.00–09.00 mulai 07.50 agar 07.00–07.50 tidak tumpang tindih; bagian sesudahnya dipertahankan. Lima hari lain Tahsin/Tahfiz. SD akademik tidak berubah. Tombol memperbarui indeks Naqib tanpa mengubah roster, riwayat atau keuangan. Belum diterapkan live/dipublikasikan.

Beranda Pembina Tahfiz kini empat kartu: Ziyadah, Muroja’ah, Presensi Guru (GPS yang sama), Presensi Santri (dua tahap). Jadwal dihasilkan hanya untuk halaqah binaan, memakai jadwal aktif tahun berjalan. Kelompok GEMA juga mendapat sesi 06.10–07.00, 09.00–11.00, 14.00–15.30 dari sumber lama; hanya sesi 07.00–07.50 yang dikecualikan Senin/Sabtu. Bahasa Arab tetap pada Guru Mapel dan metadata pengajar kelompok yang sudah ada. Role Pembina tidak mendapat jadwal kelas formal/kelompok Arab.

Permintaan terbaru: peserta GEMA tetap terlihat di presensi kelas SD/SMP/SMK, dengan “Presensi oleh Pembina GEMA” dan tanpa radio kehadiran/nilai/poin otomatis. `gemaClassAttendance` menggunakan penempatan kamar GEMA aktif tahun berjalan, tidak nama. Record baru menyimpan attendanceManagedBy=GEMA, status/statusAwal/score null, points 0; Absen Awal/Akhir bisa disimpan. Riwayat yang sudah tercatat mempertahankan snapshot terdahulu. Halaqah dan Bahasa Arab kelompok tidak dikecualikan. Wali membaca keterangan dan ringkasan tidak menghitung marker sebagai catatan hadir/alfa.

User meminta semua kegiatan GEMA bisa diabsen: daily metadata attendanceRole memisahkan halaqah→Pembina, Bahasa Arab serta Program Bahasa→Guru Mapel, kegiatan asrama lainnya→Naqib sesuai shift (pengecualian dari whitelist Naqib semula khusus GEMA). Pembelajaran yang belum jelas BELUM dibuat jadwal/pengajar fiktif. Pertanyaan tertunda: jam Kajian Sabtu/Sahabudin, Arab siang Senin–Selasa/Bahtiar, Nahwu Jumat siang/Anwar; jenis dan pengajar Program Bahasa 21.00–21.30; apakah Ahmad Budiawan Alkhair = Budiawan Khaer (halaqah GEMA Ziyadah putra belum tertaut SDM). Jam Tahajjud/Subuh/Isya/kebersihan/apel transisi juga masih belum dijawab. Jangan mengklaim semua kegiatan/akun sudah lengkap atau live. Pengujian memakai mock; tidak membuat presensi produksi. Cache v68.


## Koreksi 8 Oktober — seluruh kegiatan GEMA bukan Naqib

Instruksi terbaru menggantikan bagian sebelumnya: Al-Qur’an→pembina kelompok halaqah; Bahasa Arab/kajian/Nahwu/Program Bahasa→pengajar sebagai Guru Mapel. `naqibProgramKind` sekarang menolak SEMUA jadwal boarding_gema sebelum pemeriksaan nama/jenis; paket impor menghapus indeks jadwal GEMA lama dari settings/naqibDuty/programs. Kegiatan rutin GEMA diberi attendanceRole=pembina_gema sebagai penanda penanggung jawab yang masih harus ditautkan, BUKAN role login baru yang sudah diimplementasi. Recurring kajian/Arab/Nahwu ditandai guru_mapel, tetap menunggu jam/pengajar yang ditanyakan sebelumnya.

Presensi Naqib untuk program bersama (termasuk Apel/Senam) mengecualikan peserta kamar GEMA aktif dan memeriksa ulang sebelum simpan, sehingga label all_boarding tidak memasukkan GEMA kembali. Form Pembina Tahfiz dan Guru Mapel tetap seperti di atas. Pertanyaan baru menunggu: siapa pembina untuk salat/kebersihan/Apel/Senam GEMA, apakah pembina halaqah masing-masing juga menangani anggota mereka. Jangan mengklaim presensi kegiatan rutin Pembina GEMA telah lengkap sebelum penanggung jawab dan alur tersebut diimplementasi. Semua perubahan masih lokal, belum deploy/live.


## 8 Oktober — jadwal kajian, akun Hudhori, koreksi peserta kelas (lanjutan)

Konfirmasi: Sabtu 08.30–09.30 Kajian TGH. Hudhori (menggantikan nama Sahabudin), seluruh GEMA putra/putri. Nahwu Syaikh Anwar Jumat 14.00–15.30, Mutqin putra/putri. Ustadz Bahtiar Senin/Selasa 14.00–15.30, Mutqin putra/putri. `gema-lessons.json` + Import Data “Terapkan Kajian GEMA & Apel Transisi” menambah tiga kelompok pelajaran dinamis, empat slot, mapel dan referensi recurring; Hudhori SDM0089 baru, Anwar0009 dan Bahtiar0012 existing. Kelompok lesson bukan halaqah. Roster all mengikuti kamar GEMA aktif; Mutqin menggabungkan keanggotaan dua halaqah Mutqin aktif putra/putri, dedup berdasarkan ID. Jadwal halaqah mengurangi interval yang tumpang tindih kajian: Sabtu tersisa09.30–11.00; Mutqin14.00–15.30 Senin/Selasa/Jumat diganti pelajaran terkait. Tidak menyalin peserta sebagai siswa baru.

LIVE melalui Safari: akun hudhori@madani.app sudah dibuat dan terverifikasi aktif, Guru Mapel. Belum ditautkan SDM sampai paket diterapkan. Password sementara di /tmp/madani-hudhori-account.txt (0600), bukti /tmp/hudhori-account-created.png. Akun anwar@madani.app dan ahadi@madani.app sudah ada terverifikasi pada tabel Akun Semua SDM. Tidak membuat duplikat atau mengganti password mereka.

Koreksi terbaru aturan Naqib: GEMA tetap ikut salat Tahajjud/lima waktu, kebersihan, upacara/Apel Pagi, Senam. Kegiatan GEMA lain bukan Naqib. Apel transisi Setiap Hari07.50–08.00 seluruhSMP/SMK putra/i; GEMA tetap ada di roster dengan marker “Presensi oleh Pembina GEMA”, status null, tanpa kontrol kehadiran Naqib. Jam salat yang belum terpisah sumber tetap menunggu; jangan mengarang.

User melaporkan8SMK dan2SMP hilang di absensi. Lokal Ajeng0008 ada tapi salahkelasXI Busana→XI DKV; DindaSMP0101 danAkbarSMP0102 aktif tapi tanpaassignment, kini7Putri/9Putra. Tujuh SMK baru di seed0081–0087 denganNISN sesuaiuser; yangtidakdiberiNISN dibiarkankosong. Paketstudent-class-corrections dan tombol “Terapkan Koreksi Peserta SMP/SMK” mencocokkanNISN/nama sebelum membuat baru, menolakambiguitas/IDkonflik/unit/NISNberbeda, hanyaubahstudent/assignmentkelas, finance tidakdiubah. Belum diterapkan live pada saat catatanini. Perlu publishkode danterapkan2tombolimport. Cachev70.

### 8 Oktober — penerapan bertahap LIVE melalui Safari
- Commit a54cac4 sudah tersedia online (kartu Kajian GEMA terlihat); main dan origin/main lokal sejajar.
- Tombol Terapkan Jadwal Halaqah Pagi berhasil: UI mengonfirmasi tersimpan.
- Tombol Terapkan Koreksi Peserta SMP/SMK berhasil: UI mengonfirmasi pembaruan diterapkan (10 peserta dalam paket).
- Setelah izin eksplisit penugasan tiga guru GEMA, Terapkan Kajian GEMA & Apel Transisi dijalankan. Master SDM bertambah dari87 ke88; perencanaan akun dengan domain madani.app mengenali Hudhori sebagai Sudah ada (tertaut staff), bukan akun baru.
- Bukti screenshot /tmp/madani-gema-import-applied.png. Belum melakukan presensi riil atau mengubah finance.
- Fitriani masih Siap dibuat; Nurul sudah ada. Konfirmasi akses akun baru Fitriani sedang diminta; jangan klaim sudah dibuat.
- UPDATE: pengguna menyetujui akun Fitriani pada saat tindakan. Tombol khusus Fitriani & Nurul membuat fitriani@madani.app; hasil UI “dibuat”, tabel akun Aktif/Naqib, total95 pengguna. Nurul tidak diduplikasi. Kredensial diunduh lewat tombol Unduh Daftar Akun & Password (Safari Allow download); bukti /tmp/madani-fitriani-active.png. Uji masuk/shift dengan akun Fitriani belum dilakukan.

### 8 Oktober — identitas Qoyyim, Al, Bain diterapkan LIVE
Melalui UI Anggota Kelompok Safari tahun2026/2027 S1: AMD-SD-0132 Zhafran Dhiya'ul Qoyyim dan AMD-SD-0102 Yahya Al Mawaris ditambahkan ke GRP-2026-quran-L-zakaria. AMD-SMK-0018 Bain Aziqra ditambahkan ke GRP-2026-quran-L-ziyadah; diperiksa tidak tercentang di GRP-2026-quran-L-mutqin. Ketiganya diverifikasi setelah memuat ulang pilihan kelompok. Tidak membuat siswa baru atau mengubah biodata/finance. Bukti /tmp/madani-bain-ziyadah.png; konfirmasi seed/imports/boarding-name-confirmations-20261008.json. Master seed dan paket boarding lama belum diregenerasi; status pending lama jangan dianggap konfirmasi terbaru.

### 8 Oktober — permintaan Wisnu dan daftar staf (aktif)
User meminta Wisnu Nusantara menggantikan Fahri sebagai Konselor Pemula dan menggantikan pengajaran Bahasa Arab Muhasim; buat akun yang belum punya dari gambar 12baris. Master Wisnu belum ada, sudah ditambahkan LIVE melalui Data SDM: Wisnu Nusantara, Putra, aktif, peran deskriptif Konselor Pemula/Guru Bahasa Arab; tidak mengarang kontak/unit. UI menampilkan89SDM dan rowWisnu aktif. Belum buatakun/ubahkelompok atauhapusrole Fahri. Kelompok diketahui GRP-2026-arabic-L-gema05.40–06.10. Muhasim kepalaasrama/Mutqin tidak diganti.
Pending pertanyaan async: Fahri yang mana dan halaqah Wisnu; shift/genderWanda/Fitrah serta aksesSantriPreneur Riska/Nanda; identitasYusuf/Muammar serta jadwalmalamFahri. Kontrol Safari cell Edit/Hapus ambigu: klikcell malahmembuka dialoghapus, langsungCancel (tidakdihapus). Koordinat tool noWindowsAvailable; keyboard tidakberhasil. User diminta membukaEditkelompokCairo manual. Safari terakhirDashboardadmin. Draftscope seed/imports/staff-followup-20261008.json. Jangan klaim penggantian/jadwal/akun sudah diterapkan.
