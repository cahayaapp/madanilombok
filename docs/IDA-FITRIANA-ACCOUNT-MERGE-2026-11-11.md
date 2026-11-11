# Penggabungan akun Ida Fitriana — 11 November 2026

Atas instruksi pengguna, penggabungan LIVE dilakukan lewat sesi Super Admin Safari ke `fitriana2@madani.app`. Sumber `fitriana@madani.app`; keduanya sudah tertaut ke `AMD-SDM-0036`.

- Tujuan aktif; role utama Pembina Tahfiz; role Pembina Tahfiz, Guru Mapel, dan Guru Wali digabung beserta scope kedua profil. Enam kelas SMP, kelompok Quran/Arab, dan delapan santri binaan dipertahankan.
- `UNIT-PONDOK` tidak ada pada empat unit master live dan menghalangi validasi editor. Referensi tersebut dikeluarkan dari scope unit aktif; nilai asal disimpan pada metadata `accountMerge.legacyInvalidUnitIds` serta snapshot profil sebelum penggabungan. Unit SMP dan SMK tetap tersedia. Tidak membuat unit baru.
- Model jadwal aplikasi dengan master live menghasilkan 23 sesi Guru Mapel sebelum dan sesudah (16 formal, 7 Arab pagi), serta 19 sesi Pembina Tahfiz setelah penggabungan. Seluruh ID sesi sebelumnya tetap ditemukan. Jadwal master tidak ditulis ulang.
- Audit terarah untuk seluruh tahun yang tersedia (`TA-2026-2027-GANJIL`) mencakup cabang akademik per SDM, izin guru per UID, Quran per kelompok, mentoring delapan binaan, workspace dan laporan/kasus. Cabang presensi mengajar per SDM berisi enam tanggal; cabang akademik/mentoring lain yang ditelusuri kosong. Tidak ditemukan referensi UID sumber pada data yang diperiksa. Data akademik dan mentoring dibaca ulang dan dibandingkan setelah profil tujuan tersimpan: tetap sama.
- Setelah verifikasi profil dan jadwal, sumber mendapat `active=false`, `accessRevoked=true`, `replacedByUid` tujuan dan kenaikan `accessVersion`. Firebase Auth sumber tidak dihapus. Audit serta snapshot terbatas dua profil disimpan di `settings/accountTransfers/<sourceUid>`; status akhir `verified_complete`.
- Pembacaan balik mengonfirmasi tujuan aktif dengan tiga role dan sumber dicabut. Tidak mengubah finance, password, rules atau kode produksi; tidak mengekspor seluruh database.

Verifikasi lokal: 20 tes user management/model guru/jadwal formal lulus; 293 JS/MJS/CJS lolos syntax; 59 JSON valid. Role/route suite: 17 dari 18 lulus; pemeriksaan aturan Jurnal Liburan gagal karena fixture mengakses node rules yang tidak tersedia (`$studentId`). Tidak memperbaiki aturan di luar scope penggabungan ini.

Batas bukti: verifikasi menggunakan pembacaan database live dan fungsi jadwal/validasi aplikasi dalam sesi admin. Login langsung sebagai Ida, uji GPS perangkat, dan penulisan workflow dengan kredensial Ida tidak dilakukan. Tidak mengklaim semua workflow telah diuji secara end-to-end.
