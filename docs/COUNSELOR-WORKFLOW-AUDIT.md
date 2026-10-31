# Audit dan implementasi Konselor Madani — 30 Oktober 2026

## Sumber dan batas perubahan

Referensi alur/desain: repository lokal fajrulislam, `konselor/workspace-v3.html`, `js/counselor-simplified-v3.js`, `js/counselor-simplified-v3-model.js`, dan `js/counselor-case-v2.js`. Tidak menyalin konfigurasi Firebase, identitas pengguna, atau data operasional Cahaya. Tidak melakukan deployment atau menulis database produksi.

## Perbedaan arsitektur

- Madani menggunakan Firebase Authentication UID dan Realtime Database di bawah `madani_app`. Identitas santri memakai ID master, bukan nama sebagai penghubung.
- Sumber kasus Madani adalah `boarding/cases/{tahun}/{caseId}`. Tabayyun, sesi, tindakan, evaluasi, operasi idempoten dan riwayat eskalasi berada pada kasus. `boarding/counseling`, `case_actions`, poin dan eskalasi merupakan proyeksi terkait. Cahaya memiliki model laporan/case-v2 serta proyeksi buku kasus yang berbeda.
- Madani mempertahankan transaksi klaim dan operasi kasus yang sudah ada. Tabayyun terbukti diperlukan sebelum konseling; konsekuensi/evaluasi/finalisasi poin tetap tahap tersendiri. Menyimpan What–Why–How tidak otomatis memberi poin atau menutup kasus.
- Presensi program dikelompokkan berdasarkan tanggal, sedangkan presensi pembelajaran berdasarkan petugas lalu tanggal. Query tanggal server dipakai untuk program melalui `orderByKey/startAt/endAt`. Pembelajaran masih dibaca per tahun karena tidak memiliki indeks tanggal pada akar yang sesuai. Tidak menambahkan klaim bahwa seluruh pembacaan sudah hemat data.

## Hasil implementasi

- Empat akses utama konselor: Kasus Masuk, Buku Konseling, Evaluasi Pelanggaran, Surat Peringatan. Profil, Panduan, dan Kalender Pendidikan Madani menjadi akses pendukung. Rute penanganan lama dipertahankan untuk tindak lanjut dan riwayat.
- Kasus aktif yang dipilih satu atau banyak dapat ditabayyun per santri, dengan kesimpulan per kasus, kemudian disimpan sebagai konseling What–Why–How dan konsekuensi. Pilihan pengalihan ke Madya memakai operasi eskalasi kasus yang sama.
- Sesi kelompok tetap dicatat pada setiap kasus/santri. ID operasi stabil mencegah duplikasi ketika sebagian penyimpanan gagal. Setelah percobaan simpan dimulai, isi form dikunci agar percobaan ulang memakai data yang sama.
- Kasus tidak terbukti dikeluarkan dari antrean operasional, buku, dan statistik terkait; bukti/riwayat tetap dipertahankan. Tidak menghapus rekam audit fisik.
- Buku menggabungkan sesi tertanam dan proyeksi konseling lama berdasarkan ID operasi; membaca alias narasi lama dan batchActions. Nama pelanggaran presensi menyertakan status dan konteks program/pelajaran; konteks lama dicari dari deskripsi jika tersedia.
- Evaluasi menghitung kasus unik dengan kesimpulan TERBUKTI berdasarkan tanggal kejadian, bukan tanggal konseling. Tersedia pekanan, bulanan, empat pekan dan empat bulan kalender terakhir (termasuk periode berjalan).
- Pembacaan awal kasus dimulai sebelum roster selesai. Loading ditampilkan terpisah dari hasil kosong. Layout memakai komponen dan warna Madani, responsif pada HP/desktop.

## Berkas terkait

Baru: `assets/js/counselor-data.js`, `counselor-review-model.js`, `counselor-review.js`, `tests/counselor-review.mjs`.

