PERBAIKAN MEDIA SOSIAL PORTAL WALI
==================================

PENYEBAB ERROR 153
Portal pada tangkapan layar dibuka melalui file:///...
YouTube memerlukan HTTP Referer atau identitas klien yang setara. Halaman
file:// tidak mengirim Referer HTTP yang diperlukan, sehingga player menampilkan
Error 153. Instagram embed juga tidak stabil bila halaman dibuka sebagai file lokal.

CARA MENJALANKAN DI MAC
1. Pastikan semua file berada di wali/dashboard/.
2. Klik kanan jalankan-portal-mac.command lalu pilih Open.
3. Safari akan membuka http://localhost:5500/index.html.
4. Biarkan Terminal tetap terbuka selama pengujian.

Alternatif: gunakan ekstensi Live Server di VS Code atau unggah ke hosting HTTPS.

FILE BARU
- beranda-media-fix.js
- beranda-media-fix.css
- manajemen-media-FIX.html
- jalankan-portal-mac.command

ADMIN MEDIA
Ganti halaman input media lama dengan manajemen-media-FIX.html. Data tetap disimpan
pada jalur lama:
- cahaya_app/pengaturan_media/instagram
- cahaya_app/pengaturan_media/youtube

Format data lama {id, url_asli, waktu_input} tetap dibaca. Format baru menambah
platform, jenis/kind, url, embed_url, aktif, dan waktu_input.

CATATAN INSTAGRAM
Hanya postingan publik yang mengizinkan embedding yang dapat ditampilkan. Postingan
privat, dihapus, dibatasi usia/wilayah, atau embedding-nya dinonaktifkan tidak dapat
dipaksa tampil oleh kode portal.
