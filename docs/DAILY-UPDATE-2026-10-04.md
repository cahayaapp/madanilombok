# Pembaruan jadwal 24 jam — 4 Oktober 2026

Dua DOCX pengguna menjadi sumber jadwal: `kegiatan santriwan santriwati umum 2026.docx` dan `kegiatan santriwan santriwati GEMA 2026.docx`. Kedua dokumen dirender dan diperiksa seluruh halamannya; ekstraksi tabel, nomor baris dan SHA-256 ada di `seed/imports/daily-2026-source.json`.

- Umum: 14 slot, termasuk slot Asar 15.30–16.30 yang tidak diberi nomor dalam dokumen.
- GEMA: 17 slot. Halaqoh pagi, siang, dan sore memiliki ID serta label waktu terpisah untuk presensi.
- Keduanya utuh 24 jam, mulai 03.30; tidur 22.00–03.30 berakhir keesokan hari.
- Waktu, detail kegiatan, PJ berbentuk jabatan dan keterangan mengikuti sumber. Tidak membuat penugasan individu berdasarkan jabatan PJ.
- Tidak ada pengecualian hari dalam sumber: disimpan `Setiap Hari`; belum ada jadwal khusus Jumat, Minggu atau libur.

GEMA memakai penempatan kamar `ROOM-PTR-GEMA` / `ROOM-PTRI-GEMA`; umum memakai kamar selain GEMA. Santri berstatus boarding yang belum memiliki penempatan kamar tidak ditebak masuk umum/GEMA. Keanggotaan kamar dan identitas siswa tidak diubah. Pemetaan otomatis mengikuti penempatan kamar aktif saat halaman dimuat. Jadwal berlaku putra dan putri; Naqib dapat memilih tampilan umum/GEMA, sedangkan wali hanya melihat jadwal yang cocok dengan anak. Entri TK lama dipertahankan dan dibaca menurut audiens TK, bukan dimasukkan ke daftar asrama.

50 slot/program asrama dari tiga sumber lama dinonaktifkan dengan `supersededBy`, bukan dihapus. Tujuh jadwal TK dan seluruh jadwal pelajaran SD/SMP, data keuangan, siswa, SDM dan penugasan tetap. Riwayat presensi/laporan tidak dimigrasi. Penulisan presensi menggunakan patch per siswa sehingga scope putra/putri tidak saling menghapus.

## Penerapan

`import-daily-update.py` membaca DOCX lokal dengan python-docx dan menghasilkan master lokal serta paket perubahan terbatas `daily-2026-update.json`. Jalankan memakai Python bundled Codex. Hasil impor ulang identik.

Setelah deploy kode, admin dapat memakai **Import Data → Terapkan Jadwal 24 Jam**. Pengimpor memeriksa ID/sumber/tahun tujuan, melewati node riwayat yang belum ada, menulis patch atomik, serta menolak pengulangan setelah marker tersimpan. Hindari pengeditan jadwal bersamaan saat impor karena pemeriksaan awal bukan transaksi conditional. Tidak membaca/menulis data keuangan, akun atau identitas siswa.

## Verifikasi dan batas

78 tes lokal lulus, termasuk cakupan 24 jam, roster umum/GEMA, scope gender, tampilan wali, presensi patch, konflik ID dan penolakan impor ulang. Syntax JS, JSON dan diff diperiksa. Pengujian memakai repository tiruan; belum deploy atau menulis database aktif dan belum menguji akun produksi/Firebase Rules secara langsung.
