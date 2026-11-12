# Madani Live TV

Halaman publik: `https://app.almadanilombok.com/live` (GitHub Pages, domain induk MadaniApp). Studio admin: `https://app.almadanilombok.com/admin/live.html`.

## Penggunaan

1. Buka Studio dengan akun Admin/Super Admin. Tinjau daftar nama/status, centang persetujuan publikasi nama, lalu pilih **Mulai Siaran Publik**.
2. Biarkan tab Studio terbuka pada komputer administrator selama siaran. Sumber Firebase didengarkan langsung; snapshot diperiksa/diperbarui tiap 30 detik, master setiap 5 menit. Halaman TV tidak memerlukan login.
3. Buka `/live` pada TV. Empat layar berganti otomatis: inspirasi, setoran Al-Qur’an, guru, santri. Nama berpindah halaman setiap 7 detik (empat nama per kategori per halaman). Jam, hitung mundur salat, dan jadwal salat tetap terlihat.
4. `F`: layar penuh, `Spasi`: jeda, panah kiri/kanan: ganti layar. Tombol layar penuh juga meminta screen wake lock bila browser mendukungnya. Browser TV tetap dapat memiliki pengaturan tidur sendiri.
5. **Hentikan Siaran** mencabut pembacaan publik snapshot. Menutup tab Studio menghentikan sinkronisasi, tetapi snapshot terakhir masih tersedia sampai tengah malam WITA; layar menandai keterlambatan setelah 3 menit. Ini bukan layanan agregasi server yang berjalan saat seluruh tab admin ditutup.

`?demo=1` menampilkan data contoh yang diberi label jelas. Mode normal tidak pernah mengganti data kosong dengan contoh. `?scene=0` sampai `3` memilih layar awal.

## Definisi angka dan nama

- **Setoran:** santri aktif yang terdaftar pada halaqah Al-Qur’an aktif, dihitung sekali per ID. Setoran Tahsin/Tahfiz/Muroja’ah hari ini yang tersimpan dan belum dihapus dihitung; setoran berulang tidak menggandakan jumlah. Santri tanpa setoran hari ini berstatus **Belum Setoran**, bukan pelanggaran/alfa.
- **Guru:** guru mapel/pembina pada jadwal hari ini yang sudah terkonfirmasi, mengikuti penggabungan jadwal, scope per role, serta kalender pendidikan aplikasi. Kehadiran nyata tetap masuk bila jadwal diperbaiki kemudian. Satu guru dihitung sekali: hadir lebih diutamakan, lalu izin disetujui/status izin atau sakit lama, lalu tidak hadir yang tercatat, jadwal mendatang, dan belum absen. Pengajuan izin pending/ditolak tidak dianggap izin disetujui. Jadwal yang belum mulai tidak dianggap belum absen.
- **Santri:** santri aktif yang belum digabung/diarsipkan. Status memakai rekam final terakhir hari ini dari KBM dan program asrama, dengan fallback presensi akademik lama. Rekam pembukaan belum final, rekam dihapus, atau presensi yang didelegasikan ke sumber lain tidak dipaksakan menjadi hadir/alfa. Tidak ada rekam yang sah berarti **belum memiliki presensi final**, ditampilkan sebagai jumlah terpisah.
- Semua tanggal operasional mengikuti `Asia/Makassar` (WITA), sesuai kampus dan aplikasi. Layar serta API menolak snapshot kemarin/kedaluwarsa.

## Data publik yang disetujui pengguna

Pengguna meminta nama guru dan santri tampil pada halaman yang dapat diakses siapa pun. Proyeksi publik hanya berisi `name`, `label` (kelas/unit), dan `status`, ditambah total, tanggal, waktu pembaruan, dan kedaluwarsa. Tidak memuat NISN/NIK, UID, nomor telepon, GPS, alasan izin, diagnosis, nilai, catatan pembinaan, atau data keuangan. Hasil perhitungan dibangun ulang melalui allowlist; record sumber tidak disalin langsung.

Satu snapshot berada di **`madani_live/current`**, terpisah dari `madani_app`. Hanya administrator aktif dapat menulis; semua field tak dikenal ditolak. Pembacaan anonim hanya diizinkan saat `enabled=true` dan `expiresAt>now`. Tidak dibuat arsip publik per tanggal. Halaman menggunakan noindex/noarchive, tanpa query berisi nama, tanpa penyimpanan roster ke localStorage, dan tanpa login atau izin GPS pada TV.

