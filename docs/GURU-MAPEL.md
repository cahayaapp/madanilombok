# Guru Mapel — port workflow Cahaya ke Madani

Referensi: `fajrulislam/home-guru.html`, `js/guru-home-hub.js` v204, `js/guru-home-actions.js` v204, `guru/absensiPembelajaran.html`, `guru/capaian-materi.html`, `guru/inputNilaiUjian.html`, `guru/inputSetoranTahfiz.html`, `guru/tindak-lanjut.html`, `guru/gurumenulis.html`, `guru/lapor-pelanggaran.html`, `pusat-asesmen/guru.html`, dan `js/weekly-kpi-v2.js` v3. Sumber dikonfirmasi pengguna. Tidak ada konfigurasi, roster, akun, atau koordinat Cahaya yang dipindahkan.

## Implementasi

Route Guru Mapel memakai handler khusus `assets/js/teacher/routes.js`; role lain tetap memakai handler sebelumnya. Beranda memakai susunan hub asli: header/logo, sapaan, empat kartu cepat, sembilan menu, pilihan role, notifikasi ke pesan, dan sheet target/capaian materi. Grid, ukuran kartu, dan hierarki huruf hub diturunkan dari CSS referensi; warna tetap Madani. Kalender tetap tersedia melalui navigasi. Tampilan fitur memakai komponen Madani dengan urutan langkah dan aturan yang dipetakan dari referensi. Ini belum merupakan bukti kesamaan pixel seluruh halaman Cahaya.

- Presensi guru per jadwal/per tanggal, GPS otomatis, status tepat waktu atau selisih menit terlambat. Toleransi radius mengikuti referensi: akurasi dibatasi 35–350 m, ditambah 60 m. Check-in pertama tidak ditimpa. Jam lokal WITA, sesuai lokasi Madani.
- Presensi KBM dua tahap: Hadir/Belum Hadir/Izin/Sakit; tahap akhir menyelesaikan Belum Hadir menjadi Terlambat/Alfa/Izin/Sakit. Status final tetap terkunci saat nilai harian atau materi diperbarui. Hadir +30, Al-Qur'an +40, terlambat −20, alfa −40 adalah evidence pembelajaran, **bukan otomatis poin kasus Konselor**.
- Materi dibuat mengikuti kalender pertemuan semester. Target dapat diedit; isian kosong menonaktifkan target tanpa menghapus bukti lama. Capaian TERCAPAI/BELUM_TERCAPAI, analisa penyebab dan tindak lanjut wajib untuk yang belum tercapai. Jeda kalender mendukung rentang tanggal, unit dan kelas yang terdampak. Target tersedia mewajibkan pilihan materi pada KBM, kecuali pelajaran Al-Qur'an.
- Nilai: tujuh skema komponen/bobot referensi; pilihan pelajaran, bulanan/triwulan/semester; kartu santri, draft, rata-rata, remedial, keterangan, pemeriksaan sebelum final, serta kunci final. Kosong bukan nol; KKM 75 disimpan sesuai input nilai referensi.
- Tindak lanjut: mengambil nilai 0–75, urutan terendah, prioritas ≤60, filter periode/status, klarifikasi sebab, target, strategi, tenggat, hasil dan status pada rekam sama.
- Tahsin/Tahfiz/Murojaah: roster dari ID siswa dan assignment kelas/halaqah yang sama; surat/rentang ayat tervalidasi, total ayat, baris mushaf, lahn jali, predikat, target harian, empat indikator tahsin 1–4 dan nilai /100, jenis/hasil talaqqi, catatan, riwayat. Guru tidak membuat siswa baru.
- Penempatan Tahsin/Tahfiz memakai riwayat studentId, tahun ajaran, program/level dan tanggal berlaku. Admin → Program Al-Qur’an menyimpan perpindahan sebagai rekam baru; Tahsin hanya peserta yang ditempatkan, Tahfiz mengikuti komplemennya seperti referensi. Skema ujian membatasi mapel dan level yang sesuai. Perubahan penempatan diperiksa ulang sebelum simpan; nilai final tetap mempertahankan peserta tersimpan.
- Lapor kasus: beberapa siswa untuk satu kejadian, sumber laporan, tiga bidang, kronologi, kritis, bukti foto JPEG maksimum sisi 720px; batch atomik menuju inbox Konselor. Tidak otomatis dibagikan ke wali.
- Guru Menulis: pilihan pelajaran/pertemuan, editor format, draft sesi, hitungan kata, simpan/edit, pembaca dengan ukuran huruf, arsip tulisan, tautan Google Drive, impor TXT/DOCX/PDF di browser. HTML disanitasi. Tidak mengunggah file ke akun Drive atau backend Cahaya. Parser DOCX/PDF sama versi referensi dan dimuat saat dipakai; impor dokumen belum diuji dengan file riil pada browser.
- Refleksi bulanan/pekan 1–4: lima dimensi + delapan KPI. Snapshot KPI objektif disimpan terpisah dari rating diri.
- KPI pekan kerja memakai formula referensi: operasional 55, kualitas 25, keteladanan 20; syarat reward total ≥90, kualitas ≥20, keteladanan ≥16, tanpa critical failure, sudah ditutup manajer. Guru hanya membaca; data penilai yang belum ada tetap kosong. Delapan KPI bulanan untuk asesmen memakai adaptor ID Madani ke rumus v181; nilai null tidak menjadi nol.
- Wali membaca sesi pembelajaran baru dan nilai final, mempertahankan catatan lama; setoran kelas dan halaqah tetap memakai studentId yang sama.

