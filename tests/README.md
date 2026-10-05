# Verifikasi role MadaniApp

Dari root repository, dengan Node 22+:

```sh
node --test tests/role-contracts.mjs
node --experimental-vm-modules --test tests/role-rendering.mjs
```

Tes rendering memerlukan `jsdom` 30. Bila tidak terpasang lokal, `MADANI_JSDOM_MODULE` dapat menunjuk absolute path entry jsdom yang sudah terpasang. Contoh lingkungan audit:

```sh
MADANI_JSDOM_MODULE=/Users/haimac/Documents/CahayaAppV2/node_modules/jsdom/lib/api.js node --experimental-vm-modules --test tests/role-rendering.mjs
```

Lokasi tersebut hanya menyediakan pustaka pengujian; acuan fitur tetap `fajrulislam`. Tes tidak membaca data atau kode aplikasi CahayaAppV2.

Repository Firebase diganti mock di dalam VM. Pengujian tidak masuk akun, tidak menulis database, dan tidak membuktikan enforcement rules atau keberhasilan transaksi Firebase nyata. Rendering seluruh menu memeriksa kegagalan awal halaman; hanya workflow yang disebutkan eksplisit dalam nama tes yang disimulasikan sampai penyimpanan.


Manajemen pengguna dan aturan akses:

```sh
node --test tests/user-management.mjs tests/access-rules.mjs tests/staff-account-plan.mjs
MADANI_JSDOM_MODULE=/absolute/path/to/jsdom/lib/api.js node --test tests/user-management-ui.mjs
```

`access-rules.mjs` mengevaluasi ekspresi rules dengan snapshot simulasi; tidak menggantikan integrasi Firebase Emulator. Uji UI memakai callback palsu dan tidak membuat/mengubah akun Firebase.

Guru Mapel:

```sh
node --test tests/teacher-model.mjs tests/teacher-rules.mjs
MADANI_JSDOM_MODULE=/absolute/path/to/jsdom/lib/api.js node --experimental-vm-modules --test tests/teacher-ui.mjs
```

20 tes Guru memeriksa aturan dan skenario penyimpanan memakai data uji. Lokasi GPS perangkat dan izin nyata tidak diminta dalam uji. Detail dan batas verifikasi: `docs/GURU-MAPEL.md`.
# Pembaruan SMP

`tests/smp-update.mjs` memverifikasi referensi sumber, perlindungan master lama dan kelas gabungan. `tests/smp-update-ui.mjs` menguji import bertarget dengan repository palsu (memerlukan jsdom dan `--experimental-vm-modules`, seperti tes UI lain).
- `daily-update.mjs` / `daily-update-ui.mjs`: kelengkapan 24 jam umum/GEMA, peserta berdasarkan kamar, pemisahan TK, patch impor terbatas dan konflik ID. `role-rendering.mjs` juga memeriksa filter Naqib, jadwal wali dan patch presensi per siswa.
- `boarding-rosters.mjs` / `boarding-update-ui.mjs`: referensi siswa, scope perubahan, roster tertunda, jadwal berulang, konflik tujuan dan impor ulang. Rendering juga memeriksa filter bahasa Arab pagi dan kelompok pada portal wali.

Role workflows 2026-10-04: `report-publication.mjs`, `academic-review.mjs`, `operational-workflows.mjs`, `mentoring-ui.mjs`, `health-model.mjs`, `health-ui.mjs`, `health-rules.mjs`, `counselor-model.mjs`. Full suite: 121 passed using JSDOM and simulated data. Firebase Emulator not run (Java runtime unavailable). No operational Firebase writes in tests.
