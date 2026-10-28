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


## 8 October 2026 — Izin Guru Mapel (local implementation)
- Added teacher-leave route/menu and Guru Mapel home card. Standard form: leave type, start/end date/time WITA, reason, contact, replacement/student-work plan and declaration. Preview and stored snapshot list affected official lessons (including group lessons).
- Teacher submits and can cancel pending requests with a note; admin/super_admin/director/deputy_director review with a note. Own approval forbidden. Immutable request plus single-write decision at academic/teacher_leaves/{year}/{uid}/{requestId}; no attendance or finance side effects.
- New write rules required alongside frontend deployment; service worker v71. Not pushed/deployed or production-tested. Existing broad authenticated root read remains unchanged; do not claim confidential isolation of leave records. No document attachment upload in this version.
- Validation: pure model and simulated rule expressions; JSDOM submit → director approval → teacher status workflow, role route rendering. No Firebase Emulator integration or real browser production save verified.

### Correction — teacher leave approver
User specifies each school's principal. Replaced admin/director/deputy approval with head_formal_school only, matching request unitId to the principal's roleScopes.head_formal_school.unitIds (fallback profile.unitIds). Empty scope grants no approval. Teacher selects own assigned unit and submits per unit; affected lessons filtered to that unit. Rules validate teacher unit index and reviewer scope index against stored user scopes, prohibit self approval and cross-unit decisions. Principal gets Izin Guru menu; director with principal role must switch role. Prior approval description superseded. 196 tests passed locally; production deployment still pending.

## 8 October — revised Naqib duty roster (local, not applied live)
User replaces the old roster: girls 06–14 Alfi/Wanda, 14–22 Anggi/Fitrah, 22–06 Roqyal/Nurul; boys 01–09 Dai, 09–17 MUH. NOPAN MAULANA, 17–01 Yusuf. Nopan explicitly confirmed same as Novan Maulana AMD-SDM-0060; separate AMD-SDM-0059 not merged. New import v2 stores startMinute/endMinute per staff, supports different gender shifts and midnight dates, server rules use configured start. Old settings retain legacy times until import. Haikal/Melia/Fitriani omitted from new duty roster; only Naqib role retired, history untouched. Wanda/Fitrah use dedicated IDs if missing; reuse exact-name live staff if present, refuse multiple matches. Import Data button updated. Accounts still require provisioning after import; no accounts or live settings changed in this turn.

## 10 October — revised female duty pairs (local)
Latest user instruction supersedes 8 October pairs: shift1 Alfi/Wanda 06–14 WITA; shift2 Anggi/Nurul Asri Ramdhani 14–22; shift3 Roqyal/Fitrah 22–06. Existing staff IDs preserved; boys unchanged. Updated import package to naqib-duty-20261010-v3 and Import Data description. Midnight regression fixture now uses Fitrah. Not pushed or applied live.

## 10 October — guardian permits / dorm-head review (local)
- Replaced generic parent-permission form with shared student-permits workflow. Reference read: fajrulislam/wali/dashboard/perizinan.html and pimpinan/perizinan-santri.html.
- Eight guardian categories with 12/24/72-hour limits; medical control same day, WITA datetimes; destination, reason, trusted pickup name/relation/WhatsApp. Existing room placement determines DORM-PUTRA/DORM-PUTRI; missing placement blocks creation.
- Head Boys/Girls Dorm gets Persetujuan Izin Santri menu, corresponding dorm queue, immutable approve/reject note, approved return recording and late indicator. Guardian sees own linked students and decision/return history. No automatic absence or finance changes.
- Preserves parent/permissions/{year}/{student}/{request} history. Replaced broad parent write with wildcard for other branches plus scoped guardian creation / dorm-head decision / return rules. Existing broad root read unchanged, so do not claim record confidentiality isolation. Legacy forms without required metadata remain history, not upgraded automatically.
- Verified full suite 200 passed plus new server-rule-expression isolation test (3 permit model/rule tests passed). Simulated DOM submit→correct-head approval→guardian visibility passed. Not Firebase emulator or production QA.
- Not full Cahaya parity: linked UKS referral/home-recovery category and doctor's file attachment are not included; eight non-referral categories supported. Deployment (frontend + Firebase rules) pending; no live permits created.

## 10 October — unified shift hours, v4 (local)
Latest user replaces shift times with 00–08, 08–16, 16–24 WITA. Applied to both genders, retaining latest people/shift pairs. Updated naqib-duty package id to naqib-duty-20261010-v4 and Import Data summary. Fixed membership check for shift ending exactly 1440 (midnight), displayed as 24.00. Legacy config without explicit times retains old compatibility until import. No live settings written or push in this turn.

## 10 October — Naqib concept audit
See docs/NAQIB-AUDIT-2026-10-10.md. Implemented shift/day program cards + contextual attendance/report actions, home initiative quick action, prayer initial/final UI with late notes, six report indicators with four-condition scale, stable report key and existing record refill, detailed own report history. New regression checks for prayer finalization and report validation. Changes local only; not pushed/deployed. Outstanding gaps explicitly documented (usrah/gamification/configured initiative points/evidence verification, concurrency/server finalization lock, physical browser QA).

## 10 October — actual deployment diagnosis from screenshots
Screenshots show NEW program UI but OLD database duty config (20–04), plus generic Naqib home omitted workspace cards. Fixed home to render six workspace cards (assessment/self/case/discipline/history/guide), distinct from quick actions. Added regression assertion. Safari production Admin Import Data already serves v4 new shift package. User explicitly confirmed applying roster/access at action time; clicked Terapkan Piket Naqib/Naqibah, UI confirmed success. Proof /tmp/madani-piket-applied.png. Live duties/role sync applied, accounts still not provisioned. No fabricated attendance. Rules deployment/real Naqib save remains unverified.

## 10 October — Naqib program audit and roster cards (pending publication/application)
- Root cause Isya missing: source daily program combines Magrib/Isya in one 18–20.30 block, classified only by Magrib title. Tahajjud/Subuh likewise buried in Chating Time/Qobliyah titles. New dedicated Program Presensi Naqib import separates canonical entry points and rebuilds server program index without changing staff access or deleting old attendance/timetables.
- Latest user supersedes cleaning list: Tahajjud, Subuh, breakfast, Baris Transisi, Zuhur, lunch, Ashar, Maghrib, Isya, dinner, sleep check, plus Monday assembly and Saturday exercise. Isya explicitly confirmed 20–20.30 WITA. User confirmed breakfast06.10–07, lunch12–14, dinner20.30–21, sleep check starts22. Other prayer block start times from existing source. Cleaning excluded from Naqib attendance.
- Attendance follows Cahaya naqib/absensi.html: program cards → room/all boarding scope cards → names, status choices, search, present all, counts and save. All scope stays within duty gender; GEMA joins common programs, only transition delegated for SMP/SMK. Per-student initial/final status supports room-specific records mixed with all-roster view; unrelated room records preserved.
- New import button must be applied in live Administrator after publication. No live writes in this implementation/test stage. Service worker v76. Final concurrent-save server lock still outstanding from previous audit.

## 10 October — Naqib programs applied LIVE
User requested execution. Git main/origin-main both ff9208a, clean before execution; production Admin now serves the new Program Presensi Naqib import. Clicked Terapkan Program Presensi Naqib in authenticated Safari; success text confirmed. Reloaded Admin, schedule count increased 100→113. Filter DS-NAQIB read back all 13 canonical rows, including Isya20:00–20:30 all_boarding, Monday Apel/Saturday Senam07:00–07:50, transition07:50–08:00 units, and meals/sleep. No live attendance entered or staff permissions changed. New UI publication verified through production import; real Rokyal attendance save still not tested. User should refresh/reopen PWA.

## 11 October — Naqib teacher-style UI
Naqib now reuses Guru Mapel home card/icon components, with four quick actions and seven distinct workspace links including existing Naqib Teladan. Shared official header/role switch remains; all naqib routes receive back navigation, rounded panels/inputs and mobile spacing. Mobile cards compacted after Safari 390px preview exposed the last card near bottom navigation. Service worker v77. No database/rules/finance changes. Earlier role rendering 16/16 passed; full suite 206/207 (unrelated teacher leave Sunday Ahad/Minggu mismatch). Final syntax/40 JSON files/diff checks passed. Repeat DOM runner unavailable after environment dependency lookup (jsdom missing); production UI verification pending publication.

