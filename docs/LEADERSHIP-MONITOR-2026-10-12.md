# Pembaruan pimpinan unit — 12 Oktober 2026

## Implementasi

- Beranda Kepala Sekolah: kehadiran/punctuality guru, kehadiran/punctuality siswa, mentoring Guru Wali, izin guru, dan Manajemen Data.
- Beranda Kepala Asrama: kehadiran/punctuality santri, ringkasan konselor, presensi ibadah personil, izin Naqib, dan Manajemen Data.
- Laporan memakai identitas kanonis, tahun aktif, filter tanggal, unit role-specific (kosong = tanpa data), dan gender asrama. Laporan siswa hanya memakai presensi FINAL; delegasi GEMA tidak masuk penyebut. Ketepatan waktu = tepat waktu / seluruh hadir. Kehadiran siswa = hadir (termasuk terlambat) / rekam final dengan status dikenal.
- Guru: pembandingan presensi GPS dengan jadwal selesai, termasuk penggabungan sesi berurutan dan sourceScheduleIds. Tanpa presensi diberi label belum presensi, bukan otomatis Alfa. Persentase merupakan cakupan hadir tercatat, bukan keputusan pelanggaran; jadwal tanpa guru dan jadwal contoh tidak dihitung. Jadwal historis memakai master saat ini, belum snapshot per hari.
- Mentoring: default tujuh tanggal terakhir inklusif, jumlah guru/siswa/sesi, target, strategi, hasil dan detail wawancara.
- Konselor: kasus dengan penanganan/status ditangani dibanding seluruh kasus pada periode; ringkasan tidak menyalin narasi konseling.
- Izin Naqib: pengajuan, kontak, alasan, serah terima, riwayat, pembatalan pemilik; keputusan kepala asrama sesuai gender, tidak bisa menyetujui diri sendiri, keputusan sekali saja melalui aturan server.
- Piket: pengaturan personil aktif berakun Naqib dalam gender sendiri, shift 00–08,08–16,16–24 WITA. Transaksi per personil dengan pemeriksaan data lama dan audit. Tidak otomatis menambah akun/role.
- Mukim: personil aktif sesuai lingkup; kepala asrama mencatat ibadah Naqib dan guru yang ditetapkan mukim. Aturan validasi membatasi peserta presensi asrama ke gender yang sama.

## Verifikasi

Uji model lintas unit/gender, statistik, sesi final/GEMA, sumber jadwal gabungan, izin dan shift; uji ekspresi aturan server; rendering 221 kombinasi workspace dan 157 halaman lama; regresi Manajemen Data/akun/transaksi; sintaks JS dan JSON. Preview beranda sekolah/asrama diperiksa via browser lokal. Dry-run aturan Firebase lokal valid.

## Batasan yang belum selesai

- Aturan baca RTDB lama memberi akses luas kepada akun aktif. Pembaruan ini memfilter tampilan per unit dan membatasi write baru; **belum menyediakan isolasi baca server menyeluruh**. Penutupan read root membutuhkan perubahan pemuatan master dan query berbagai role, jangan sekadar mengganti rule root.
- Belum uji alur simpan dengan akun kepala sekolah/kepala asrama/Naqib produksi. Uji lokal tidak menulis rekam operasional live.
- Paket deployment terbatas memakai aturan produksi sebagai dasar, menambah settings/naqibDuty/staff, boarding/naqib_leaves dan workspaces/{year}/resident_staff serta staff_worship. Jangan deploy seluruh database.rules.json untuk rilis ini karena berbeda dengan banyak cabang produksi.

## Status rilis aturan

Paket terbatas di atas berhasil dirilis Firebase CLI pada 12 Oktober 2026 setelah dry-run. Seluruh cabang produksi sebelumnya, termasuk finance dan root read, identik dengan backup; hanya aturan fitur baru ditambahkan. Total 68 pengujian lokal lolos. Frontend memerlukan push kode. Uji simpan produksi dan isolasi baca server menyeluruh tetap belum selesai.
