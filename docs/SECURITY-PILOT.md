# Catatan Keamanan — MadaniApp V2 Pilot

Versi ini adalah **pilot/staging foundation**, bukan konfigurasi final production.

## Yang sudah ada

- Firebase Authentication Email/Password.
- Profil user disimpan di `madani_app/users/{uid}`.
- UI disaring berdasarkan role/feature.
- Master data hanya dapat ditulis Admin/Super Admin melalui rules pilot.
- Audit log pada operasi repository utama.
- Kasir memakai PIN 6 digit yang disimpan sebagai hash SHA-256, bukan plaintext.

## Batasan rules pilot

Rules `database.rules.json` untuk node operasional masih dibuat cukup longgar agar pilot dapat diuji lintas role. Contohnya, penulisan domain akademik/asrama/keuangan secara umum baru membatasi Wali Santri, belum membatasi setiap node sampai level role dan scope kelas/kelompok/gender.

**Jangan deploy sebagai production final sebelum rules diperketat.**

Sebelum go-live production, minimal:

1. Batasi `academic/*` berdasarkan `guru_mapel`, `mentor_tahsin_tahfiz`, pimpinan dan scope penugasan.
2. Batasi `boarding/*` berdasarkan `naqib`, `guru_wali`, `konselor`, kepala asrama dan gender scope.
3. Batasi `finance/*` berdasarkan `kasir`, petugas keuangan/pimpinan serta unit kasir Putra/Putri.
4. Wali Santri hanya boleh membaca data `studentIds` miliknya dan menulis permohonan/pesan miliknya.
5. Pisahkan hak baca data sensitif konseling dari role yang tidak membutuhkan.
6. Pertimbangkan Cloud Functions untuk transaksi keuangan kritis, pembatalan/refund dan ledger yang immutable.
7. Uji rules dengan Firebase Emulator Suite sebelum production.

## Bootstrap master data

Halaman `/bootstrap/` hanya untuk proses awal. Setelah master data berhasil diimpor, sebaiknya hapus/nonaktifkan halaman bootstrap pada deployment production atau batasi hanya untuk Super Admin.