## 11 October — room reconciliation audit / partial LIVE repair
User supplied original girls room table again and asked to report database pupils without rooms. Read native Safari Admin room selectors. Makkah I had only Lulu' Amelina selected; restored 16 confirmed source girls, preserved Lulu, saved and triggered fresh assignment read via search input; 17 checked verified. Dinda missing from room picker; Data Santri confirms active but gender/boarding blank. Other rooms read: C2 17, C3 19, Cairo21, girls GEMA11/M3 14/P1 15/P2 16. Native UI girls summary says95 while AX exposes89 checkbox rows; do not claim exhaustive student audit. Report outputs/audit-kamar-2026-10-11.txt lists observed unassigned and source ambiguities.
Added safe audit/repair Import Data card + 139 source-confirmed rows (131 original +7 later-confirmed SMK +Bain). Preview/runtime exact normalized name or NISN, unique active master ID, unit/gender/NISN guards, missing/inactive assignment repair, conflict preserve, missing gender and confirmed boarding flag. No new students generated; no financial records touched. Package NOT applied live. Fix admin filtered-save data loss: persist entire target selection, mutate on checkbox change, retain hidden occupants; reject stale async picker render and disable save while reading. 10 targeted tests passed incl filtered-save regression, syntax and JSON valid. Publication pending, SW v78.

## 11 October — Habiburrohman confirmed single SMK identity (pending live)
User confirms SMP HABIBURRAHMAN AMD-SMP-0029 is incorrect duplicate of SMK Habiburohman AMD-SMK-0028, explicitly authorizes execution. Added Import Data identity action: strict unit/NISN/source checks, Cordova3 target placement, confirmed boarding flag, active groups moved preserving existing target membership; source student and class/room/mentor placements inactive. Backup of affected identity/placement records and group memberships stored under import marker; mergedInto/confirmedAliases retain traceability. SMK class/mentor, finance, parent accounts and historical attendance are not rewritten. Old history remains under original ID, not presented as consolidated timeline. Corrected room-reconciliation package to canonical SMK ID so it will not reintroduce SMP duplicate. Seven targeted tests + syntax/JSON/diff passed. Not applied live; requires publication then admin import click.

## 11 October — early Naqib attendance access
User asks access attendance before program time. Own-shift program cards now open upcoming program/room/student scenes via explicit allowUpcoming read mode. Save still uses strict real-time check and unchanged server rules; notice explains saving starts at scheduled time. Gender/day/shift guards unchanged. Added regression for upcoming read versus write and wrong shift/gender. Pending publication.

## 11 Oktober 2026 — Referensi desain presensi Naqib
Pilihan program, pilihan kamar (Seluruh Asrama sebagai kartu penuh), dan lembar kehadiran diperbarui sesuai tiga gambar pengguna: tosca/emas, ornamen masjid, ikon SVG, ringkasan enam kategori serta tombol status berwarna. Data/jam, scope GEMA, tahapan salat dan batas penyimpanan tetap memakai logika sebelumnya. Cache v81. 42 tes role/rendering/piket/program lulus dengan repository simulasi; pratinjau roster diperiksa pada desktop dan 390px. Belum diterapkan ke produksi. Sinkronisasi kamar live sebelumnya masih menunggu tombol manual pengguna; jangan anggap selesai hanya karena desain diperbarui.

## 11 Oktober — konfirmasi enam identitas putri dan nonasrama SD
Pengguna menyetujui Lukina/Lukiana, Restu, Tazzia/Tazia, Feby Efrillia/Feby Aprilia, Hidayatul/Huriatun Nazura, Salwa Salsabila SD/Salsabila SMP sebagai identitas sama. Canonical masing-masing AMD-SMK-0083,0084,0081; AMD-SD-0114; AMD-SMK-0031; AMD-SMP-0086. Paket Import Data Konfirmasi Identitas & Kamar Putri membaca master terbaru, preview sebelum apply, menonaktifkan duplikat dan penempatan kelas/kamar/mentor asal, menyalin kelompok serta mentor bila canonical kosong. Riwayat operasional/keuangan/akun wali tetap pada ID lama (belum konsolidasi histori dan saldo lintas ID). Delapan SD lainnya dalam rekap menjadi non_boarding dan penempatan kamar nonaktif. Backup hanya field terdampak. 3 tes model lulus. Belum live; perlu publikasi dan tombol Periksa/Terapkan Konfirmasi Putri.

## 11 Oktober — pilihan program/asrama satu layar
Pilihan program dan asrama memakai dua kolom dengan tinggi sisa viewport sampai navigasi bawah, header/kartu kompak, Seluruh Asrama ukuran satu sel. Daftar santri tetap scroll. 16 tes rendering lulus; pratinjau tujuh kartu pada 390x700 muat di atas navigasi tanpa tumpang tindih. Belum publikasi. Lima santri tanpa kamar: master lokal Asry (SMK), Hanna (SMP) boarding; Haiba (SMP), Ria dan Syarfana (SMK) non_boarding. Hanna ada pada halaqah Tahsin B sebagai “Hanna”, belum ada acuan kamar. Status live perlu diverifikasi sebelum mengubah lima siswa tersebut.

## 11 Oktober — Manajemen Data pimpinan (lokal, belum publikasi)

- Route `management-data`: Kepala Sekolah mendapat Kelas, Wali Kelas, Guru Wali, Personil, Santri. Kepala Asrama mendapat Kamar, Halaqoh, Pengurus, Santri. Master dan assignment yang sama dengan Administrator; tidak membuat database paralel.
- CRUD identitas/struktur; hapus berupa nonaktifkan dan dapat dipulihkan melalui Ubah. Kelas/kamar/halaqah berpenghuni harus dikosongkan/dipindahkan dahulu. Personil aktif/masih bertugas harus dialihkan dan akunnya dinonaktifkan terlebih dahulu. Penempatan dilepas dari assignment aktif, audit mencatat sebelumnya. Keuangan dan riwayat presensi tidak diubah.
- Editor peserta mempertahankan centang saat pencarian; perubahan per siswa memakai transaksi yang menolak editor basi. Batch bukan atomik seluruh roster; kegagalan menampilkan jumlah perubahan yang tersimpan dan meminta pemuatan ulang. Guru Wali SD tetap Wali Kelas, TK tanpa Guru Wali individu.
- Personil sekolah yang dapat diubah langsung memiliki tepat satu unit tugas dalam cakupan kepala sekolah. Personil lintas unit tetap melalui Administrator; kepala asrama berdasarkan gender. Halaqah tanpa gender eksplisit perlu diperbaiki Administrator sebelum muncul. Kepala Sekolah server memerlukan `roleScopes/head_formal_school/unitIds` (maksimal 16 unit).
- Akun baru melalui Firebase Auth sekunder, profil ditulis dengan role operasional terbatas. Akun lama harus memiliki `managementOwnerUid` kepala unit; pilihan Pengelola Akun ditambahkan ke Manajemen User Administrator. Akun dengan role pimpinan/keuangan/lintas kewenangan tetap admin. Pencabutan login berupa nonaktif; tidak menghapus Firebase Auth permanen. Tidak ada akun produksi dibuat/dialihkan pada pengerjaan ini.
- Rules menambah grants per-record untuk pimpinan, assignment tahun aktif, validasi role whitelist dan scope akun. Root read lama masih luas; tidak mengklaim isolasi pembacaan database. Rule tests adalah evaluasi ekspresi, bukan Firebase Emulator; Java runtime belum tersedia. Deploy rules + pengujian akun nyata diperlukan sebelum menyatakan aktif produksi.
- Tampilan tosca/emas diperiksa pratinjau desktop dan 390×844. Native dialog berada di atas navigasi. SW v84. Tes model/rules, UI roster dan wali kelas, role rendering, user management, JS/JSON perlu dijalankan sebelum commit.

