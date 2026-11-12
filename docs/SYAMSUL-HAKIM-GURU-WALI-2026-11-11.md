# Syamsul Hakim — penugasan Guru Wali (belum tersimpan)

Permintaan pengguna: pertahankan Guru Mapel pada `hakim@madani.app`, tambahkan Guru Wali dan lima santri pada foto Dapodik XI TJKT. Guru Wali berbeda dari Wali Kelas.

Target akun: `ISPES8ZTECNyJ5zECmCCep8vYIg1`, SDM `AMD-SDM-0078`.

Manifest persiapan: `seed/imports/syamsul-hakim-mentor-2026-update.json`. ID dan nama manifest cocok dengan seed lokal; kecocokan lokal bukan bukti bahwa rekaman masih ada di produksi.

## Status produksi terakhir yang terlihat

- Editor akun benar: SYAMSUL HAKIM, `hakim@madani.app`, SDM SYAMSUL HAKIM, status Aktif.
- Guru Mapel tetap dipilih dan tetap menjadi role utama.
- **Draf belum disimpan:** Guru Wali dicentang; Adhes Soedirat, ANAM ABQORI, Andreas Dwi Santoso dan BAIN AZIQRA dicentang. Lingkup kelas Guru Wali kosong.
- Abdul Rohim tidak ditemukan melalui pencarian nama di daftar editor. Jangan membuat santri baru atau memulihkan seed tanpa memastikan ID produksi dan kemungkinan penggabungan.
- Tidak ada penyimpanan akun atau penugasan Syamsul yang dikonfirmasi berhasil. Jangan melaporkan pekerjaan selesai.

## Hambatan saat audit

Pembacaan terbatas `students/AMD-SMK-0001` melalui modul repository produksi gagal dengan pesan: “Data belum dapat dimuat dalam 15 detik. Periksa koneksi lalu coba lagi.” Koneksi Firebase disegarkan memakai `goOffline` lalu `goOnline`; belum ada hasil baca ulang yang berhasil. Kendali Safari kemudian dua kali mengalami timeout 30 detik dan reset kernel.

## Kelanjutan yang diperlukan

1. Pulihkan kendali Safari/sesi admin dan baca ulang akun serta lima rekaman siswa secara terbatas. Cocokkan Abdul Rohim dengan NISN pada foto; jangan menampilkan token autentikasi.
2. Audit lima `assignments/mentors/{tahunAktif}/{studentId}`. Impor lokal sebelumnya menghubungkan empat nama selain Abdul Rohim ke `AMD-SDM-0033` (Huril Iptihani); pastikan kondisi produksi terkini.
3. Siapkan penugasan kanonis ke `AMD-SDM-0078` dan scope akun Guru Wali yang konsisten. Menyimpan checklist akun saja belum cukup: `filterScopedStudents` mendahulukan mentorStaffId pada penugasan kanonis untuk santri non-SD.
4. Simpan setelah persyaratan konfirmasi alat untuk perluasan akses sensitif terpenuhi. Pertahankan role, scope Guru Mapel, jadwal dan riwayat lama. Jangan mengubah `homeroomStaffId`, finance, atau riwayat mentoring.
5. Baca ulang hasil server dan verifikasi kelima santri lewat filter role Guru Wali serta tampilan akun. Periksa scope mentor sebelumnya bila memang dialihkan, dengan mempertahankan binaan lain.

Tidak ada perubahan kode aplikasi pada upaya ini. Manifest adalah persiapan, bukan bukti impor produksi.

## Pemeriksaan ulang 12 November 2026

- Safari kembali dapat membuka halaman admin. Daftar akun masih menunjukkan Syamsul hanya Guru Mapel; editor/draf lama sudah tidak terbuka. Huril masih menampilkan Adhes, ANAM, Andreas, BAIN, Habiburohman dan Joni sebagai binaan.
- Halaman Data Santri terbaru menampilkan 250 rekaman (245 aktif). Pencarian `Rohim` tidak menemukan Abdul Rohim; pencarian NISN `0085862261` menghasilkan 0 record. Identitas lokal Abdul cocok dengan foto pengguna, tetapi keberadaan/arsip ID produksi masih harus dipastikan.
- Input dan eksekusi console Safari belum dapat dikendalikan secara andal. Jangan menyimpulkan bahwa penugasan telah berubah berdasarkan teks yang sekadar masuk pada prompt.
- Browser dalam Codex dibuka pada situs Madani yang sama untuk kendali DOM langsung. Browser ini belum login; pengguna diminta login admin pada panel tersebut. Kata sandi tidak diminta melalui chat. Tidak ada penulisan akun/penugasan yang berhasil dikonfirmasi pada pemeriksaan ulang ini.

## Kelanjutan melalui VS Code (12 November)

Pengguna memilih VS Code dan menyetujui dialog berbagi tab. Sesi admin file lokal tersedia. Upaya input console salah fokus masuk ke nama akun dan sempat tersimpan; nama segera dikoreksi menjadi `SYAMSUL HAKIM` melalui editor, lalu diverifikasi kembali dari server pada halaman audit. Role saat itu tetap hanya Guru Mapel.

Halaman lokal khusus `admin/syamsul-hakim-maintenance.html` membaca data server tanpa menulis saat dimuat. Audit berhasil memastikan:

- Abdul Rohim: master `students/AMD-SMK-0001` tidak ada, tidak ada kecocokan nama/NISN lain. Penempatan aktif `CLS-SMK-XI-TJKT` pada ID tersebut masih ada. NISN foto/sumber lokal `0085862261`.
- Empat santri lain cocok dengan ID sumber dan kelas XI TJKT. NISN ANAM yang benar adalah `0093176877`. Seluruh empat penugasan masih ke Huril `AMD-SDM-0033`.
- Akun Huril `E8M6dq2ugydBsgPRdncDw9PPabF3` memiliki enam binaan; setelah pengalihan, Habiburohman `AMD-SMK-0028` dan Joni Saputra `AMD-SMK-0032` harus tetap ada.
- Masing-masing dari lima node riwayat mentoring saat audit bernilai kosong.

Rencana khusus siap di tombol **Simpan Guru Wali dan Lima Santri**. Model hanya membuat patch terarah untuk pemulihan identitas minimal Abdul pada ID yang sama, lima penugasan mentor, role/scope Syamsul, serta penghapusan empat ID dari scope mentor lama. Default role dan scope Guru Mapel, jadwal, kelas, Wali Kelas, riwayat, dan keuangan tidak ditulis. Backup terarah disertakan dalam update atomik; setiap path diperiksa ulang sebelum simpan dan hasil difilter memakai fungsi Guru Wali aplikasi.

Konfirmasi tepat sebelum perluasan akses dan pemulihan rekam telah diminta melalui pertanyaan async **“Simpan perubahan tersebut”**. Jangan klik tombol sebelum jawabannya datang. Izin berbagi tab VS Code merupakan persetujuan berbeda.

Verifikasi lokal: 63 tes model/editor/mentor/rendering role lulus, termasuk 5 tes maintenance khusus; syntax 177 JavaScript aset dan parsing 60 JSON valid. Percobaan awal tes UI gagal karena jsdom tidak pada resolusi default; pengulangan memakai dependency yang didokumentasikan pada `tests/README.md` lulus. Ini belum bukti bahwa perubahan role/penugasan telah disimpan di produksi.
