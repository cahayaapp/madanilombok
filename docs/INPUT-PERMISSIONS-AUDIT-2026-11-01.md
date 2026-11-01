# Audit izin input — 1 November 2026

## Temuan terverifikasi

Rules produksi dibaca langsung melalui Firebase CLI ke `/tmp/madani-rules-audit-current.json`; tidak membaca atau menulis rekam operasional. Produksi belum mempunyai `health` dan 14 koleksi workspace berikut: `schedules`, `messages`, `writings`, `teacher_assessments`, `academic_followups`, `findings`, `observations`, `coaching`, `standards`, `targets`, `systemic`, `changes`, `deposits`, `finding_responses`. Tanpa grant parent yang mengizinkan, form tersebut akan ditolak server.

Cabang akademik dan boarding produksi masih memakai grant parent lama yang lebih luas daripada rules lokal. Karena izin parent diwariskan, absennya child rules di kedua domain tersebut tidak otomatis merupakan permission denied. Jangan mengganti seluruh rules produksi dengan file lokal untuk memperbaiki form workspace.

## Perbaikan lokal

- Jadwal pribadi dan pesan internal menerima role UKS sesuai menu yang sudah diizinkan; batas kepemilikan, pengirim, penerima, aktor dan tahun tetap berlaku.
- Check-in dan presensi siswa Pembina Tahfiz dapat menulis rekam milik staffId sendiri; nilai ujian tetap khusus Guru Mapel. Ini memperbaiki rules lokal; produksi masih memakai grant akademik parent lama.
- Operasi UKS/keputusan pimpinan mengenali representasi role berbentuk map, seperti login. Validasi koreksi absensi akademik mengenali role UKS map. Repository UKS, revisi ujian, dan publikasi rapor juga membaca role map.
- Finance, ledger, kasir, wallet, parent finance, dan Jurnal Liburan tidak diubah.

## Patch produksi — diterapkan setelah persetujuan pengguna

Generator: `scripts/prepare-input-rules-patch.mjs`.

```sh
node scripts/prepare-input-rules-patch.mjs /tmp/madani-rules-audit-current.json /tmp/madani-input-rules-candidate.json
```

Patch menambahkan **15 cabang** (14 workspace + health). Semua nilai aturan yang sudah ada dipertahankan, termasuk aturan muqim yang sebelumnya dideploy dan seluruh aturan finance. Tidak menambah cabang Jurnal Liburan. Tidak membuat/mengubah akun atau rekam operasional. Penambahan izin mengikuti role dan scope pada rules lokal, bukan `.write: true` umum.

Kandidat deploy tersedia di `/tmp/madani-input-permissions-deploy/rules.json`, konfigurasi di direktori yang sama. Firebase CLI `deploy --only database --dry-run` memvalidasi sintaks kandidat dengan sukses. Perintah tersebut **tidak menerapkan** rules.

Sebelum aktivasi, baca ulang rules produksi dan bandingkan dengan snapshot audit; bila berubah, regenerasi kandidat dan ulangi dry-run. Deploy hanya kandidat terbatas tersebut setelah otorisasi produksi. Jangan deploy seluruh `database.rules.json` lokal. Setelah deploy, baca ulang rules dan pastikan sesuai kandidat serta tidak ada perubahan cabang lainnya.

## Pengujian dan batas klaim

- 136 tes terarah lulus: kontrak role/route/rendering, input workspace lintas role dan format profil, penolakan akun nonaktif/dicabut, ownership/scope, UKS, presensi guru, manajemen data, Naqib, muqim, dan editor user.
- Seluruh 153 file JavaScript aplikasi/SW valid; seluruh 41 JSON repo valid; diff whitespace bersih. Tidak mengubah isi rules keuangan lokal maupun produksi dalam kandidat.
- Baseline seluruh suite sebelum perbaikan: 337/350 lulus, 13 gagal. Kegagalan berada pada fixture import SMP/SD/SMK yang belum menyediakan export loading, mock repository yang belum memuat dependensi baru, ekstraksi fixture admin yang ikut menjalankan sidebar, paket group-teacher dengan staffNames tidak sesuai key staffId, dan skenario izin guru pada hari Minggu/Ahad. Masalah tersebut belum diperbaiki dalam audit izin ini; bukan bukti rules produksi berhasil.
- Pengujian ekspresi rules bukan Firebase Emulator. Java runtime tidak tersedia. Dry-run hanya membuktikan sintaks, bukan seluruh transisi server.
- Belum menguji simpan nyata di semua menu menggunakan akun produksi; tidak menulis data uji ke live. Belum dapat mengklaim semua menu bebas permission denied, termasuk kemungkinan profil/scope akun tidak sesuai, perubahan rules, data legacy, dan validasi payload khusus.
- Akses baca root dan grant parent lama produksi tetap luas; patch ini bukan hardening keamanan menyeluruh.

## Aktivasi produksi — 1 November 2026

Pengguna menyetujui penerapan patch. Rules produksi dibaca ulang sebelum deploy dan kandidat diregenerasi dari snapshot terbaru: tetap tepat 15 cabang tambahan, tanpa perubahan pada nilai rules yang sudah ada. Sebanyak 16 tes kontrak input/patch diulang dan lulus. Firebase CLI memvalidasi sintaks lalu mengonfirmasi deploy sukses ke `madanilombok-f692d-default-rtdb`.

Pembacaan ulang sesudah deploy identik secara struktural dengan kandidat yang disetujui; aturan keuangan tetap sama dengan snapshot sebelum deploy. Bukti lokal: `/tmp/madani-input-permissions-deploy/before.json`, `rules.json`, dan `after.json`. Tidak menulis data operasional atau menguji penyimpanan data fiktif di produksi. Catatan kandidat/dry-run di atas adalah riwayat persiapan, bukan status deployment terbaru.

Izin 14 workspace dan UKS kini sudah aktif. Ini tidak membuktikan semua payload/akun produksi dapat menyimpan tanpa kesalahan: pengujian simpan nyata per akun/menu dan Firebase Emulator tetap belum dilakukan. Perbaikan frontend/repository dan rules akademik lokal di luar 15 cabang ini tidak ikut dideploy.