## 11 Oktober — akses Manajemen Data produksi dan penempatan lama
- Firebase CLI berhasil menerapkan rules khusus Manajemen Data ke `madanilombok-f692d`: node students/staff/classes/rooms/groups per-record, empat jenis assignments, dan users per-UID. Paket dibuat dari rules produksi; cabang lain termasuk finance dipertahankan identik. Pembacaan ulang rules membuktikan hasil sama dengan paket. **Jangan menganggap seluruh database.rules.json lokal sudah dideploy**; file lokal masih memuat perubahan lain yang berbeda dari produksi. Backup/paket sesi berada di `/tmp/madani-rules-before-leadership.json`, `/tmp/madani-leadership-deploy.rules.json`, `/tmp/madani-rules-after-leadership.json`.
- Akun Muhammad Tuzri sudah memiliki Kepala Sekolah Formal scope SMP; tidak diubah ulang. Enam kelas SMP dan Wali Kelas lama terbaca. UI memakai assignment tahun aktif yang sudah tersimpan, bukan mengimpor ulang seed lama.
- Form mempertahankan pembina/Wali Kelas lama meski SDM lintas unit di luar CRUD personil; relasi tidak diam-diam berubah menjadi kosong. Guru Wali dengan siswa binaan dalam scope tetap tampil beserta jumlah binaan. Penambahan penugasan baru tetap memakai pemeriksaan scope.
- Transaksi menggunakan listener aktif hingga selesai, memperbaiki konflik palsu akibat cache kosong. Penyimpanan kelas 7 Putra melalui sesi Tuzri di pratinjau VS Code berhasil ke Firebase produksi (nama, Wali Kelas, dan anggota dipertahankan). Bukti `/tmp/madani-tuzri-save-success.png`. Bukan klaim semua operasi CRUD sudah diuji produksi.
- 51 tes lokal lulus: leadership model/UI/repository, role contracts/rendering, access rules; JS syntax dan diff whitespace bersih. SW v85.

## 11 Oktober — pintu masuk akun personil
- Data Personil/Pengurus menampilkan Tambah Personil dan Tambah Akun secara terpisah. Tambah Akun memilih SDM aktif dalam scope yang belum punya login; baris membedakan Buat Akun / Atur Akun & Role. Pembuatan memakai alur secondary Auth yang sudah ada; tidak membuat akun produksi selama pengujian.
- Checkbox role membaca role/roles/roleFlags lama, bukan roleFlags saja. Edit mempertahankan role utama yang masih dipilih dan scope penugasan role yang dipertahankan.
- Akun lama milik Administrator tetap memerlukan delegasi managementOwnerUid; akses pimpinan/keuangan tidak dapat diambil alih. Ini bukan perluasan rules produksi.
- 19 targeted model/repository/UI tests passed, syntax checks passed. SW v86. Publikasi kode masih perlu push; Git terminal sebelumnya belum memiliki kredensial.

## 11 Oktober — kepala unit mengelola akun unit sendiri
- Pengguna menegaskan hak pengelolaan dalam unit masing-masing. Akun operasional tertaut SDM dalam scope tidak lagi memerlukan delegasi managementOwnerUid sebelumnya. UID/SDM/email akun lama tidak dapat diganti untuk mengambil alih akun unit lain.
- Akun lintas unit dan role Admin/pimpinan/keuangan tetap dilindungi. SDM sekolah harus memiliki satu unit eksplisit; SDM asrama mengikuti gender. Tidak memberikan role Admin global kepada kepala unit.
- Referensi scope penugasan lama dipertahankan; referensi baru melalui payload akun ditolak, gunakan menu penempatan.
- 45 tes terkait lulus; syntax/diff bersih. Firebase dry-run valid dan deployment users/$uid berhasil. Cabang produksi lain dipertahankan dari snapshot terbaru. Paket /tmp/madani-unit-account.rules.json; backup /tmp/madani-unit-account-before.json. Belum uji perubahan role akun nyata melalui UI. SW v87; perubahan antarmuka perlu publikasi Git.

## 12 Oktober — kegagalan unduh modul login pada perangkat guru
- Screenshot menunjukkan dynamic import auth.js gagal sebelum kredensial diperiksa. Jangan menyimpulkan password/akun salah atau mengulang kredensial dari screenshot. Pemeriksaan HTTP publik: auth.js, repository.js, firebase.js mengembalikan 200 JavaScript, unduh Firebase Auth SDK gstatic berhasil dari mesin ini. Penyebab jaringan/cache pada HP belum terkonfirmasi.
- Service worker v88 hanya menyimpan respons sukses aset aplikasi/SDK Firebase; 4xx/5xx memakai cache valid bila tersedia dan tidak merusaknya. Endpoint Auth/RTDB eksternal tidak di-cache. Install gagal tidak dianggap berhasil, sehingga cache lama tidak dihapus oleh instalasi tidak lengkap.
- Pesan gagal impor modul dibedakan dari gagal autentikasi, dengan tombol Muat Ulang Halaman; tidak memuat ulang otomatis atau menyimpan kata sandi. Entry v44. Tujuh tes entry/worker lulus, syntax/diff bersih. Perbaikan belum dibuktikan pada HP pengguna dan perlu push untuk produksi.

## 12 Oktober 2026 — fitur utama Kepala Sekolah / Kepala Asrama

Implementasi dan batasan: `docs/LEADERSHIP-MONITOR-2026-10-12.md`. Menu tujuh/enam fitur, laporan presensi kanonis, mentoring mingguan, konselor, izin Naqib per gender, piket dan mukim. Isolasi baca server lama belum tuntas; filter tampilan bukan pengganti aturan baca. Paket aturan terbatas disiapkan di `/tmp/madani-leadership-monitor.rules.json` dari backup `/tmp/madani-leadership-monitor-before.json`. Status publikasi harus diverifikasi, jangan asumsikan aturan sudah diterapkan dari file lokal.

Paket aturan terbatas tersebut akhirnya berhasil dirilis (Firebase CLI Deploy complete, 12 Oktober). 68 pengujian lokal lolos. Frontend tetap memerlukan push; isolasi baca server menyeluruh dan uji akun produksi belum selesai.

## 12 October — premium shared UI and latest home reference

See `docs/PREMIUM-UI-2026-10-12.md`. Shared operational design system plus a single home composition across 15 roles, preserving Madani colors. Complete permitted menu and prior summaries accessible through Semua Menu. Responsive full user name via `home-name.js`, shrinking/wrapping after font load and resize. SW v90. Local tests/viewport checks pass; no live data/rule writes. Verify Git publication separately.

### Interior design correction
User rejected plain inner panels. V91 adds structured leadership report visuals (ring/stats/filter/status rows), shared page component iconography and premium specialized headers/forms. 37 tests pass, including period filtering and scoped report counts. See premium UI doc. Production still requires Git publication verification.

### Mobile quick-card spacing (v92)
Increased mobile quick-grid gaps to 14px (12px on short screens), balanced inner padding, removed subtitle clutter on mobile, moved arrows above title. Shared by all homes. Teacher home visually verified at 360×640 and 390×844: no label clipping or bottom-nav overlap. 33 rendering/role tests passed. No workflow changes.

### Corrected actual quick-card overlap (v93)
Reproduced head_boys_dorm at 400×800: CSS gap14 but actual gap -3.5px because 90px card minimum exceeded 72.5px grid tracks. Expanded compact viewport breakpoint and assigned a separate middle-height row budget. Browser measured 20 combinations (5 roles × 360×640/400×800/390×844/414×896): actual gap12–14px, no label clipping or bottom-nav overlap. This was a sizing defect, not a publication/cache issue.

### Quick-card functional subtitles (v94)
Every quick card displays a concise functional subtitle, with route-specific descriptions for leadership, counselor, finance, parent, Naqib, health and Quran shortcuts. Mobile card layout places icon beside title and subtitle below, keeping existing row gaps. All 15 homes checked at 360×640: subtitle visible and title/subtitle within card bounds. 33 tests pass.

## 13 October — live Naqib account reconciliation
Read only scoped production madani_app/settings/naqibDuty, users, staff and targeted Firebase Auth lookups. Active schedule has nine staff (3 putra/6 putri). Seven existing profiles and Auth logins already matched shifts/gender. Created missing wanda@madani.app (AMD-SDM-WANDA, P/shift1) and fitrah@madani.app (AMD-SDM-FITRAH, P/shift3), then wrote only their two new user profiles. Readback: exactly one active Naqib login per scheduled staff, zero extra Naqib roles outside roster; every old profile unchanged. Haikal was already stripped of Naqib; Yusuf active shift3 as user reconfirmed. Random initial passwords delivered in user's Downloads/Akun-Naqibah-2026-10-13.txt (not in repo). No attendance, finance, or schedule writes. Authentication existence/enabled status verified; no end-user browser login test. This is already live and needs no Git push.

