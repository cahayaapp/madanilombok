# Kontrol Mutu Pendidikan — Kepala Sekolah

Route `school-quality`, feature `workspace.school-quality`. Read-only; unit dari penugasan Kepala Sekolah. Putra/putri menyaring gender guru dan santri; pemilih guru hanya memengaruhi indikator guru/kurikulum, pemilih santri indikator santri/pengasuhan. Tidak menambahkan akses transaksi keuangan. Pembatasan tampilan ini tidak menggantikan migrasi rules baca granular yang masih tertunda.

## Sumber dan definisi

- Guru: `academic/teaching_attendance`, jadwal formal master, `academic/teacher_leaves` disetujui, kalender `parent/calendar`. Persentase berbasis pertemuan: hadir / (rekam status valid + pertemuan selesai tanpa presensi). Tepat waktu / hadir. Pertemuan belum presensi dipisah menjadi izin disetujui yang memuat jadwal terkait dan tidak terdeteksi. Hari nonpembelajaran kalender dikecualikan. Kalender/jadwal yang tidak lengkap memerlukan verifikasi. Modul guru belum memiliki sumber penilaian.
- Santri: sesi pembelajaran FINAL dan presensi Naqib FINAL; tampil terpisah dan gabungan berbobot jumlah rekam. Tidak memasukkan rekam GEMA yang didelegasikan, draft, atau awal. Izin/sakit bersumber status presensi santri, bukan izin guru.
- Ujian: `academic/exam_sessions` FINAL. Persentase santri unik yang seluruh nilainya memenuhi KKM pada periode. KKM dari ujian, fallback75 mengikuti modul nilai. Tindak lanjut memakai ambang operasional modul guru (nilai ≤75), ditautkan ke ujian/SDM/santri yang sama; status Dalam Proses atau Selesai. Berbeda dengan ambang KKM jika ujian menggunakan KKM lain.
- Tahfiz: jumlah baris Ziyadah Tahfiz per santri/tanggal dibanding `quran_targets.dailyLines` saat ini. Denominator hanya hari dengan setoran dan target; bukan seluruh hari wajib. Target historis dan kalender kewajiban belum tersedia sehingga perubahan target dapat mengubah evaluasi riwayat.
- Karakter Santri: asesmen mentoring terakhir per santri dalam periode; rata-rata jawaban valid1–5 /5. Bukan skor self asesmen guru, bukan persentase kelulusan.
- Pelanggaran: kasus santri dengan tabayyun TERBUKTI atau penetapan poin final, mengecualikan tidak_terbukti dan keterlambatan yang teridentifikasi. Laporan belum terverifikasi tidak dihitung sebagai pelanggaran. Tidak menampilkan narasi konseling.
- Konseling: kasus yang sudah memiliki penanganan/status tahap penanganan dibanding kasus tercatat dalam periode. Mentoring: jangkauan santri dibina / santri dalam scope dan jumlah sesi; belum ada frekuensi kewajiban individu maupun form kelompok untuk menghitung kepatuhan target.
- Observasi pembelajaran: `academic/teacher_observations`, wajib tertaut kelas/scope sekolah. Rubrik `indicators[].nilai`1–4 dibanding maksimum. Rekam tanpa penautan kelas tidak dimasukkan. Observasi program asrama belum mempunyai pemetaan peserta sekolah/rubrik baku.
- Kurikulum: kelas yang mempunyai jadwal / kelas sekolah, jumlah kalender target materi bertanggal. Ini belum mengukur kelengkapan jam/mapel, RPP, atau silabus.
- Sarpras, manajemen, keuangan: kategori tersedia dengan status sumber/standar belum ditetapkan, bukan angka0. Keuangan tidak dibaca atau diubah.

Tidak dibuat skor mutu total: bobot, standar dan sumber yang belum tersedia perlu ditetapkan lebih dahulu. Error pembacaan data menggagalkan pemuatan agar tidak disajikan sebagai nol. Denominator kosong ditampilkan “—”.

## Mode hemat data

Halaman awal hanya kartu delapan bidang; memilih bidang menampilkan kartu indikator tanpa pembacaan indikator. Sumber data baru diambil ketika indikator dipilih (contoh: Hasil Ujian hanya exam_sessions, Tahfiz hanya quran_records dan quran_targets). Cache promise per sumber berlaku selama satu halaman terbuka dan tidak dibagikan antar akun/tahun. Filter dan kunjungan ulang memakai data tersebut. Tombol Perbarui hanya menyegarkan sumber indikator aktif. Kegagalan dapat dicoba ulang; hasil permintaan lama tidak menimpa halaman setelah kembali. Pemilihan sumber belum mengubah struktur database: sumber yang dipilih masih dibaca per tahun, lalu disaring unit/periode. Tidak ada prefetch semua indikator.
