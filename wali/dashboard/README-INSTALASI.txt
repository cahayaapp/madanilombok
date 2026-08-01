PORTAL WALI CAHAYA APP
FINAL IDENTITAS SANTRI 2026/2027
================================

TEMPATKAN SEMUA FILE DI:
wali/dashboard/

FILE UTAMA:
- index.html
- beranda.html
- akademik.html
- karakter.html
- pembinaan.html
- raport-bulanan.html
- profil.html
- script.js
- style.css

PEMBARUAN IDENTITAS HEADER
Semua kartu identitas pada Akademik, Karakter, Pembinaan, dan
Raport Bulanan sekarang hanya menampilkan:
1. Nama santri
2. Kelas
3. Usrah

SUMBER DATA
- Kelas utama:
  cahaya_app/master_akademik/kelas

- Fallback kelas lama:
  cahaya_app/master_akademik/halqah/Halqah Ilmiyah

- Usrah:
  cahaya_app/master_usrah

Data kelas/usrah pada asesmen atau laporan lama tidak menimpa data
master terbaru di bagian header.

NORMALISASI NAMA LAMA
Variasi berikut dibakukan menjadi bentuk Muhammad:
- M. Fulan
- M Fulan
- Mhd. Fulan
- Mohd Fulan
- Mohammad Fulan
- Mohamad Fulan
- K.A. M. Abdullah

Pencocokan dibuat konservatif:
- M. Al Falah = Muhammad Al Falah
- M Ali tidak dianggap sama dengan Muhammad Alif
- Mika tidak dianggap sebagai singkatan Muhammad
- Nama yang hanya mirip sebagian tidak dicocokkan

Tujuannya agar data lama tetap terbaca tanpa memindahkan data kepada
santri lain yang namanya hampir sama.

SESUDAH MEMASANG
1. Ganti seluruh file lama dengan isi paket ini.
2. Logout dari Portal Wali.
3. Tutup tab lama.
4. Login kembali.
5. Lakukan hard refresh.
6. Uji melalui Live Server atau hosting.

PERBAIKAN MASTER USRAH
----------------------
Identitas usrah yang valid hanya:
- Usrah 1
- Usrah 2
- Usrah 3
- Usrah 4
- Usrah 5
- Usrah 6
- Usrah 7
- Usrah 8

Nama pembina seperti Favian, Kamal, Regen, Khaizuran, dan nama lainnya
tidak lagi dianggap sebagai nama usrah. Sistem mendukung struktur master
usrah yang langsung memakai key Usrah 1-8 maupun struktur bertingkat yang
menempatkan Usrah 1-8 di bawah nama pembina/unit.