## 13 October — administration-only navigation
Admin and Super Admin homes, sidebar and All Menus now expose Master Data, Accounts & Roles, Import, Validation, deposit administration and profile/messages/guide only. Shared premium home and per-card subtitles retained. Bottom Data shortcut replaces work schedule for these roles. Administrative links open existing protected admin pages; import deep-link now works. Role switching still uses assigned roles. This is navigation separation, not revocation of existing admin operational/finance permissions; finance modules, database and rules unchanged. 34 role/rendering tests, changed-JS syntax, 41 JSON files and diff checks passed. Cache v95. Production publication and browser visual verification pending.

## 13 October — Salwa SD restored LIVE
User reversed the earlier identity confirmation. Restored AMD-SD-0130 SALWA SALSABILA to active, removed mergedInto AMD-SMP-0086, reactivated existing CLS-SD-6 placement in TA-2026-2027-GANJIL, removed only the two SALWA aliases on Salsabila SMP. Readback verified all five fields. Salsabila SMP and her room remain intact; Salwa boarding/group/finance/history records unchanged. Class roster excludes merged identities, so restored identity is eligible again. Production UI login not exercised. Local room reconciliation now excludes Salwa from merging; three targeted tests and syntax pass. Publish this protection before rerunning the old girls reconciliation package.

## 13 October — pondok learning report ownership
Tahfiz and group-based Arabic/pondok learning excluded from school attendance and management learning/material/score evidence. Boarding student reports combine final Naqib program attendance and final group learning sessions, preserving per-gender student scope and GEMA exclusions. New dorm teacher attendance/punctuality views read teaching_attendance and synthesize the same group/Quran schedules as teaching pages for missing attendance checks. Formal class Arabic stays school-owned. Classification follows group, teaching target, canonical pondok subjects and legacy synthetic schedule IDs. No records moved/deleted; no live writes or rules changes. 39 model/role/render tests pass; JS syntax and 41 JSON validations pass. SW v96. Publication and real-account production verification pending; UI filtering does not establish server read isolation.

## 13 October — GEMA mentor and evening attendance LIVE
User confirms Ahmad Budiawan Alkhair = Budiawan Khaer and retains existing afternoon/night windows. Linked active GEMA Ziyadah putra group to AMD-SDM-0014 (existing active khaer@madani.app already has mentor role); updated only mentorStaffId/mentorStaffIds/mentorName. DS-2026-GEMA-11 and -13 attendanceRole changed to mentor_tahsin_tahfiz; times 15:30–17:00 and 18:00–20:30 untouched. Readback and teacherSchedules verify both slots on all seven days for all four GEMA groups. Canonical Naqib prayer programs and all attendance history unchanged. Morning import package carries the five-field correction for reapplication. Six targeted tests pass. Live data is active without Git push; no actual attendance saved or end-user UI login tested.

## 13 October — Kepala Asrama daily Quran report card
Added dorm-quran-daily to both dorm leader homes and menus. Reads canonical academic/quran_records for active year, filters canonical boarding students by gender and dates (default today, seven-day shortcut), shows unique pupils, submission count, recording mentors, halaqah/room, activity/type, portions, quality/result, score and notes. Includes Ziyadah, Murojaah and Tahsin with explicit labels; counts records, not inferred absence. No writes or rules changes. 40 model/route/rendering tests pass including populated Quran report, gender exclusion, historical date filtering, no writes and visible home card. Syntax/JSON checks passed. SW v97. Frontend publication and real-account production verification pending.


## 13 Oktober — Kartu Pantau Operasional Harian
- Beranda Kepala Sekolah: kelima pemantauan guru/siswa dan mentoring tampil di kartu cepat.
- Beranda Kepala Asrama putra/putri: tujuh kartu untuk kehadiran/kedisiplinan santri dan pembina, setoran tahfiz harian, konselor, serta ibadah personil.
- Judul bagian menjadi “Pantau Operasional Harian”; role lain tetap memakai empat kartu dan judul sebelumnya. Tata letak pimpinan memakai tinggi alami dan jarak kartu, bukan batas empat kartu.
- Tidak mengubah sumber laporan atau cakupan akses unit. Cache v98. Validasi lokal: syntax JavaScript, JSON, role/route dan rendering/monitoring; belum dipublikasikan atau diuji di produksi.


## 13 Oktober — Proporsi kartu pemantauan
- Kartu pimpinan diperkecil dari minimum 130px ke 108px, padding 13px, jarak 12px, judul 13px dan ikon mobile 24px.
- Layar sempit memakai judul 12px dan jarak 10px. Teks tetap utuh, tinggi kartu dapat berkembang; tidak dipotong untuk memaksakan satu layar.
- Cache v99; perubahan tampilan lokal, tanpa perubahan data atau akses.


## 13 Oktober — Gabungan kehadiran dan kedisiplinan
- Kartu cepat kehadiran/kedisiplinan digabung per sasaran: guru, siswa, santri, pembina/guru pondok. Kepala Sekolah kini 3 kartu; Kepala Asrama 5 kartu.
- Halaman laporan memiliki pemilih Kehadiran/Kedisiplinan dengan periode tanggal tetap saat berpindah. Route kedisiplinan lama tetap berfungsi.
- Tidak mengubah perhitungan, rekam, atau cakupan unit. Cache v100. Uji rendering mencakup pergantian mode dan tanggal.


## 13 Oktober — Ibadah personil di Menu Lainnya
- Absensi Ibadah Personil dipindahkan dari kartu cepat ke Menu Lainnya Kepala Asrama putra/putri. Empat kartu cepat khusus pemantauan tetap tersedia.
- Fitur dan hak akses tetap aktif; cache v101.


## 13 Oktober — Kartu tidak tertutup navigasi
- Perbaikan akar clipping: portal-content beranda pimpinan sebelumnya overflow:hidden meskipun isi tinggi otomatis. Kini konten dapat digulir dengan area viewport berakhir di atas navigasi bawah.
- Header, greeting, kartu cepat dan menu mobile dipadatkan proporsional. Layar kecil atau teks besar tetap dapat menjangkau semua kartu. Cache v102.


## 13 Oktober — Status absen akhir shalat Naqib
- Penyebab: semua rekam tersimpan termasuk AWAL mengunci radio status. Kini hanya FINAL mengunci pilihan.
- Absen akhir dapat mengganti Hadir/Terlambat/Sakit/Izin/Alfa; catatan terlambat tetap wajib saat finalisasi.
- Snapshot initialAttendance mempertahankan status/catatan/petugas/waktu awal, termasuk fallback dari rekam AWAL lama. Tidak mengubah data produksi. Cache v103.
- Uji alur AWAL Hadir ke FINAL Terlambat, semua pilihan bisa diklik, validasi catatan, snapshot awal dan kunci FINAL.


## 13 Oktober — Lingkup konselor dan personil asrama
- Konselor memakai roleScopes.konselor (fallback scope akun) untuk gender; scope kosong menampilkan nol santri/kasus. Repository memeriksa gender sebelum operasi penanganan.
- Satu filter personil untuk pembinaan, daftar personil, pengaturan mukim dan ibadah: SDM aktif dengan gender sesuai kepala asrama dan akun naqib/pembina tahfiz/konselor atau guru mapel tertaut kelompok Arabic aktif. Guru formal murni/guru wali murni tidak termasuk. Riwayat pembinaan juga disaring berdasarkan personil yang berhak.
- Uji 41 existing + 2 scope tests lulus. Cache v104. Tidak mengubah akun/data/rules produksi.
- PENTING BELUM TUNTAS: database.rules.json masih memiliki .read pada root madani_app untuk semua akun aktif. Pembatasan UI/repository bukan isolasi database. Pengamanan penuh perlu migrasi pembacaan per scope beserta aturan baca granular; jangan mengklaim akses Firebase lintas unit sudah tertutup.


## 13 Oktober — Mobile tanpa geser horizontal
- CSS bersama: tabel berlebar tetap menjadi rekam vertikal di bawah 700px; formulir, filter dan tombol membungkus; media dan input mengikuti lebar kontainer.
- mobile-layout.js menambah label kolom pada tabel dinamis tanpa mengganti kontrol/event handler. Dipasang pada 13 entry HTML ber-brand-theme; dicache SW v105.
- Validasi: 41 role/route/render tests + 1 test label tabel lulus. Chrome headless profil terpisah memeriksa 400 fixture halaman/role pada 320px dan 390px (800 pemeriksaan), tanpa area horizontal-scroll maupun elemen terlihat melampaui viewport. Fixture memakai data uji, bukan audit seluruh kondisi data produksi/modal terbuka.