## Jadwal dan GPS yang belum dikonfirmasi

Seed memiliki 214 baris jadwal SD tanpa `teacherStaffId`. Jadwal itu tidak diganti. Jadwal dalam scope ditampilkan, tetapi presensi dan KPI memerlukan guru pada baris jadwal atau scope akun **kelas sekaligus mapel**. Scope unit/seluruh kelas saja tidak dianggap kewajiban mengajar semua pelajaran.

Jika suatu kelas dalam scope belum punya jadwal sama sekali, aplikasi membuat contoh virtual Senin/Rabu/Jumat 08.00–08.45 menggunakan kelas/mapel master. Label Contoh selalu terlihat. Tidak menulis contoh ke database dan tidak menghitungnya sebagai kewajiban KPI; simpan presensi contoh dinonaktifkan. Admin dapat mengonfirmasi jadwal melalui Master Data → Jadwal Pelajaran. Jadwal yang sudah ada milik guru lain tidak memicu contoh pengganti.

Admin → **Lokasi Absensi Guru** menyediakan nama, unit opsional, latitude, longitude, radius meter, status. Node `settings/teacherAttendance/locations/{id}`. Radius awal form 700 m seperti referensi, tetapi **tidak ada koordinat default**. Jawaban pengguna “ya” pada pertanyaan lokasi bukan koordinat; GPS tetap menolak penyimpanan bila lokasi Madani belum diisi.

## Skema baru (semuanya di `madani_app`)

| Node | Isi |
| --- | --- |
| `academic/teaching_attendance/{year}/{staff}/{date}/{schedule}` | GPS dan check-in per jadwal |
| `academic/learning_sessions/{year}/{staff}/{date}/{schedule}` | AWAL/FINAL, siswa, nilai harian, materi |
| `academic/material_targets/{year}/{staff}/{class__subject}/semester_N/{date}` | Target per pertemuan; metadata revisi pada folder semester |
| `academic/material_completions/{year}/{staff}/{class__subject}/{semester__date}` | Capaian dan tindak lanjut |
| `academic/exam_sessions/{year}/{staff}/{session}` | Draft/final, skema, komponen dan studentId |
| `academic/exam_followups/{year}/{staff}/{session__student}` | Perbaikan hasil belajar |
| `academic/teacher_writings/{year}/{staff}/{id}` | Tulisan dan metadata lampiran |
| `academic/teacher_reflections/{year}/{staff}/{month__week}` | Refleksi + snapshot KPI |
| `academic/weekly_kpi/{year}/{staff}/{week}` | Observations, exemplary, criticalFailures, closure, reward dari penilai |
| `academic/teacher_observations/{year}/{staff}/{id}` | Indikator observasi KPI bulanan |
| `academic/quran_placements/{id}` | Penempatan program/level efektif per tanggal, studentId dan academicYearId; hanya admin |
| `academic/quran_targets/{year}/{student}` | Target baris harian |
| `academic/quran_records/{year}/{class-or-group}/{student}/{id}` | Setoran, node lama diperluas untuk kelas |
| `boarding/case_evidence/{year}/{incident}` | Foto bukti pada laporan yang masuk inbox lama |

