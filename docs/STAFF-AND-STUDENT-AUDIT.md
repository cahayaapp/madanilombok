# Audit SDM dan identitas santri — 2 Oktober 2026

## Hasil database aktif

Audit terbatas berhasil membaca node staff, students, classes, users; tidak mengekspor root database, tidak membaca transaksi keuangan, tidak menyimpan nomor identitas/alamat santri atau token login ke berkas audit.

- Santri: 352 (TK 40, SD 132, SMP 100, SMK 80). Tidak ada master santri baru khusus halaqah/GEMA/kamar.
- SDM: 85. Profil akun awal: 8.
- Empat metadata penugasan pimpinan sudah disimpan pada staff database aktif: Abdul Hayyi Direktur + Kepala SMK; Muhammad Tuzri Wakil Direktur + Kepala SMP; Muhasim Kepala Asrama Putra; Nuril Azmi Kepala Asrama Putri. Scope Kepala Sekolah dibatasi per unit; scope Direktur/Wakil lintas unit. Tidak mengubah delapan akun pilot lama.
- Satu pasangan dugaan duplikasi ANIDA NUR AFIFAH (`AMD-SD-0002`, `AMD-SD-0003`): nama dan NIK sama, tetapi NISN, nama ayah dan alamat berbeda. Belum dihapus/digabung; pertanyaan verifikasi diajukan kepada pengguna.
- 82 catatan kamar dan 41 catatan kelompok belum terhubung di seed_validation merupakan antrean pencocokan, bukan orang baru. Semua assignment lokal yang sudah terhubung menunjuk ID santri valid.

## Pembuatan akun

Rencana memuat 85 SDM. 84 terpetakan ke role; Rumiati (Tenaga Kependidikan) menunggu penetapan role. Role dari kandidat nama fuzzy tidak diberikan otomatis. Benturan nama akhir menggunakan akhiran angka yang stabil.

Percobaan akun pertama `hayyi@madaniapp` ditolak Firebase dengan `INVALID_EMAIL`; proses dihentikan. **Belum ada akun SDM baru berhasil dibuat.** Pengguna diminta memilih domain email valid. Jangan menganggap rencana akun sebagai daftar akun yang sudah aktif.

Halaman Admin → Akun menyediakan pratinjau, input domain, pembuatan massal, hasil tiap akun dan unduhan password unik. Password tidak berada di seed/repository. Akun lama tidak ditimpa dan email yang sudah terpakai ditandai untuk pemeriksaan. Gagal menyimpan profil di UI mencoba membatalkan akun Auth baru agar tidak tertinggal tanpa profil.

## Artefak dan uji

- `seed/leadership-assignments.json`: konfirmasi empat pimpinan.
- `seed/staff-account-plan.json`: rencana lokal, belum merupakan akun aktif.
- `seed/student-identity-audit.json`: ringkasan audit lokal tanpa nilai NIK/NISN.
- `scripts/audit-master-data.mjs`: audit ulang lokal, tanpa akses jaringan atau mutasi santri.
- `tests/staff-account-plan.mjs`: benturan email, ulang proses, scope jabatan ganda, tanpa eskalasi role ambigu.

Keuangan dan data santri belum dimutasi oleh pemeliharaan ini. Pembuatan akun, keputusan pasangan duplikasi, dan role Rumiati masih menunggu jawaban pengguna.