## 14 Oktober — Jenis setoran Muroja’ah
- Pilihan jenis setoran: Muroja’ah 1, Muroja’ah 2, Muroja’ah mahir, Muroja’ah 40 kali, Muroja’ah mutqin, Tasmi’.
- Pilihan disimpan di subtype dan ditampilkan pada riwayat; laporan harian Kepala Asrama sudah membaca subtype. Rekam lama tidak diubah.
- 29 pengujian teacher UI lulus, termasuk simpan/baca keenam jenis. Cache v106.


## 14 Oktober — Kelengkapan daftar personil asrama
- Jadwal, pengaturan mukim, dan presensi ibadah mengenali role array/map/roleFlags serta gender dari SDM atau penugasan akun/piket saat SDM belum mengisi gender. Konflik scope tetap tidak dimasukkan; gender SDM eksplisit menjadi acuan utama.
- Pengaturan mukim juga mencakup SDM tim asrama tanpa akun berdasarkan appRoles/piket aktif, tanpa membuat akun baru. Guru formal murni tetap dikecualikan.
- 25 uji lulus: tiga Naqib putra tampil pada ketiga halaman meski dua SDM belum memiliki gender; Naqib putri tidak ikut. Ini verifikasi fixture, bukan verifikasi kelengkapan akun produksi. Cache v107.


## 14 Oktober — Penggabungan Mu’ammar / Muammar (produksi)
- Pengguna memastikan satu orang dan memilih muammar@madani.app sebagai akun utama. UID F2a6JMPHypUmSbXo5E23pwTcYvM2 kini tertaut AMD-SDM-0051 dengan role guru_mapel, mentor_tahsin_tahfiz, guru_wali serta gabungan penugasan.
- Akses profil ammar@madani.app dan tahfiz@almadani.app dinonaktifkan (active:false/accessRevoked:true/replacedByUid). Firebase Auth tidak dihapus.
- SDM placeholder AMD-SDM-0052 ditandai inactive/mergedInto AMD-SDM-0051. Identitas lengkap sekolah menjadi kanonik. 18 referensi penugasan/rekam ditautkan; riwayat tidak dihapus. Patch 44 path berhasil; baca ulang memverifikasi akun, SDM, halaqah dan siswa binaan. Tidak mengubah keuangan.
- Sumber master/impor dan rencana akun lokal diselaraskan agar tidak membuat duplikat lagi. Backup scoped dan patch berada /tmp/muammar-merge; jangan commit berkas tersebut karena berisi profil personil.

### 14 Oktober — akun Wisnu aktif
Dibuat wisnu@madani.app untuk SDM-20261008073805-3WHP, role Konselor Pemula putra, mentor_tahsin_tahfiz kelompok GRP-2026-quran-L-yusuf, guru_mapel kelompok GRP-2026-arabic-L-gema. Mentor kedua kelompok dialihkan ke Wisnu; scope kelompok Bahasa Arab tersebut dicabut dari akun Muhasim, tugas lainnya dipertahankan. Login Auth dan readback profil berhasil. Password tidak disimpan di repository.

### 15 Oktober — sesi sore/malam seluruh halaqah
User confirms all halaqah including Wisnu/Tuzri use 15:30–17:00 and 18:00–20:30 WITA. Live DS-2026-GEMA-11 and -13 now quranAllGroups=true. quranLessonSchedules honors flag for all assigned Quran groups; unchanged IDs preserve GEMA history, no duplicate sessions, early GEMA sessions remain exclusive. Seed and import aligned; SW v108. 26 targeted schedule/route tests pass with --experimental-vm-modules, syntax and changed JSON validated. Code must be published before new flag is recognized in production.

### 19 October — Admin seven data workspaces
Reorganized admin/index.html into Santri, SDM, Sekolah, Asrama, Jadwal Pelajaran, Jadwal Program Keasramaan, Manajemen User. Existing database paths and account manager reused. Nested tabs preserve years/import/validation/GPS. Direct Atur Peserta on class/room/group opens current assignment roster. Quran/Arabic schedule editors use schedules/daily with explicit group target; teacher generators honor target and unique new Arabic session IDs. Independent naqibAttendance/naqibReport flags control lists and write rechecks, preserving legacy default policy; schedule+Naqib index updated atomically by Admin. Existing unknown master fields retained on form saves (old editor replaced entire records). No live data writes/migration; finance untouched. 29 targeted/admin/route tests plus 58 workflow tests passed (one admin test overlaps); 41 JSON files and changed JS syntax valid. Mobile 390px preview verified in headless frame; direct headless screenshot cropped a 500px minimum viewport, not actual overflow. SW v109. Needs publishing and real-account production validation. Account removal remains existing revoke-access flow, not Firebase Auth deletion.

### 19 October — correct portal Admin home entry point
User screenshot showed app/index.html still had four legacy shortcuts: prior work updated admin/index.html only. Admin and Super Admin portal now share seven workspace titles/descriptions/destinations with admin-workspaces.js. Dedicated route grants lead directly to current entity tabs/accounts. Import/validation remain secondary tools; deposit operational shortcut removed from admin presentation only, permissions/finance preserved. Admin home no longer caps cards at four; natural grid height plus scrollable mobile content prevents overlap from legacy fixed viewport rows. 43 isolated tests pass (including both homes, clickable seven cards and role contracts); JS syntax/41 JSON/diff checks pass. 390px local mock preview verified, no live DB writes. SW v110; requires publishing/reload and production verification.

### 19 October — one Admin navigation, retire legacy editors
Removed Master Data/Import/Validation portal entries and grants, separate admin data dashboard and old import/prepared-update UI. Admin data console defaults to students; unknown/old import sections resolve there. Portal home is the sole Admin home, with seven data destinations. Account manager sidebar now uses the same seven destinations; removed bootstrap shortcut. Legacy validation.html is redirect-only to canonical Data Santri; removed unused validation.js editor. Existing database records, placement forms and finance left intact. 44 isolated tests pass, changed JS syntax and 41 JSON valid. No live writes or deployment. SW v111.

### 20 October — Admin reference UI
Applied shared tosca/ivory/gold styling to all seven Admin workspaces, entity/placement forms and account manager. Portal Admin menu uses reference 4+3 desktop tile layout, final full-width mobile User tile. Entity pages have mosque hero, actual-data summary, labeled mobile card rows, read-only Detail action; Santri has unit/status/boarding filters with live count. User manager adds real total/active/multi-role/used-role metrics and mobile field labels. Shared bottom navigation on data/accounts pages. No sample names/counts or fabricated growth percentages copied into live UI; no live writes. 53 isolated tests passed including filter/detail, CRUD metadata preservation, assignments and user role workflows; changed JS syntax/41 JSON/diff checks passed. Desktop1440 and mobile390 mock previews inspected. Preview logo path in exported fixture is relative, production markup retains original correct logo path. SW v112; publish and real-account visual validation pending.

### 20 October — boarding program schedule follows Cahaya 24-hour concept
Read reference fajrulislam/admin/database.html and js/admin-master-v2.js (program cards, time/day, active/attendance/report flags, CRUD). Madani programs workspace now opens Jadwal 24 Jam first; master names/categories remain secondary tab. Cards join existing programs + schedules/daily, sort start time, search name/category/time, filter status/day including everyday schedules. Summary counts and flags use naqibProgramEnabled runtime policy, not guessed defaults. Existing editor keeps year, time, scope, target, active status and independent attendance/report flags. Schedule deletion also clears Naqib duty index atomically; no attendance history deletion. 23 targeted UI/model/route tests pass incl daily inclusion/search/flags/form, JS syntax and 41 JSON valid. SW v113. Local implementation only, no live writes or publish. Multi-day remains existing per-day records/Setiap Hari representation, not Cahaya schema migration.

### 20 October — per-role feature management
Added eighth Admin workspace Manajemen Fitur in portal and console navigation. Lists deduplicated existing menu features for each role; checkboxes write settings/featureSwitches/<role>/<dot-to-tilde-key> booleans plus actor/time audit via existing admin-only settings write permission. Portal loads config before rendering; canAccess intersects baseline grants with switches, denying direct routes as well as menus. Does not expand role grants or enable disabled holiday/KPI routes. Core dashboard/admin/profile/guide and protected finance/deposit functions remain enabled. Changes take effect on reload; no live listener or server-side per-feature revocation of existing data permissions is claimed. Data/roles/history preserved. 46 isolated tests pass including per-role restriction/reactivation, locked core, no escalation, and editor save patch. Syntax/41 JSON valid. SW v114. No live config writes or publication.

