# MadaniApp V2 Pilot — Scope Fitur Aktif

Versi ini mengaktifkan hanya domain yang diminta untuk pilot awal. Fitur lain di luar scope tidak ditambahkan.

## 1. Akademik

Fitur aktif:

- Presensi Guru
- Presensi Santri / pembelajaran
- Tahsin Tahfiz
- Nilai
- Jadwal Pelajaran
- Rencana Pembelajaran / Materi

Akses utama:

- `guru_mapel`: presensi guru, presensi santri, nilai, jadwal, rencana pembelajaran.
- `mentor_tahsin_tahfiz`: presensi guru, Tahsin Tahfiz, jadwal.
- Kepala Sekolah Formal / Direktur / Wakil Direktur / Admin dapat melihat domain akademik sesuai role pilot.

Scope kelas, mapel, dan halaqah dapat dibatasi melalui `classIds`, `subjectIds`, dan `groupIds` pada profil user.

## 2. Asrama

### Naqib — seluruh fitur personil diaktifkan

- Program Hari Ini
- Presensi Program
- Laporan Pelaksanaan
- Catat Inisiatif Santri
- Naqib Teladan / evidence keteladanan
- Asesmen Perkembangan Santri
- Lapor Kasus/Pelanggaran
- Skor Kedisiplinan
- Self Review Naqib
- Riwayat Naqib
- KPI & Evidence
- Panduan Kerja

Prinsip pemisahan fungsi: Naqib mendampingi dan mengawal kehidupan asrama, tetapi **tidak menjatuhkan tindakan/konsekuensi formal kasus dan tidak mengubah poin pelanggaran**. Kasus dilaporkan kepada Konselor.

### Guru Wali — pengganti Mentor individu

- Santri Binaan
- Form Mentoring Individu
- Target & Hasil
- Riwayat Mentoring
- KPI & Evidence
- Panduan

Satu rekam mentoring memuat ringkasan self-assessment santri, apresiasi, fokus **PERBAIKI/TINGKATKAN**, target, Strong Why, strategi/How, dan catatan. Hasil target diperbarui pada **rekam yang sama** dengan status:

- `TERCAPAI`
- `CUKUP_BERKEMBANG`
- `BELUM_TERCAPAI`

Role `mentor` individual tidak dibuat terpisah; fungsi ini dijalankan oleh **Guru Wali** sesuai struktur Al-Madani.

### Konselor — seluruh workflow diaktifkan

- Kasus Masuk
- Claim Kasus
- Kasus Aktif
- Catat Tabayyun & Konseling
- Tindakan Edukatif
- Finalisasi Poin
- Surat Peringatan
- Eskalasi
- Riwayat Kasus
- Self Asesmen
- KPI & Evidence
- Panduan Kerja

Tahap kasus pilot mengikuti satu workflow: `menunggu_konselor → ditangani → tabayyun → konseling → konsekuensi → evaluasi → selesai`, dengan status tambahan `dieskalasi` dan `tidak_terbukti` bila relevan.

## 3. Wali Santri

Fitur aktif:

- Beranda Anak
- Kabar Ananda
- Kalender Wali
- Program Harian
- Jadwal Pembelajaran
- Kehadiran
- Laporan Bulanan
- Laporan Akademik & Rapor
- Tahsin Tahfiz
- Laporan Karakter
- Laporan Pembinaan
- Laporan Mentoring
- Riwayat Kesehatan
- Tata Tertib Pesantren
- Izin Santri
- Pesan
- Informasi Penting/Pengumuman
- Keuangan

**Tidak diaktifkan:**

- Jurnal Liburan
- Penitipan Barang

Satu akun wali dapat ditautkan ke beberapa anak melalui `studentIds`; seluruh halaman mengikuti anak aktif yang dipilih.

## 4. Keuangan

Mengikuti pola keuangan yang sebelumnya digunakan pada CAHAYA APP, tetapi seluruh data disimpan pada Firebase MadaniApp:

- Dashboard Keuangan
- SPP & Tagihan
- Pembayaran
- Saldo Santri
  - Tabungan
  - Saldo Belanja
- Kasir Kantin/Koperasi
  - Unit Putra
  - Unit Putri
  - PIN transaksi 6 digit
  - limit belanja harian (seed default Rp50.000)
  - stok produk
  - transaksi dan audit
  - pembatalan/refund tercatat tanpa menghapus transaksi asal
- Produk & Stok
- Riwayat Transaksi
- Laporan Keuangan

Saldo tabungan dan saldo belanja dibuat terpisah. Kasir menggunakan saldo belanja, bukan mengurangi tabungan secara langsung. Role `kasir` dapat dikunci ke `financeUnit` PUTRA atau PUTRI.

## Role aplikasi pilot

Role utama yang diminta:

- `mentor_tahsin_tahfiz`
- `guru_mapel`
- `naqib`
- `konselor`
- `guru_wali`
- `kasir`

Role sistem/struktur yang tetap disediakan agar bagan organisasi dapat diterapkan:

- `super_admin`
- `admin`
- `director`
- `deputy_director`
- `head_formal_school`
- `head_boys_dorm`
- `head_girls_dorm`
- `wali_santri`

Satu orang boleh memiliki lebih dari satu role.