Integrasi: `assets/js/app.js`, `modules/boarding.js`, `counselor-model.js`, `repository.js`, `counselor-queue.js`, `counselor-layout.js`, `counselor-attendance.js`, `attendance-referrals.js`, `role-experience.js`, `role-workspace-catalog.js`, `permissions.js`, `education-quality-model.js`, `leadership-monitor.js`, `assets/css/brand-theme.css`, `app/index.html`, `sw.js`, `tests/role-rendering.mjs`.

Perubahan muqim yang sudah ada di working tree dipertahankan, bukan bagian dari implementasi konselor ini.

## Verifikasi dan keterbatasan

Pengujian lokal mencakup model kasus tunggal, banyak kasus, tidak terbukti, klaim/eskalasi, sesi kelompok, idempotensi, gagal parsial/coba ulang, alias data historis, periode statistik dan kontrak menu/role. Fixture visual menggunakan renderer asli pada lebar 360, 390 dan 1440 piksel; tidak ditemukan overflow horizontal. Fixture bukan pengujian sesi pengguna produksi.

- Belum diuji dengan Firebase emulator atau akun Wisnu/Muhasim produksi; penulisan transaksi dan kegagalan jaringan nyata masih perlu uji staging.
- Audit menemukan aturan boarding generik lama yang terlalu luas untuk sebagian data kasus. Pembatasan unit/kepemilikan aplikasi dipertahankan, tetapi tidak setara dengan otorisasi server yang ketat. Rules tidak diubah dalam pekerjaan ini. Penguatan rules memerlukan audit kompatibilitas seluruh penulis/proyeksi, tes emulator dan persetujuan deployment tersendiri.
- Buku membaca tahun aktif dan kasus yang masih memiliki relasi kasus/santri. Proyeksi yatim tanpa kasus induk tidak direka ulang. Data lama tanpa kesimpulan TERBUKTI eksplisit tidak diasumsikan terbukti hanya karena statusnya selesai.
- Kecocokan visual memakai aset SVG Madani yang tersedia, bukan salinan piksel ilustrasi Cahaya.
- Tidak mengubah keuangan, akun, UID, role pengguna tersimpan, atau data produksi. Tidak deploy.

## Pembaruan popup bertahap — 30 Oktober 2026

Proses Kasus membuka Tabayyun Kasus satu per satu: Mengakui, Tidak Mengakui dengan hasil pemeriksaan/kesimpulan, atau Eskalasi Kasus. Setelah seluruh tabayyun selesai, popup Konseling Santri hanya memuat kasus terbukti: Target (What), Motivasi (Why), Strategi (How), konsekuensi dan poin opsional. Kasus yang sudah masuk tahap konsekuensi/evaluasi tidak ditawarkan kembali sebagai kasus masuk; eskalasi mempertahankan ID kasus.

76 pengujian lokal lulus (review/model/menu konselor, rendering role, workflow operasional, kontrak role). Syntax JavaScript dan JSON rules valid. Popup diperiksa pada lebar 360, 390, 1440 piksel tanpa overflow horizontal. Form panjang dapat digulir di dalam dialog. Uji menggunakan fixture dan repository mock, bukan transaksi Firebase produksi. Tidak deploy.


## Buku Konseling per santri — 30 Oktober 2026

Buku Konseling mengikuti susunan referensi Cahaya: jumlah catatan, pencarian nama, daftar santri alfabetis beserta jumlah catatan, dan panel riwayat yang dibuka setelah santri dipilih. Riwayat menampilkan nama pelanggaran lengkap, tanggal, konselor jika tersedia, hasil tabayyun, What–Why–How dan konsekuensi. Data lama dan baru tetap dibaca melalui adapter yang sama; data yang tidak tercatat tidak direka. Pada HP daftar dan riwayat bergantian dengan tombol kembali. Kegagalan pembacaan menampilkan pesan gagal dan coba lagi.

Fixture renderer diperiksa pada lebar 360, 390 dan 1440 piksel tanpa overflow horizontal. Pengujian menggunakan data lokal/mock, bukan akun produksi. Tidak ada migrasi data, perubahan hak akses, atau deployment.