## 20 October — counselor attendance review and stalled reads
- Kasus Masuk previously read only `boarding/cases`, with no attendance feed. Added a counselor-only review panel for final Alfa/Terlambat from Naqib program attendance and teacher learning sessions. It filters the counselor gender, excludes SD, merged/inactive students, preliminary attendance and delegated GEMA rows. User chooses to create a clarification report; no automatic violation points. Deterministic create-only IDs prevent duplicate reports, and source attendance is re-read before creation to reject corrected records. Created reports use the existing shared case/claim/handling workflow.
- Repository reads now have a 15-second deadline; route session/context creation is inside the route error boundary. This prevents an indefinitely pending Firebase read from leaving the workspace spinner forever. It is mitigation, not a confirmed diagnosis of Dai's production account. Actual Dai/Wisnu authenticated production flows remain to be retested after publication.
- Safari Administrator live read showed the old Admin UI. Live SDM search confirmed 7 active vice-principal duty records: Arniati, H. Habiburrahman, Hamzah Fansyuri, Husnul Hatimah, IIN ZURIMA ADRIANI SAPUTRI, Mu'ammar, Munawarah Nazari. No dedicated vice-principal app role is defined; do not infer a specific vice-principal school from multi-unit staff affiliations.
- No production data written. 57 targeted tests pass (role rendering/contracts, counselor, Naqib policy/duty and new attendance/deadline tests), including gender filtering, final-only records, corrected-record rejection and shared case creation. SW cache v115. Publication and account-specific production verification pending.

## 20 October — Kontrol Mutu Pendidikan
- Added read-only school-quality route in the Kepala Sekolah menu and feature catalog, with eight quality sections, period/gender/teacher/student filters. Existing unit scope is retained; no finance collections read, no production writes.
- Live-source integrations: teaching attendance with completed schedule denominator, approved leave and calendar breaks, formal plus final Naqib attendance (separate and weighted combined), final exam KKM, exact-exam teacher followups, proven counseling categories and case handling, daily accumulated Quran lines against current targets, latest mentoring character answers and mentoring reach, classroom-linked observations and curriculum availability.
- Unavailable standards/sources explicitly labeled: teacher modules, mandatory individual mentoring frequency, group mentoring, school-scoped boarding observation rubric, complete RPP/syllabus inventory, sarpras/management/financial quality standards. No fabricated composite score. Quran denominator covers recorded days with targets, not all obligated days; current targets do not provide historical target snapshots. Full definitions in docs/EDUCATION-QUALITY.md.
- 52 targeted tests pass (model, role/route/rendering, existing leadership monitor). All 136 JS syntax checks, 41 JSON validations and diff whitespace check pass. Local 390px mock render inspected; filter later collapsed to reduce mobile height and render test rerun. SWv116. Commit local; publication and real-account production validation pending. Root database read isolation gap noted earlier is unchanged.

## 20 October — quality on demand / data saver
- Quality home renders eight modern cards immediately with zero indicator reads; each category opens individual indicator cards, also without reads. Clicking a specific indicator loads only its source dependencies. Empty-source readiness indicators never download records. In-page source caching prevents repeated reads on filters, back/reopen, and shared-source indicators; explicit refresh touches only active dependencies. Rejected reads are evicted for retry; revision token prevents late results from replacing navigation.
- School quality is first quick action (four school quick actions total); other existing shortcuts retained. Shared brand cards responsive at390px, tosca/gold; app theme v95, SWv117. Selected sources still fetched per year, not server-side date pagination. No production writes.
- 53 tests passed covering exact read paths, zero reads on initial/category pages, caching, refresh, retry and back-navigation race plus existing quality/role/monitor regressions. Mobile mock card layout visually inspected. Publication pending.

## 23 October — reported resident save denial / report validation error
- Resident staff and staff worship payloads omitted academicYearId, although existing RTDB validation requires it to equal the year path. Both now include ctx.yearId on creates/updates. Unchecked residents without saved records are skipped. No permission rules relaxed or changed. Existing canonical-gender requirements still apply; production account/data verification not performed.
- Teacher case form previously validated empty reportSource against the student list before required-field checks, incorrectly displaying “Santri tidak tersedia dalam master aktif” even for a valid selected student. Required source now gives an actionable direct-report instruction; invalid reported-student and source-student errors are distinct. Selection and entered text remain intact on validation failure.
- 75 targeted UI/role/workflow/rules tests passed, plus new RTDB validation-expression regression (3 rules tests pass including the added test): missing/wrong year denied and matching year accepted. Changed JS syntax, all 41 JSON and diff checks passed. These are isolated fixtures/rule-expression checks, not production/emulator verification. SWv118; publish then retry the two real accounts. No live records modified.

## 25 October — dorm head audit (partial; account clarification pending)
- LIVE Safari Administrator: changed canonical Shalat Maghrib Berjama’ah schedule from18:00–20:00 to19:00–20:00 WITA; readback confirmed active, both genders, attendance/report enabled. Other combined GEMA/Quran blocks and historical records untouched. Canonical local generator matches19:00.
- LIVE account inspection: maulana@madani.app listed Naqib; nopan@madani.app listed Pembina Tahfiz. fitrah@madani.app active, linked SDM Fitrah, Naqib with putri scope. yusuf@madani.app active multi-role, primary Guru Mapel, Naqib scope blank, linked YUSUF; canonical staff gender Putra. fahri@madani.app already Pembina Tahfiz; effendi@madani.app Guru Mapel. Asked user which emails Novan/Fahri Husein use and exact Yusuf/Fitrah error. No account/password/role changes made. Account preview incorrectly also labels Fitrah as ready to create; don't use bulk provisioning to resolve login.
- Replaced old Naqib single-student report with existing shared rich report, compared against fajrulislam/naqib/kedisiplinan.html: multi-student, source, three categories, chronology, compressed optional photo, critical flag. Adds legacy reportedBy/reportedByRole alongside current identity fields so Naqib evidence counts recognize reports. Existing SD Wali Kelas versus non-SD counselor routing preserved. Not a claim of complete counselor parity.
- Mukim preflight identifies canonical SDM gender mismatch or existing resident scope collision before writes; no guessed gender writes and no partial resident writes from these known validation issues. Resident rules now consistently recognize roles/<head_role> map as elsewhere; same-gender boundary retained. Public production staff-worship.js already includes prior academicYearId fix, verified read-only curl; new rule/preflight not deployed and original reported failure not reproduced under head account.
- 51 targeted role/render/Naqib/rule-expression tests pass; changed JS syntax,41JSON and diff checks pass. Wider teacher suite had one unrelated date-sensitive teacher-leave assertion (Sunday fixture produces zero lessons); 74/75 passed before new tests. No emulator/actual end-user login or attendance write tests. SWv119. Needs publication + rules deployment and account-specific follow-up; no test attendance written live.

## 27 October — Novan canonical login correction (LIVE)
- Latest user instruction supersedes earlier opposite choice: retain nopan@madani.app, revoke maulana@madani.app. Safari Administrator updated retained account display name to Novan Maulana and linked SDM Novan Maulana; replaced erroneous Pembina Tahfiz role with Naqib, primary Naqib, gender scope L. Saved UI readback verified active Naqib Putra.
- Revoked maulana@madani.app through recoverable Cabut Akses. Reloaded user list confirms Akses dicabut and active account count dropped93 to92. Auth account and operational history retained; no password changes. No application code changes or publication required.
- Actual Novan login and duty/attendance write not tested. Existing duty seed links Novan AMD-SDM-0060 shift2 08:00–16:00; no live duty changes made. Old separate SDM Nopan remains; no master/operational record merge claimed.

## 27 October — remove Quran program Admin tab
- Removed Program Al-Qur’an Santri tab from Data Asrama as requested. Legacy quran-placements navigation opens Peserta Halaqah. Existing Quran placement records and academic workflows retained.
- 23 admin/role tests pass; changed JS syntax and repository JSON validated. SWv120. Local change only; not published.