Transaksi sesi memakai versi dan timestamp server. Penulisan capaian dari KBM dilakukan sesudah transaksi presensi; bila langkah kedua gagal, UI menyatakan presensi sudah tersimpan dan meminta sinkron ulang, tanpa menimpa dengan versi lama. Tidak ada pemindahan data lama atau penulisan database produksi saat implementasi/uji.

## Batas verifikasi dan selisih yang tetap terbuka

- Belum uji login akun guru riil, GPS perangkat di kampus, Firebase Emulator/concurrency server, maupun deploy rules. Rules tetap pilot: baca root bagi akun aktif masih luas; pembacaan wali memfilter child ID di adaptor, bukan klaim isolasi server penuh.
- Halaman penilaian kepala sekolah untuk memasukkan observasi dan menutup KPI mingguan bukan bagian port Guru ini. Guru tidak diberi hak menilai sendiri. Data observasi lama manajemen belum otomatis dimigrasikan ke format penilaian baru.
- Cabang spesifik sumber untuk kelas gabungan, guru pengganti, kelompok virtual Juz, pembukaan revisi nilai oleh admin belum dipetakan pada data dan UI Madani. Jangan menyebut seluruh workflow sudah setara 100%.
- Layout setiap subhalaman bukan salinan HTML penuh sumber; hub dan alur utama telah diadaptasi. Uji visual dilakukan pada hub, sheet jadwal, pemilihan jadwal KBM dan kartu absen awal; belum ada perbandingan pixel seluruh halaman.
- Bukti foto/import DOCX/PDF dan izin GPS perlu uji perangkat. Ketergantungan parser mengikuti referensi, bukan audit keamanan paket terbaru.
- Keuangan, identitas tosca/emas, nonaktif Jurnal Liburan dan istilah Wali Kelas dipertahankan.

## Pengujian

`teacher-model.mjs`: 8 tes aturan, waktu, jadwal, GPS, tahap absensi, nilai dan KPI.
`teacher-rules.mjs`: 3 tes ekspresi kepemilikan dan kunci; bukan emulator.
`teacher-ui.mjs`: 11 tes rendering dan workflow termasuk simpan/finalisasi, kasus multi-siswa, refleksi, adaptor wali dan sanitasi tulisan. Semua memakai data simulasi dan repository dalam memori.

Perintah ada di `tests/README.md`. Screenshot lokal memakai nama Guru Madani dan siswa simulasi, tidak merepresentasikan akun/data produksi.

Hasil akhir lokal: 60 tes lulus (36 aturan/model dan 24 UI), 49 berkas JavaScript lolos syntax check. JSON valid, diff bersih dari whitespace error, modul dan rules keuangan identik terhadap HEAD. Tidak ada deployment.

Pembaruan 4 Oktober 2026: jadwal SMP asli dan mentor sudah tersedia dalam master lokal. Kelas gabungan PJOK yang dikonfirmasi pengguna kini memakai satu sesi guru per periode dengan roster kedua rombel, termasuk presensi dan nilai. Lihat `SMP-UPDATE-2026-10-04.md`; status database produksi tetap terpisah.
