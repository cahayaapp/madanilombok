# Sinkronisasi pembina kelompok dan SDM

Nama tampilan berasal dari master SDM melalui mentorStaffId/mentorStaffIds, bukan pencocokan string bebas. sourceMentorName mempertahankan ejaan dokumen. Master kelompok mendukung Pembina Utama dan Seluruh Pembina (multi-ID). Pembaruan 6 Oktober: pengguna memastikan Fahri Gontor adalah Fahri Aldian Effendi (AMD-SDM-0023), serta dua Ida Fitriana adalah satu orang (utama AMD-SDM-0036, duplikat AMD-SDM-0037). Fahri Husain tetap berbeda. Paket lokal sekarang memiliki 13 kelompok terhubung dan 8 kelompok pending; keenam kelompok Bahasa Arab sudah terhubung.

Admin → Import Data → Terapkan Sinkronisasi Guru memeriksa keberadaan kelompok, SDM, nama acuan dan penugasan yang tidak berubah. Jalankan pembaruan Kelompok & Kamar terlebih dahulu. Peran mentor_tahsin_tahfiz ditambahkan untuk Quran; guru_mapel untuk bahasa Arab. appRoles/roleScopes SDM dan roles/roleFlags/roleScopes akun aktif yang staffId-nya cocok diselaraskan. Role utama, akun nonaktif, lingkup kepemimpinan, penugasan kelas/mapel dan konfigurasi keuangan dipertahankan. Tidak membuat akun Auth baru. Akun yang dibuat belakangan perlu memakai rencana SDM terbaru; marker import tidak mengulang sinkronisasi pada akun yang belum ada saat penerapan.

Pilihan halaqah dan roster mentor membaca penugasan berdasarkan ID SDM, mendukung dua pembina dan tidak menampilkan kelompok bahasa Arab/inactive. Guru Mapel melihat kelompok bahasa Arab dan waktu pagi pada beranda serta halaman jadwal. Ini sinkronisasi identitas/roster dan tampilan jadwal kelompok; belum menjadikan bahasa Arab kelompok sebagai seluruh workflow KBM kelas formal (GPS, materi, nilai dan KPI). Jam halaqah tidak dibuat tanpa sumber. Filter UI bukan pengganti Firebase Rules; keamanan database produksi belum diuji.

91 tes lokal lulus sebelum penguatan pemeriksaan pembina tambahan; pengimpor diuji dengan repository tiruan, meliputi pelestarian role pimpinan, role ganda, penolakan identitas berbeda dan impor ulang. Syntax/JSON dan pelestarian finance diperiksa. Belum deploy/live. Script pembangun: scripts/build-group-teacher-links.py. Jika roster dibangun ulang, jalankan script tersebut setelahnya untuk menormalkan nama SDM lagi.

## Konfirmasi 6 Oktober — paket terpisah

Admin → Import Data → **Terapkan Konfirmasi Guru & Bahasa Arab** memakai marker `arabic-staff-confirmed-20261006-v1`, sehingga dapat dijalankan setelah paket sebelumnya sudah diterapkan. Memindahkan referensi master/penugasan dan staffId profil dari Ida 0037 ke 0036, menyatukan unit/role/scope SDM, lalu menghapus duplikat dari node staff dengan salinan sumber di reference/staffIdentityMerges. Tidak menghapus akun Auth, catatan historis, atau finance. Biodata utama SMP dipertahankan; perbedaan biodata lama tersedia di arsip, bukan ditebak.

Menautkan Cordova 3 ke Fahri; Sigor dan Halaqoh Khatam ke Ida. Program pagi umum/GEMA berganti nama menjadi Bahasa Arab tanpa mengubah ID/jam 05.40–06.10 maupun riwayat presensi. Implementasi lokal diuji; belum diterapkan live (sesi terakhir Muhasim, menunggu Administrator).

## Bahasa Arab sebagai pelajaran kelompok

Paket arabic-group-lessons-20261006-v1 mengaktifkan teachingEnabled, subjectId MPL-PONDOK-ARAB-PAGI, dan dailyScheduleId pada enam kelompok. Jadwal Guru Mapel diturunkan dari jadwal 24 jam aktif tahun berjalan (05.40–06.10, Setiap Hari sesuai DOCX), bukan jadwal contoh atau rombel baru. Kelompok GEMA memakai sumber GEMA; lainnya sumber umum. Pengecualian hari khusus belum ditetapkan pada sumber harian, sehingga tidak dibuat otomatis.

Guru wajib memiliki staffId dalam mentorStaffId(s) kelompok; scope rombel formal tidak membatasi kelompok yang memang ditugaskan. Peserta hanya anggota kelompok aktif dan siswa master aktif, tanpa siswa duplikat/merged. groupId disimpan pada presensi guru, KBM dua tahap, target/capaian materi, nilai ujian, tindak lanjut dan tulisan; classId null untuk kelompok. assignment key berawalan group- memisahkan materi/nilai dari rombel formal. Presensi GPS tetap memeriksa radius kampus; penilaian Bahasa Arab memakai skema 50% lisan/50% tulisan yang sudah ada.

167 pengujian lokal lulus termasuk GPS, anggota nonaktif dikecualikan, tahap awal→final, penyimpanan materi, nilai kelompok, larangan akses guru lain, sumber jadwal hilang/inactive/tahun lain. Tidak menguji presensi riil. Rules lama tidak diubah; ini bukan klaim hardening akses server. Kode belum dipublikasikan.
