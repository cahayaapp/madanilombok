# Audit kesetaraan role MadaniApp / Cahaya

**Koreksi terbaru pengguna:** Jurnal Liburan beserta monitoring dinonaktifkan (menu, akses route, dan write rules lokal); rekam lama dipertahankan. Penitipan tetap aktif. Pada data rombel, `homeroomStaffId` berlabel **Wali Kelas**, berbeda dari role Guru Wali untuk mentoring. Lima role pimpinan juga tersedia pada form pembuatan akun. Catatan implementasi awal di bawah merupakan riwayat sebelum koreksi ini.


Permintaan pengguna: pertahankan identitas default tosca BSI `#00A39D` / emas dan logo MadaniApp; periksa fitur dan tampilan seluruh role terhadap Cahaya; pertahankan keuangan Madani.

## Referensi

Sumber dikonfirmasi pengguna: `/Users/haimac/Documents/GitHub/fajrulislam`, khususnya `js/role-menu-v2.js`, `js/role-system-v2.js`, `js/guru-kpi-v144.js`, dan halaman fitur yang dirujuk. CahayaAppV2 bukan acuan fitur. Data, nama lembaga, dan penugasan Cahaya tidak disalin.

## Hasil audit awal

| Role Madani | Padanan Cahaya | Perbedaan yang ditemukan |
| --- | --- | --- |
| guru_mapel | GURU_PONDOK | Belum ada tindak lanjut akademik, lapor kasus guru, menulis, asesmen guru, kalender pendidikan, KPI guru, profil, pesan internal; beranda generik |
| mentor_tahsin_tahfiz | GURU_PONDOK (scope Al-Qur'an) | Utilitas jadwal/KPI/pesan/panduan belum lengkap; scope halaqah perlu diterapkan pada beranda |
| naqib | NAQIB / NAQIBAH | Menu inti tersedia; beranda belum berorientasi program hari ini; utilitas pesan/profil belum ada |
| guru_wali | MENTOR_USRAH | Mentoring/target tersedia; pemantauan jurnal liburan dan utilitas belum ada |
| konselor | KONSELOR | Menu inti tersedia; beranda bukan antrean kasus; klaim kasus masih baca-tulis nonatomik; level eskalasi belum setara |
| head_formal_school | MANAJER pendidikan | Masih memakai form personel; belum ada kontrol, observasi, temuan, pembinaan, KPI manajer |
| head_boys_dorm | MANAJER pembinaan putra | Masih memakai form personel; belum ada ruang kontrol dan tindak lanjut; scope gender belum otomatis dari role |
| head_girls_dorm | MANAJER pembinaan putri | Sama; perlu scope putri dari role |
| deputy_director | SUPERVISOR | Belum ada ruang standar kerja, observasi pembanding, evaluasi/manajer, eskalasi |
| director | DIREKTUR | Belum ada ruang arah/target, keputusan eskalasi, masalah sistemik, evaluasi supervisor |
| admin | Administrasi | Administrasi master tersedia; akses/beranda perlu jelas dan role aktif tidak bercampur |
| super_admin | Administrasi penuh | Sama; jangan membuka seluruh data operasional pada semua role |
| wali_santri | WALI_SANTRI | Data anak tersedia; Beranda masih umum, bukan anak; jurnal liburan/penitipan masih dikecualikan oleh brief pilot lama |
| kasir | Keuangan Madani dipertahankan | Modul transaksi dipertahankan; beranda perlu khusus keuangan dan unit kasir |

## Batas audit

Kecocokan jumlah menu bukan bukti kesetaraan workflow. Uji data produksi, perangkat instalasi PWA, dan semua transisi kasus/manajemen harus dilaporkan tersendiri. Tidak ada data Cahaya yang disalin ke Madani.


## Implementasi lokal — 2 Oktober 2026

- Identitas tosca BSI / emas / ivory dan logo M tetap menjadi default; panduan tersimpan pada `AGENTS.md`.
- Seluruh 14 role mempunyai beranda dan akses cepat sesuai tanggung jawab. Navigasi bawah menuju halaman yang benar; route tidak dikenal ditolak. Peralihan role menggunakan salinan scope, termasuk gender kepala asrama.
- Guru/mentor: tindak lanjut akademik memperbarui rekam yang sama, laporan guru masuk ke antrean kasus Konselor yang sudah ada, tulisan, refleksi 5 dimensi + 8 indikator, kalender, ringkasan evidence, jadwal pribadi, pesan, profil dan panduan.
- Manajemen: ruang kontrol berdasarkan divisi, observasi, pembinaan, temuan berstatus dengan penanggung jawab dan tenggat, eskalasi, standar/target/masalah sistemik untuk pimpinan. Riwayat transisi tersimpan pada rekam temuan; pelaksana tidak dapat memverifikasi penyelesaian sendiri.
- Wali: jurnal aktivitas harian (12 aktivitas), refleksi/bedah rapor (7 pertanyaan), draft/terkirim, dan pemantauan penitipan. Guru Wali/kepala asrama melihat refleksi terkirim sesuai scope. Petugas administrasi mencatat barang hingga serah terima; wali hanya membaca status.
- Klaim kasus Konselor memakai transaksi dengan pemeriksaan kepemilikan/status terbaru.
- Keuangan: isi `assets/js/modules/finance.js`, fungsi keuangan wali, serta node rules keuangan tidak diubah. Pembayaran, kasir, saldo, stok dan refund tetap memakai workflow yang ada.

## Belum setara penuh dengan Cahaya

Ini implementasi tambahan, **bukan klaim kesetaraan 100%**. Bagian berikut masih memerlukan implementasi lanjutan:

1. KPI Guru objektif delapan indikator dan KPI manajemen berbobot. Saat ini halaman KPI baru menampilkan evidence, tidak menghasilkan skor/ranking semu.
2. Kalender target materi dan capaian per pertemuan, pengaturan guru mukim/absensi ibadah, penempatan tahsin, dan publikasi rapor. Rencana Pembelajaran lama tetap digunakan.
3. Relasi observasi–temuan–pembinaan/evaluasi personel, tampilan detail operasional per divisi, evaluasi supervisor/manajer, serta tindak lanjut oleh pelaksana nonmanajemen. Form baru belum menyamai semua workflow berjenjang Cahaya.
4. Tingkatan Konselor dan eskalasi berjenjang, finalisasi poin yang atomik, penerima/keputusan eskalasi kasus lintas role.
5. Penyuntingan/publikasi tulisan, notifikasi/read receipts pesan dan detail antarmuka Cahaya yang belum dipetakan satu per satu.
6. Uji Firebase Emulator (rules dan konkurensi), login akun riil tiap role, dan uji instalasi PWA pada perangkat. Rules tetap berstatus pilot; jangan menyebut pembatasan UI sebagai keamanan database.

## Bukti verifikasi lokal

- 10 pengujian kontrak role, route, scope, transisi dan identitas lulus.
- 9 pengujian rendering/workflow lulus: 153 kombinasi halaman tambahan + 162 kombinasi halaman lama; beranda untuk seluruh 14 role; tindak lanjut pada rekam sama; integrasi laporan guru ke inbox kasus; siklus temuan; siklus penitipan yang terbaca wali.
- Seluruh tes memakai repository palsu dan data uji, tanpa akun atau penulisan Firebase.
- Pemeriksaan syntax JavaScript, parsing JSON, whitespace diff; perbandingan isi modul/rules keuangan terhadap HEAD.
- Pemeriksaan visual ponsel 390 × 844 untuk beranda Guru dan ruang Kepala Asrama Putri. Ini tidak membuktikan seluruh halaman identik secara visual dengan Cahaya.

Instruksi uji ada di `tests/README.md`. Belum ada deployment atau perubahan data produksi.


## Manajemen User — pembaruan berikutnya

Manajemen user lokal kini mengikuti alur `fajrulislam/admin/users.html`: pencarian nama/email/SDM, tambah dan edit, pilihan multi-role, role utama, penugasan per role, ringkasan assignment, dan pencabutan akses. Madani menambahkan filter role/status, nonaktifkan/pulihkan, histori perubahan akses, pemeriksaan konflik pembaruan, serta pencegahan admin mencabut aksesnya sendiri.

Pencabutan bersifat dapat dipulihkan: profil, akun Firebase Auth, dan seluruh riwayat operasional tetap disimpan. `active=false` dan `accessRevoked=true` menolak sesi aplikasi; listener profil memuat ulang perubahan role atau mengeluarkan sesi yang dicabut. Aturan database lokal menolak baca/tulis akun nonaktif/dicabut. Aturan ini **belum dideploy** dan pengujian ekspresi rules bukan Firebase Emulator.

Scope disesuaikan dengan struktur Madani: unit sekolah, rombel, mapel, halaqah, santri binaan, anak wali, gender dan unit kasir. Metadata level Konselor dapat disimpan; alur eskalasi bertingkat tetap termasuk pekerjaan domain Konselor, bukan diklaim selesai oleh editor akun ini.

Editor mempertahankan email login, UID, tanggal pembuatan, data profil lain dan snapshot role lama. Mengubah email Auth atau menghapus akun Firebase Auth permanen tidak termasuk fungsi cabut akses. Uji UI dan model mencakup tambah/edit, role ganda, role utama, relasi anak, cabut/pulihkan, dan validasi referensi master. Tampilan desktop dan ponsel 390px diperiksa memakai data simulasi, tanpa perubahan akun produksi.
