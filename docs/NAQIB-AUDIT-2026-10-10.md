# Audit Naqib Madani — 10 Oktober 2026

Acuan lokal: fajrulislam/js/naqib-home-hub.js, naqib-report-v2.js, naqib-report-templates.js, naqib-prayer-attendance-v2.js. Tidak menyalin data operasional Cahaya.

| Bagian | Temuan / perubahan lokal |
| --- | --- |
| Beranda | Akses cepat Program, Presensi, Laporan, Inisiatif; Lapor Kasus tetap menu ruang kerja. Identitas dan pemilih role Madani dipertahankan. |
| Program Hari Ini | Sebelumnya jadwal 24 jam umum tanpa konteks hari/piket. Kini daftar kegiatan sesuai shift, hari, putra/putri; kegiatan mendatang terlihat tanpa tombol pencatatan aktif. Tautan membuka presensi/laporan dengan program terpilih. |
| Presensi salat wajib | Tahap awal menyimpan status; tahap akhir melengkapi keterangan terlambat, lalu menampilkan hasil final. Program lainnya satu tahap. Pengecualian GEMA dan validasi ulang shift saat simpan dipertahankan. |
| Laporan | Sebelumnya tiga kondisi umum dan teks bebas. Kini enam indikator kontekstual (salat, kebersihan, olahraga, transisi, umum), empat tingkat kondisi, tindakan langsung, tindak lanjut wajib bila dipilih Ya. ID stabil per petugas/tanggal/jadwal mencegah duplikasi saat pengiriman ulang; form memuat laporan yang sudah tersimpan. |
| Riwayat | Sebelumnya hanya jumlah laporan. Kini rincian laporan sendiri, indikator, temuan/tindakan/tindak lanjut, pencarian program/tanggal; tersedia di luar piket. |
| Shift | Mengikuti keputusan pengguna 00–08, 08–16, 16–24 WITA, bukan jam Cahaya. Tetap memerlukan penerapan paket Import Data di produksi. |
| KPI / liburan | Tetap dinonaktifkan sesuai instruksi pengguna. |

## Batas audit dan celah tersisa

- Belum setara penuh: gamifikasi/usrah, konfigurasi poin inisiatif, dan verifikasi evidence keteladanan belum disetarakan dalam perubahan ini. Inisiatif dan Naqib Teladan masih formulir Madani sebelumnya.
- Tahap final presensi baru diverifikasi pada UI; belum ada transaksi konflik antar dua Naqibah atau penguncian FINAL khusus di aturan server. Aturan shift/gender yang ada tetap berlaku. Jangan menyatakan seluruh alur presensi tahan konflik.
- Riwayat laporan ditingkatkan; belum menyediakan ekspor/cetak laporan.
- Belum uji visual perangkat fisik atau Firebase produksi. Pengujian memakai model, ekspresi rules dan DOM tiruan; bukan bukti kesetaraan visual 100%.
- Tidak ada write produksi, perubahan keuangan atau migrasi histori dalam audit ini.

## Koreksi daftar 10 Oktober malam
Presensi kini mengikuti daftar terbaru pengguna: 11 kegiatan + Apel Senin/Senam Sabtu; kebersihan dikeluarkan. Isya dipisahkan 20.00–20.30 WITA. Tombol Import Data **Terapkan Program Presensi Naqib** menyiapkan 13 jadwal beserta indeks server; mempertahankan riwayat dan jadwal 24 jam asal. Paket memerlukan penerapan produksi setelah publikasi.

Alur antarmuka presensi mengacu `fajrulislam/naqib/absensi.html`, `js/naqib-absensi-v2.js`, `css/naqib-absensi-v2.css`: kartu program, pilihan kamar/Seluruh Asrama, kartu nama santri dengan pilihan status, pencarian, Hadir Semua dan ringkasan jumlah. Scope Madani memakai penempatan kamar dan gender piket; seluruh asrama tidak membuka unit lawan gender. Skor/gamifikasi Cahaya tidak disalin.
