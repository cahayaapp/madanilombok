# MadaniApp V2 Pilot

Paket kode awal MadaniApp untuk Pondok Pesantren Al-Madani. Cara berpikirnya mengikuti pola CAHAYA APP—role-aware, data-driven, operasional 24 jam, pemisahan fungsi pembinaan, dan histori transaksi—tetapi memakai **data, struktur organisasi, Firebase, serta identitas visual Al-Madani sendiri**.

Tema menggunakan hijau tosca sebagai warna utama dan oranye emas sebagai aksen pada identitas visual Al-Madani.

## Firebase

- Project ID: `madanilombok-f692d`
- Realtime Database: `https://madanilombok-f692d-default-rtdb.firebaseio.com`
- Root data: `madani_app`
- Auth: Firebase Authentication Email/Password

Konfigurasi web ada di `config/firebase-config.js`.

## Master data yang sudah dibawa ke paket

Seed dibentuk dari `source-data/Master_Data_Awal_Pondok_Pesantren_Al_Madani_2026-09-30.xlsx`.

Baseline saat konsolidasi:

- 352 santri formal: TK 40, SD 132, SMP 100, SMK 80
- 85 SDM
- 23 kelas/rombel
- 2 asrama dan 10 record kamar/ruang asrama pada data awal
- 11 kelompok/halaqah
- 44 master mapel
- 57 master program 24 jam
- 214 record jadwal akademik SD sebagai baseline yang sudah terbaca

Data yang belum pasti **tidak dipaksakan menjadi kebenaran**. Lihat `seed/seed_validation` pada master seed dan sheet `22_Isu_Validasi` pada workbook sumber.

## Fitur aktif pilot

### Akademik

Presensi Guru · Presensi Santri · Tahsin Tahfiz · Nilai · Jadwal Pelajaran · Rencana Pembelajaran/Materi.

### Asrama

Seluruh menu personil Naqib, Guru Wali (pengganti Mentor individu), dan Konselor diaktifkan pada pilot: program/presensi/laporan, inisiatif, keteladanan, asesmen santri, skor kedisiplinan, self review, mentoring beserta hasil target, workflow kasus, konseling, tindakan edukatif, poin, SP, eskalasi, KPI/evidence, riwayat, dan panduan kerja.

### Wali Santri

Fitur wali aktif mencakup Beranda Anak, Kabar Ananda, Kalender Wali, Program Harian, Jadwal Pembelajaran, Kehadiran, Laporan Bulanan, Laporan Akademik/Rapor, Tahsin Tahfiz, Laporan Karakter, Pembinaan, Mentoring, Riwayat Kesehatan, Tata Tertib, Izin, Pesan, Informasi Penting, dan Keuangan. **Jurnal Liburan dan Penitipan tidak diaktifkan.**

### Keuangan

SPP & Tagihan · Pembayaran · Tabungan & Saldo Belanja · Kasir Putra/Putri · Produk/Stok · Riwayat Transaksi · Pembatalan/Refund berjejak audit · Laporan. Default limit belanja seed: Rp50.000/hari dan dapat diubah di settings.

Rincian: `docs/FEATURE-SCOPE.md`.

Status pemeriksaan paket: `QA-CHECKS.md`.

## Role

Role utama pilot yang diminta:

- `mentor_tahsin_tahfiz`
- `guru_mapel`
- `naqib`
- `konselor`
- `guru_wali`
- `kasir`

Selain itu tersedia role pengendali sistem dan struktur: `super_admin`, `admin`, `director`, `deputy_director`, `head_formal_school`, `head_boys_dorm`, `head_girls_dorm`, serta `wali_santri`.

Satu SDM dapat memiliki beberapa role. Contoh profil ada di `seed/user-profile-examples.json`.

## Struktur organisasi

Bagan yang diberikan sudah diterjemahkan ke model aplikasi. Guru Wali menggantikan Mentor untuk mentoring individu; Naqib fokus pada pengawalan asrama dan pelaporan kasus; Konselor menangani kasus formal. Detail ada di `docs/ORGANIZATION-MAPPING.md` dan `seed/organization-structure.json`.

## Cara menjalankan lokal

Karena memakai ES Modules, jalankan web server lokal dari folder paket:

```bash
python3 -m http.server 8080
```

Buka `http://localhost:8080`.

## Setup Firebase pertama

1. Aktifkan Email/Password di Firebase Authentication.
2. Buat user Super Admin di Firebase Authentication.
3. Simpan profil UID tersebut ke `madani_app/users/{UID}`. Contoh tersedia di `seed-admin-profile.example.json`.
4. Terapkan `database.rules.json` untuk **pilot/staging**.
5. Login sebagai Super Admin.
6. Buka `/bootstrap/` untuk mengimpor `seed/master-data.json`.
7. Setelah import, buka `/admin/` untuk review Master Data dan `/app/` untuk portal role.

Bootstrap menolak import master seed bila node `students` sudah berisi data, untuk mengurangi risiko import ganda.

## Halaman utama

- `/` — Login
- `/app/` — Portal role-aware
- `/admin/` — Master Data Admin
- `/bootstrap/` — Import master seed awal

## Struktur penting

```text
MadaniApp-V2-Pilot/
├── index.html
├── app/index.html
├── admin/index.html
├── bootstrap/index.html
├── assets/
│   ├── css/
│   └── js/
│       ├── modules/academic.js
│       ├── modules/boarding.js
│       ├── modules/finance.js
│       └── modules/parent.js
├── config/firebase-config.js
├── seed/
│   ├── master-data.json
│   ├── organization-structure.json
│   ├── role-assignment-suggestions.json
│   └── user-profile-examples.json
├── source-data/
│   ├── Master_Data_Awal_Pondok_Pesantren_Al_Madani_2026-09-30.xlsx
│   └── Struktur_Organisasi_Al_Madani_2026-09-30.png
├── docs/
├── database.rules.json
└── CODEX-HANDOFF.md
```

## Prinsip yang jangan diubah

1. Satu santri = satu `studentId`.
2. Kelas, kamar, dan kelompok/halaqah adalah assignment per tahun ajaran.
3. Jangan hard-code roster santri, guru, kelas, kamar, mapel atau jadwal di JavaScript.
4. Operasional merujuk ID, bukan nama.
5. Satu SDM boleh multi-role.
6. Naqib tidak mengambil alih fungsi Konselor.
7. Guru Wali adalah pelaksana mentoring individu pada desain Al-Madani ini.
8. Data yang statusnya belum terverifikasi tetap ditandai sebagai isu, bukan ditebak.
9. Pisahkan saldo tabungan dan saldo belanja pada keuangan.

## Penting sebelum production

`database.rules.json` saat ini adalah **rules pilot**, bukan final production. Baca `docs/SECURITY-PILOT.md`. Lakukan pilot riil, verifikasi master data, penetapan akun/role, pengujian rules, dan uji transaksi keuangan sebelum go-live.

## V2.1 · Setup Akun Pilot

Paket ini menambahkan bootstrap Super Admin pertama dan halaman **Admin → Manajemen Akun**.

Urutan cepat:

1. Aktifkan Firebase Authentication provider **Email/Password**.
2. Deploy `database.rules.json` dari paket ini.
3. Buka `/setup/` → buat `admin@almadani.app` dengan password sementara `Madani123!`.
4. Buka `/admin/accounts.html` → klik **Buat / Sinkronkan Semua Akun Pilot**.
5. Daftar lengkap akun ada di `docs/PILOT-ACCOUNTS.md`.

Catatan: kredensial pilot adalah untuk testing internal, bukan production.