Studio memuat data sumber untuk pratinjau, tetapi tidak menulis sebelum persetujuan dan tombol mulai. Persetujuan tindakan publikasi melalui alat browser harus dipenuhi sebelum agen menekan tombol tersebut.

## Waktu salat

Hisab lokal memakai koordinat kampus dari titik Google Maps yang diberikan pengguna pada 6 Oktober 2026: `-8.5854457, 116.5755207`, UTC+8, Subuh 20°, Isya 18°, Asar standar, ihtiyat 2 menit. Perhitungan mengikuti persamaan posisi matahari/jam sudut pada [PrayTimes](https://praytimes.org/calculation). Angka ini berlabel **Hisab kampus**, bukan klaim jadwal resmi kota. Rujukan verifikasi masjid/admin: [Bimas Islam Kemenag](https://bimasislam.kemenag.go.id/jadwal-sholat); [penjelasan kriteria Subuh Kemenag](https://kemenag.go.id/nasional/kriteria-waktu-subuh-20-derajat-benar-secara-fikih-dan-sains-qq3pfh).

## Publikasi dan verifikasi

`scripts/prepare-live-rules.mjs` hanya menambahkan cabang `madani_live` pada salinan aturan produksi terbaru. Jangan deploy seluruh rules lokal yang berpotensi berbeda dari produksi. Sebelum menerapkan, baca ulang `/.settings/rules`, pastikan tidak berubah, regenerasi kandidat, dan lakukan dry run. Seluruh nilai lama, termasuk keuangan, harus identik.

Frontend dipublikasikan melalui branch GitHub Pages yang ada. Commit hanya file fitur Live; pekerjaan maintenance akun lain yang belum selesai tidak disertakan. Tidak membuat Site/domain lain atau mengubah DNS.

Tes lokal:

```sh
node --test tests/live-display.mjs
MADANI_JSDOM_MODULE=/absolute/path/to/jsdom/lib/api.js node --experimental-vm-modules --test tests/live-ui.mjs
```

15 pengujian mencakup deduplikasi/kelayakan, sumber final, izin pending, jadwal mendatang, proyeksi field publik, data kedaluwarsa, pergantian hari WITA, urutan salat, aturan tambahan tanpa perubahan cabang lama, rendering nama, tidak ada injeksi HTML, pencabutan pembacaan, pratinjau tanpa write, publikasi setelah persetujuan, kegagalan sumber parsial, serta penghentian siaran. Tes memakai data sintetis dan repository/SDK tiruan; tidak menulis data produksi.

### Verifikasi 12 November 2026

- 64 tes Live, rendering role/route, manajemen pengguna, serta kontrak cutover keuangan lulus. Renderer memeriksa 244 kombinasi workspace dan 142 halaman lama dengan repository tiruan.
- Dua tes lama pada `tests/access-rules.mjs` masih gagal karena mengharapkan `.read` pada root aplikasi dan akses tulis keuangan model lama. Kegagalan yang sama direproduksi terhadap `database.rules.json` dari HEAD sebelum perubahan Live. Nilai setiap aturan lama dibuktikan identik setelah penambahan cabang baru; aturan keuangan tidak diperbaiki/diubah sebagai bagian fitur ini.
- Pratinjau browser: 1920×1080, 3840×2160, serta 390×844 diperiksa tanpa overflow horizontal atau nama terpotong di luar panel. Pratinjau memakai data contoh berlabel, bukan data santri nyata.
- Firebase CLI memvalidasi kandidat aturan melalui dry run. Aturan produksi dibaca ulang sebelum penerapan, tetap identik dengan snapshot awal. Deployment kandidat yang hanya menambahkan `madani_live` berhasil. Tidak ada data operasional atau snapshot nama yang ditulis saat pengujian.
- Pada pemeriksaan sesi VS Code terakhir, Studio kembali diarahkan ke halaman masuk. Aktivasi data asli memerlukan sesi admin aktif dan persetujuan publikasi nama. Keberhasilan publikasi halaman tidak boleh disamakan dengan siaran nama aktif sebelum langkah ini diverifikasi.
