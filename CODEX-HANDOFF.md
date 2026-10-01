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
- Jadwal SMP lengkap belum tersedia; jadwal SMK masih perlu normalisasi dari sumber gambar.

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
