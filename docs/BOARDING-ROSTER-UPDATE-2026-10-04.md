# Roster halaqah, kamar dan bahasa Arab 2026/2027

Sumber: tiga XLSX pengguna dan tiga JPEG tanggal 2–3 Oktober 2026. Workbook tidak diubah. JSON sumber mempertahankan nama berkas, SHA-256, sel/posisi dan ejaan asli.

## Konfirmasi pengguna dan hasil

- Seluruh usulan tabel BOARDING-ROSTER-NAME-REVIEW.md disetujui. Daftar alias yang diterapkan tersimpan di boarding-2026-confirmations.json. Ejaan master dan ID siswa tetap.
- Dua entri Ferdi adalah orang sama. Disimpan satu anggota per kelompok/kamar. Sakina Aulia yang berulang dalam kelompok sama juga hanya satu anggota setelah aliasnya disetujui.
- Bain, Qoyyim dan Al ditunda sesuai permintaan, tidak dibuat sebagai siswa baru. Penempatan lama tidak dihapus.
- Fahri Husain berbeda dari Fahri Effendi. Identitas Fahri Gontor belum dikonfirmasi; nama pembina sumber dipertahankan tanpa menggabung SDM.
- 15 halaqah (8 putri, 7 putra), 6 kelompok bahasa Arab pagi (3 putri, 3 putra), serta penempatan kamar yang sudah cocok ditambahkan/diperbarui.
- Masih ada 40 kemunculan nama tertunda, termasuk variasi ejaan dan tiga nama yang sengaja di-skip. Jumlah anggota terhubung per kelompok ada dalam report paket, bukan dianggap seluruh roster telah lengkap.
- 11 kelompok halaqah lama dinonaktifkan dengan supersededBy; assignment dan catatan operasional lama tetap. Akses pembina dengan groupIds lama masih perlu disesuaikan setelah identitas pembina dipastikan.
- Makkah II berisi 12 ustazah; disimpan sebagai referensi penghuni staf, bukan siswa. Cordova 1 tidak dihapus. ID kamar GEMA putra dipertahankan, metadata gedung diperbarui Cairo.
- Kelompok umum putri yang judulnya berulang dibedakan dengan pembina, tanpa menebak nomor II/III. Kolom kosong K bukan kelompok operasional baru.
- Bahasa Arab memakai programType arabic dan jenis Bahasa Arab, terpisah dari Quran. Waktu 05.40–06.10 berasal dari slot Mufrodat DOCX harian yang diberikan sebelumnya. Naqib dapat membatasi roster presensi Mufrodat pada kelompok bahasa yang dipilih; wali hanya melihat kelompok anaknya.

## Penelusuran nama yang belum cocok

Master lokal 354 siswa, workbook master awal, roster putri lama, absensi SMP 17 September 2026 dan daftar iuran SMP sudah diperiksa pada nama yang relevan. Sepuluh nama berikut belum dapat ditautkan pasti: Tazia Olivia, Allamul Muhlisah, Aliyah Afifah Farzana, Azka Nabila, Restu Indira Afriadarsih, Fazia Fitri, Lukiana Jannatul Ma’wa, Aaliyah Afifah, Irwan Taufiq Azhar, M. Razak Aprianto. Tidak mengimpor nama baru tanpa unit/identitas sekolah yang pasti.

Huriatun Nazura / Hidayatul Naura tetap kandidat HIDAYATUL NAZURA. Feby Aprilia tetap kandidat FEBY EFRILLIA; koreksi hasil sumber: master Feby Efrillia kelas V SD, bukan kelas I yang sempat tertulis dalam pertanyaan. Roster lama juga menandai Feby sebagai kandidat yang belum boleh ditautkan otomatis. Belum memeriksa database aktif.

## Jadwal pekanan dan bulanan

Pengguna mengonfirmasi poster Oktober 2025 berlaku 2026/2027. schedules/recurring berisi 11 kegiatan unik; kajian GEMA Sabtu yang muncul dua kali hanya satu rekam. Label malam/pagi/siang/sore dan minggu kedua dipertahankan; tidak menebak jam maupun hari pasti pengajian bulanan. Jadwal tampil sebagai panduan Naqib dan wali, belum berupa mesin pengganti slot harian/presensi berulang otomatis.

## Penerapan dan batas

Script extract-boarding-rosters.py membaca XLSX. match-boarding-rosters.py menghasilkan exact match dan kandidat; tidak menerapkan fuzzy match. import-boarding-rosters.py menerapkan alias terkonfirmasi dan membangun paket incremental. Expected values awal dipertahankan saat rerun agar edit tujuan yang lebih baru ditolak pengimpor admin. Pemeriksaan awal bukan transaksi conditional: hindari edit bersamaan saat impor.

Admin → Import Data menyediakan tombol Terapkan Pembaruan Kelompok & Kamar. Belum deploy atau menulis database aktif. Setelah suatu paket diterapkan, konfirmasi berikutnya harus dikemas dalam revisi baru; jangan menghapus marker untuk menimpa ulang. Penugasan role/akun pembina tidak diubah dalam pembaruan ini. Riwayat, kelas formal, keuangan dan master siswa dipertahankan.

## Perbaikan impor parsial

Jika suatu studentId belum ada pada database tujuan, hanya penempatan/keanggotaannya yang ditunda. Data lain diterapkan, kelompok lama belum dinonaktifkan, dan marker mencatat status partial, missingStudentIds serta appliedPaths. Tombol Coba Lagi Data Tertunda memproses jalur yang belum diterapkan tanpa menimpa edit pada jalur yang sudah berhasil. Konflik nilai tujuan tetap membatalkan batch sebelum penulisan. Tidak membuat atau mencocokkan siswa baru berdasarkan nama saja. Tiga tes pengimpor termasuk siswa hilang, retry, dan pelestarian edit sesudah impor lulus secara lokal.
