# Pembaruan UI workspace — 1 November 2026

Pembaruan mengikuti referensi pengguna: identitas M/kubah Madani, tosca–emas, ivory, hero masjid lembut, kartu putih, form lapang, dan navigasi ponsel yang sudah disetujui.

## Cakupan

| Kelompok | Pembaruan |
| --- | --- |
| Keuangan dan kasir | Hero, formulir, ringkasan nominal, daftar produk, tabel dan aksi; logika transaksi tetap |
| Wali santri | Laporan, timeline, tabel yang bisa digeser, form layanan, status kosong |
| UKS | Identitas layanan, kartu checklist, form pemeriksaan, stok dan perizinan; koreksi tata letak checklist ponsel |
| Akademik | Kartu pemilihan penilaian/pelajaran/periode, form dan ringkasan nilai, dialog |
| Pimpinan dan operasional | Panel, daftar rekam, metrik, filter dan laporan yang memakai komponen bersama |
| Menu pendukung | Pesan, agenda, tindak lanjut, panduan bernomor, profil dan keamanan akun |
| Admin | Penyelarasan toolbar user, tabel, pilihan role dan dialog akun |

Desain khusus Guru Wali, Tahfiz, izin guru, jadwal, dan konselor yang telah diperbarui tetap dipakai. Beranda bersama, identitas entry, situs publik dan kebijakan akses dipertahankan. `workspace-design.js` menambahkan kelas visual dan tombol kembali tanpa mengganti form atau handler. `brand-theme.css` tetap stylesheet terakhir. Tema142/SW193.

## Verifikasi

- 105 tes UI/role/menu/admin/UKS/guru lulus, termasuk 241 kombinasi role/workspace dan 163 kombinasi role/halaman lama.
- Form mempertahankan node, listener, nilai, dan status disabled setelah dekorasi; tombol kembali tidak berlipat.
- Preview data simulasi kasir desktop, laporan wali dan UKS pada 390px diperiksa di browser. Ini bukan klaim inspeksi visual manual setiap kombinasi.
- 166 JavaScript lolos sintaks dan 41 JSON valid. Tidak ada penulisan data produksi atau deployment hosting.
- Ini pembaruan tampilan, bukan klaim seluruh kesenjangan workflow Cahaya telah ditutup.
