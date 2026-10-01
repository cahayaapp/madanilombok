# QA Checks — MadaniApp V2 Pilot

Pemeriksaan paket sebelum dikemas:

- Seluruh file JavaScript lolos `node --check`.
- Seluruh file JSON lolos parse.
- 62 item menu (termasuk Beranda) terhubung ke 61 route handler + Beranda; tidak ada route menu yang hilang.
- Local web server mengembalikan HTTP 200 untuk `/`, `/app/`, `/admin/`, `/bootstrap/`, dan `/seed/master-data.json`.
- Master seed memuat 352 santri, 85 SDM, 23 kelas, 2 asrama, 10 record kamar, 11 kelompok, 44 mapel, 57 program, 214 record jadwal akademik baseline, dan 57 jadwal harian.
- Jurnal Liburan dan Penitipan Wali tidak berada pada menu aktif.
- Struktur organisasi sumber dan workbook master ikut disertakan pada `source-data/`.
- Finalisasi poin kasus mencegah finalisasi kedua melalui alur UI.
- SP/kasus hanya tampil ke wali bila `parentVisible: true`.
- Refund kasir tidak menghapus transaksi asal; status, alasan, aktor, mutasi refund, dan pemulihan stok dicatat.

## Batasan QA

Ini masih baseline pilot/staging. Belum dilakukan pengujian end-to-end ke Firebase production dan belum dilakukan penetration/security test. Firebase Rules masih perlu diperketat sebelum production.

## V2.1 Account Provisioning
- [ ] database.rules.json valid dan first-admin rule hanya berlaku saat `/madani_app/users` belum ada.
- [ ] `/setup/` membuat Super Admin pertama tanpa membutuhkan profil admin sebelumnya.
- [ ] Setelah user pertama ada, `/setup/` tidak dapat membuat admin kedua.
- [ ] `/admin/accounts.html` hanya dapat dibuka admin/super_admin.
- [ ] Provisioning memakai secondary Firebase Auth app agar sesi admin utama tidak terganti.
- [ ] Pilot accounts tersimpan pada Firebase Auth dan `madani_app/users/{uid}`.
- [ ] Password pilot diganti sebelum production.
