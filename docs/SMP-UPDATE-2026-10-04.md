# Pembaruan SMP — 4 Oktober 2026

Sumber pengguna: `GURU WALI SMP 2026-2027.xlsx` dan `JADWAL SMP GANJIL 2026-2027 TERBARU.xlsx`, sheet `SMT GANJIL`. Ekstraksi menyimpan koordinat sel, nilai dan SHA-256 berkas sumber; workbook asli tidak diubah.

## Hasil pencocokan lokal

- 252 slot pelajaran untuk enam rombel, 20 mapel berkode A–T, seluruhnya terhubung ke ID guru.
- Enam Wali Kelas dari tabel pada sheet jadwal. Ini berbeda dari 12 Guru Wali/mentor untuk 80 siswa binaan.
- Hasrul Ali ditambahkan sebagai `AMD-SDM-0086`, Guru Mapel dan Guru Wali.
- Dinda Cahyati (`AMD-SMP-0101`) dan Muhammad Akbar (`AMD-SMP-0102`) ditambahkan atas konfirmasi pengguna. Tidak mengarang kelas, NISN, gender, tanggal lahir atau data keluarga. Keduanya sudah memiliki mentor, tetapi belum penempatan rombel.
- Bintang Aria Putra Pratama ditautkan ke `AMD-SDM-0013`; Fahri Aldian Effendi ke `AMD-SDM-0023` (Fahri Effendi). Catatan SDM lama lain tidak dihapus atau digabung otomatis.
- Variasi nama Haufiana Harianti/Hariayanti ditautkan ke `AMD-SDM-0029`. Siti Bahirah Asilah dan Rizki Ahugrah ditautkan ke ID siswa yang sudah ada sesuai konfirmasi pengguna.
- Ida Fitriana dan Muammar yang memiliki beberapa kandidat dicocokkan ke satu-satunya catatan sekolah SMP yang cocok; tidak menggabungkan identitas lintas unit tanpa konfirmasi.
- PJOK Hasrul Ali, Kamis 08.00–09.20, VIII Putra + IX Putra dikonfirmasi sebagai kelas gabungan. Empat sel sumber tetap tersimpan, tetapi menjadi dua sesi guru (satu per jam pelajaran) dengan roster kedua kelas. Absensi guru/KPI tidak menggandakan sesi karena dua rombel.
- Program bersama dan jeda tanpa kode guru (upacara, Tahfiz pagi, Imtaq, Pagi Ceria, istirahat, salat/makan) disimpan di referensi periode bersama; tidak mengarang pengampu atau menjadikannya kewajiban GPS guru. Penugasan guru kegiatan bersama belum disediakan sumber.

## Penyimpanan dan penerapan

Master lokal: `seed/master-data.json`; rencana akun SDM dan audit identitas telah diperbarui. Roster tetap menggunakan satu studentId. Jadwal SD/SMK, penempatan kelas/kamar/halaqah lama, data keuangan dan data santri lama dipertahankan.

Node baru: `assignments/mentors/{academicYearId}/{studentId}`, berisi mentorStaffId, nama sumber, status dan provenance. Beranda serta semua halaman Guru Wali membaca assignment ini. Assignment eksplisit menggantikan scope rombel lama untuk siswa terkait; Wali Kelas tidak otomatis menjadi mentor.

Paket perubahan: `seed/imports/smp-2026-2027-update.json`. Hanya berisi jalur yang berubah, bukan dump database. Tidak boleh mengimpor seluruh baseline ke database yang telah berisi data.

**Belum ada perubahan database produksi atau deployment pada pekerjaan ini.** Setelah kode ini tersedia, Admin → Import Data → **Terapkan Pembaruan SMP** menerapkan paket bertarget, menambahkan role/scope ke akun aktif yang sudah terhubung dengan staffId, dan mencatat penanda import untuk mencegah penimpaan ulang. Tidak membuat akun Auth baru, mengubah password, mengaktifkan akun nonaktif atau mengubah keuangan. Konflik ID orang dibatalkan sebelum menulis. Hasrul Ali perlu akun Auth melalui Manajemen User jika belum memilikinya.

Perubahan data dikirim sebagai satu multi-location update; pembacaan sebelum update bukan transaksi bersyarat terhadap setiap edit bersamaan. Hindari menjalankan pembaruan bersamaan dengan penyuntingan master/role. Rules tetap berstatus pilot; jangan mengklaim isolasi server produksi dari pembatasan UI.

## Reproduksi dan verifikasi

Ekstraksi: jalankan `scripts/extract-smp-update.py` dengan Python bundled yang memiliki openpyxl. Argumen opsional pertama adalah folder kedua workbook. Lalu `node scripts/import-smp-update.mjs` dan `node scripts/audit-master-data.mjs`. Pencocokan nonexact hanya menggunakan alias yang telah dikonfirmasi pada `seed/imports/smp-identity-confirmations.json`.

68 tes lokal lulus, termasuk pencocokan sel/ID, perlindungan data lama, mentor terpisah dari rombel, deduplikasi sesi kelas gabungan, import bertarget, akun multi-role, konflik identitas dan pengulangan import. Repository pengujian berada dalam memori; tidak menulis Firebase. Pengujian ini tidak mencakup perangkat GPS, autentikasi produksi atau emulator Firebase.