## 27 October — location popup refresh loop
- Startup/visibility checks no longer acquire GPS; granted permission or stored readiness silently skips onboarding. Nanti/Escape persists a deferred choice across refresh. Attendance location validation remains unchanged and explicit failure events still show recovery guidance.
- Explicit request has a10s watchdog even if geolocation callbacks hang; failures show Coba Lagi instead of suggesting the app can enable device GPS. Late callbacks cannot change a settled request and dismissal suppresses a pending request error popup.
- 23 location/role tests pass (including refresh, no startup GPS, timeout/retry and late callback), JS syntax and41JSON valid. SWv121. Not pushed/deployed; actual device OS-location failure not reproduced.

## 27 October — role menu placement editor
- Feature manager requires explicit role selection before showing controls. Separates enabled feature gates from Akses Cepat, Menu Lainnya below quick cards, Sidebar and three configurable Bottom Menu slots. Beranda remains centered and Lainnya opens sidebar; unused slots retain spacing.
- Role-scoped settings stored under existing settings/featureSwitches/<role>/_menus with audit in same patch; existing settings admin authorization reused. Portal home/sidebar/bottom rendering and bottom clicks consume settings, intersecting role grants and feature gates. Missing configuration retains existing UI; configured other menus are not silently truncated to eight. No live settings writes or role grant expansion. Admin standalone data-console navigation remains its dedicated administration navigation.
- 48 isolated model/role/render tests passed incl role-first UI, per-role save, empty selection, forbidden route injection, quick/other click targets, disabled feature exclusion and bottom-route validation. Changed JS syntax, JSON and whitespace valid. SWv122; not pushed/deployed; production/browser visual verification pending.

## 27 October — Admin home reference refresh
- Admin/Super Admin home now uses a wide tosca mosque greeting without the duplicate home brand/top bar, overlapping date strip, eight main tiles in4x2 at wide desktop,2-column narrower layouts, and horizontal account cards (stacked on phone). Existing Madani mosque/logo assets retained rather than replacing branding.
- Main tiles gain route-specific icons, decorative icon watermarks and white arrow actions; gold accents limited to school/dorm cards. Existing per-role menu placement and click handlers preserved. CSS scoped to Admin home; other role layouts unaffected. Themev96, SWv123.
- 47 isolated home/menu/role tests pass, changed JavaScript syntax/JSON/whitespace valid. No live data writes or push. Actual browser visual comparison pending; illustration reuses existing SVG and is not pixel-identical to reference artwork.

## 27 October — Admin fixed viewport refinement
- Admin home uses bounded grid rows for greeting/date/main menus/account menus with bottom-navigation space reserved on mobile. Main titles use900weight, compact cards keep8 destinations visible in4x2 desktop or2x4 narrower layouts. Short narrow screens hide descriptions/arrows to prioritize full menu titles. Date moved outside greeting for reliable row sizing.
- 30 isolated menu/home tests passed and syntax/diff checks valid. Themev97/SWv124. Local only; actual browser size/zoom verification pending.

## 27 October — Admin mobile brand header restored
- At widths<=900px, show existing shared Madani logo/bell/avatar header and reserve its own row in fixed Admin home grid. Desktop header remains hidden. Narrow320–360px styling reduces brand text/spacing. Existing actions unchanged. Themev98/SWv125; syntax/diff checks pass, browser visual verification pending; not published.

## 27 October — unify violation reporting across internal roles
- Replaced legacy teacher-case workspace form used by dorm heads and other internal roles with renderTeacherReport, the same form used by Naqib. Existing route authorization retained. Shared form supports multiple students, source, category, chronology, optional compressed photo and critical flag; preserves reporter identity and SD homeroom/non-SD counselor routing without formal point assignment.
- Removed duplicate legacy form logic/imports. Tests now submit shared reports for every authorized internal role and verify role identity, active roster and counselor queue payload. 44 role/render tests passed plus school-case routing tests; syntax/JSON/diff checks valid. SWv126; local only, not published, no production report writes.

## 27 October — Dorm head home reference UI
- Dedicated premium-dorm-home class for both dorm heads; shared school/Admin styles unchanged. Desktop greeting without duplicate brand/topbar, mobile retains brand/bell/avatar, mosque greeting with quote and date strip. Four monitoring cards arranged2x2 with tosca/gold gradients, contextual icons, mosque overlays and arrow actions; other menus4-column desktop/mobile, compact vertical mobile tiles. Existing menu config, role scope and action handlers preserved.
- Reuses original Madani mosque SVG, not exact raster reference artwork. 46 isolated menu/role/render tests pass; syntax/JSON/diff checks pass. Themev99/SWv127. No production data or push; actual browser visual verification pending.

## 27 October — shared case report reference UI
- Shared report form now has tosca mosque banner, numbered sections, two-column desktop and one-column mobile layout, student search cards/selection count, source and category buttons, chronology, photo evidence and critical flag, and clear submit footer. Uses existing Madani mosque SVG. Applies to Naqib and all roles routed to renderTeacherReport.
- Kept canonical source/category values and existing report payload/routing; optional photo still image-only <=12MB compressed. No placeholder draft action or unsupported document upload added. Time/location remain part of chronology. No database writes during testing.
- 46 role/render/routing tests pass including search/no results, source/category selection, selected count and multi-student submission. JavaScript syntax,41JSON and diff checks pass. Themev100/SWv128. Local only, not pushed; actual browser visual comparison pending.

## 27 October — all-role fixed home viewport
- Removed eight-card truncation from default other menus; all enabled home destinations now render (explicit menu settings still honored). Shared fixed viewport layout reserves bottom navigation on mobile, keeps mobile branding, uses adaptive compact cards across all roles and separates date strip consistently.
- New home-viewport.js observes available size and proportionally fits overflowing home content without removing menu titles/actions; font loading and viewport resize recalculate fit. Very dense roles on small screens necessarily have smaller controls. Only home is fixed; workspace forms/lists retain scrolling.
- 46 menu/role/render tests plus viewport resize/fit unit test pass, syntax/diff checks pass. Themev101/SWv129. No live data changes or push; browser/device visual verification pending.

## 27 October — searchable student reporter and responsive categories
- Choosing Santri report source reveals a search card instead of a long select. Two-character minimum, up to six matching result cards, refine/no-match guidance, persistent selected reporter card and clear action. Switching to direct source clears student selection; unchanged payload validates the chosen active student and saves sourceStudentId. Shared form applies across reporting roles.
- Category cards use equal three-column desktop layout with consistent icon/title spacing and a container query switching to horizontal one-column choices when the form column is <=430px (including narrow desktop/mobile).
- 46 role/render/routing tests pass, including reporter search/select/clear/source switch, cross-unit reporting and submitted sourceStudentId. Syntax/diff valid. Themev102/SWv130. Local only; not pushed, no production data writes; browser visual verification pending.

## 27 October — search-first reported students
- Santri Terlapor initially shows search guidance without names. Nonblank search shows matching students; clearing/whitespace search hides results and no-match message. Existing checkbox selections persist while searching other names; selected count remains visible.
- 46 role/render/routing tests pass including initial/cleared search state; JS syntax/diff valid. Themev103/SWv131. Local only, not pushed; no live data changes.

## 27 October — restore home date placement
- Explicit home child order keeps brand, greeting, date and menu sections in sequence across roles. Date strip overlaps lower greeting edge again with reserved greeting padding, including compact/mobile mode; fixed viewport sizing retained.
- 30 home/menu/render tests pass including date-after-greeting assertion across roles and fit tests; diff check valid. Themev104/SWv132. Local only, not pushed; actual browser visual verification pending.

## 27 October — actual home route mount selector correction
- User screenshot showed date still below cards: actual app renders an inner div.home-dashboard inside section#content, whereas new fixed-viewport/date CSS incorrectly used #content.home-dashboard. Corrected all such selectors to #content .home-dashboard; this activates both fixed-height root and date placement rules in the actual app.
- Updated role render fixture to mirror real #content > routeMount, and optional preview generator to include #content plus viewport-fit initialization. 30 home/menu/render tests passed; subsequent27 render tests passed with generated preview. Generated tracked preview HTML restored to avoid unrelated artifact churn.
- Themev105/SWv133. Browser visual check attempted but CUA reports local browser disabled in Work settings; no visual success claimed. Local only, not pushed.

## 27 October — show all five bottom menu positions in feature manager
- Editor now shows positions1–5 in order, including disabled labeled Beranda at3 and Lainnya at5. Only1,2,4 remain configurable, preserving existing stored settings and centered home behavior. Responsive grid and helper text explain fixed slots.
- 29 role/render/menu tests pass incl five visible slots and unchanged three editable fields; syntax/diff valid. App/Admin themev106, SWv134. Local only, not pushed; no live settings changes.

## 27 October — all-role mobile home visual reference
- Shared <=900px home styling now uses light logo/bell/avatar header, deep tosca mosque greeting, gold-edged role pill, overlapping white date strip, two-column tosca/gold quick cards with supporting descriptions and arrows, and three-column white secondary cards. Existing Madani SVG assets reused; no people/content copied from reference.
- Bottom navigation explicitly remains five equal slots with centered Beranda; existing role/menu configuration and disabled/hidden destination semantics unchanged. Desktop styling unchanged. Fixed home viewport fitter still scales dense role menus to preserve all enabled destinations; small screens with many cards will use smaller UI than the reference's nine secondary cards.
- 30 home/menu/render/fit tests pass; diff check valid. Themev107/SWv135. Not pushed; no live data changes. Device visual verification remains unavailable because local browser is disabled.

## 27 October — mobile home width/readability correction
- User device screenshot exposed whole-page scale reducing home width and text, leaving broad empty side gutters. Mobile fitter now keeps100% width and adjusts vertical spacing through --home-density rather than transform scale; desktop fitting retained.
- Quieter card ornament contrast, full-width hero/date, normal word boundaries, centered icon-above-title secondary tiles to give long Indonesian labels full card width, and five bottom slots with normal wrapping. No menu destinations removed.
- 30 menu/render/viewport tests pass, syntax/diff valid. Themev108/SWv136. Local only, not pushed. Actual mobile visual verification still pending; exceptionally dense menus/small screens remain a readability-versus-fixed-viewport constraint.

## 27 October — standardized home card limits (latest user instruction)
- All roles, including Admin and configured menu overrides, now show at most4 quick cards and6 other cards. Mobile remains2-column quick/3-column other and5 bottom slots. Additional authorized routes remain accessible in Semua menu; feature permissions/configured enablement unchanged. This supersedes previous request to render every role menu directly on home.
- Feature manager explains display caps and overflow behavior. 31 menu/render/viewport tests pass, including configured excess selections and actionable overflow route. Syntax/diff valid. Themev109/SWv137. Local only; not pushed or visually verified on device.

## 27 October — reduce mobile quick-card height
- Mobile quick cards set to100px border-box height with compact8px vertical padding,24px icons, tighter title/description line spacing and20px arrows. Grid no longer flex-grows rows; reserves more space for two rows of secondary cards. Applies across all roles, desktop untouched. Four/six/five navigation limits retained.
- CSS/diff and service-worker syntax checked. Themev110/SWv138; local only, no push or device visual verification.

## 27 October — clarify selected versus active home menus
- Feature manager now labels disabled-feature placements as non-displaying and shows selected count versus effective visible count (respecting4/6 caps). No feature automatically enabled and no live settings writes.
- User's18:02 screenshots confirm all six active secondary menus actually display: management data, Naqib duty, resident settings, staff worship, student leave approval and case reporting. Grey checked choices belong to disabled features.
-31 role/render/menu tests passed including six configured active dorm-head menus and quick overlap. SWv139; local only, not pushed.

## 27 October — desktop home reference and shared drawer
- All portal roles now use full-width desktop home with visible logo/hamburger/bell/avatar/account header, pale tosca mosque greeting, overlapping date,4 quick cards in one row and6 secondary cards in3x2. Retains latest4/6/5 limits rather than copying reference's9 secondary cards. Existing mosque SVG reused, not identical raster artwork.
- Portal sidebar is a hidden desktop drawer, opened from home hamburger or workspace menu button; backdrop/Escape/navigation close it. Shared sidebar-control synchronizes expanded state on both controls. Mobile design and bottom navigation retained. Standalone Admin data console shell remains separate; Admin role portal home receives this update.
-33 home/menu/render/sidebar tests pass, JavaScript syntax/diff valid. Themev111/SWv140. Local only, no push/live data changes; browser visual verification unavailable in current Work settings.

## 27 October — pastel mobile home and bottom-card protection
- Latest mobile reference: pale greeting, pastel tosca/blue/gold/orange quick cards with colored icons,6 white secondary tiles and5 bottom items. Existing SVG illustration reused; not pixel-identical to supplied artwork.
- After user screenshot of clipped final row, fitter now measures actual bottom-nav top and reserves12px clear space, observes nav resizing, and removes measured inline bounds when returning to desktop. Compact mode reduces header/greeting decoration before menu cards; removed fixed maximum heights to avoid clipping long labels. Stronger quick-card colors, borders and900-weight titles.
- Extreme short/zoomed screens have a reachable internal vertical-scroll fallback instead of inaccessible clipping; normal4/6 layouts use compact spacing.34 tests pass including measured nav clearance; syntax/diff valid. Themev113/SWv142. Not pushed, no live writes; actual browser visual verification still unavailable.

## 28 October — desktop pastel cards and permanent contrasting sidebar
- All portal roles now keep a 260px desktop sidebar visible. Dark tosca navigation contrasts with the light workspace; active items use tosca with a gold edge. Mobile drawer and home layout unchanged.
- Desktop home hides the extra logo/account header, leaving sidebar branding and the single greeting. Quick cards use the mobile pastel tosca/blue/gold/orange palette, bold dark headings and colored icons; secondary icons share the mobile palette. Narrow desktop uses two quick-card columns to retain readable labels.
- Theme v114 / SW v143. No live data changes or push. Browser visual verification still unavailable in this session.

## 28 October — startup splash screen
- Shared splash on entry, portal and admin: centered existing Madani logo/wordmark, slogan, three animated dots, ivory/tosca mosque/wave background. Uses existing vector artwork, not the reference raster mosque.
- Portal/admin dismiss at boot completion (including caught failures); entry dismisses when its UI script is ready. No artificial delay. After 12 seconds a continue button prevents trapping users if module loading stalls. Reduced-motion styling and back/forward cache dismissal included.
- JS syntax and diff checks passed; JSDOM checked initial display, three dots, readiness and error dismissal. Device visual verification pending. SW v144. No push or live data changes.

## 28 October — shared three-dot data loading
- Shared loading-ui helper renders three sequential tosca pulse dots with status text and polite live announcements. Applied to route loading across all roles, initial portal/admin placeholders, quality indicators, feature settings, counselor attendance review, update package loading, teacher sheets and role summary loaders. Existing result/error replacement removes the dots naturally.
- Reduced-motion users get static dots. Native select option text remains plain text. No data or permission changes.
- 27 role/workflow tests passed; syntax/diff checks passed. Theme v115, SW v145. Local changes, not pushed; device visual verification pending.

## 28 October — consistent portal/admin shell and startup-only splash
- Screenshots compare standalone Admin data console with portal role workspace. Admin menu routes intentionally navigate to separate documents; dark desktop shell previously scoped only to portal. Shared permanent 260px sidebar and contrasting palette now cover admin data/user consoles too, retaining role-specific menus and permissions.
- Full splash now displays once per tab session; navigation between entry/portal/admin or reload does not replay it. Data loading remains three-dot inline indicator. When storage is unavailable, same-origin referrer suppresses internal splash replay.
- Unified theme v116 on portal/admin/accounts; splash script v2; SW v146 with current theme cache URL. Syntax/diff and JSDOM first-entry versus subsequent-document splash checks pass. Production version and device visuals not verified; not pushed.

## 28 October — desktop installation welcome
- Installation screen only, >=901px: full-width light scenic background using existing Madani mosque/waves/ornaments, centered brand and official badge, larger bold headline, three white benefit cards, prominent gradient install CTA and helper panel. Short desktop windows compact spacing and can scroll rather than crop controls.
- Mobile styles and login form untouched; installation/auth handlers unchanged. Existing vector art is reused rather than the reference's raster illustration. Entry CSS v44 / SW v147. Syntax/diff checks pass; browser visual verification pending. Not pushed.

## 28 October — desktop home reference across roles
- Shared desktop home header now has an actionable menu search launcher, message bell, avatar and role/account control; sidebar owns the sole brand logo. Menu search filters only the existing permitted menu catalog in the all-menu dialog, not student/database records.
- Larger pale greeting, overlapping date strip, pastel quick cards and white secondary rows follow latest reference. Four/six limits and all role permissions preserved. All new home layout rules >=901px; mobile home unchanged.
- Existing vector mosque reused; not pixel-identical to raster reference. 34 role/menu/layout tests pass; syntax/diff valid. Theme117 / SW148. Not pushed; browser visual verification pending.
