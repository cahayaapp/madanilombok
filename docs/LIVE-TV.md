# Madani Live TV

Konsep mengikuti layar referensi pengguna di https://cahayaapp.com/live/: pilih unit, lalu satu kategori memenuhi layar dan berganti otomatis. Seluruh data, logo, warna, koordinat, dan zona waktu tetap Madani. Tidak ada migrasi data Cahaya.

## Penggunaan

Buka https://app.almadanilombok.com/live dan pilih **Putra**, **Putri**, atau **Gabungan**. URL langsung:

- `/live/putra/`
- `/live/putri/`
- `/live/gabungan/`

Setiap layar memutar Renungan, Salat, Setoran, Guru, dan Santri. Nama ditampilkan per kategori beserta jumlah, persentase, waktu data, dan nomor halaman. Maksimal 12 nama di desktop / 8 di ponsel per halaman; halaman bernama berganti setelah 13 detik, layar lainnya 9 detik. Jadwal salat dan jam WITA tetap terlihat. Tombol kanal, jeda, berikutnya, dan layar penuh tersedia; panah dan Spasi juga bekerja. Animasi menghormati `prefers-reduced-motion`.

Tidak memerlukan login atau tab Studio terbuka. `/admin/live.html` hanya menjadi pintasan menuju pilihan layar. Mekanisme Studio manual sebelumnya sudah diganti.

`?demo=1` pada URL unit menampilkan data sintetis dengan label **PRATINJAU · DATA CONTOH**. Mode normal tidak memakai contoh sebagai fallback.

## Pembaruan otomatis

`.github/workflows/live-tv.yml` menjalankan `scripts/publish-live.mjs` setiap menit 07 dan 37, saat file penerbit berubah di main, atau melalui Run workflow. Jadwal GitHub dapat tertunda; ini pembaruan berkala, bukan streaming per detik. TV memeriksa snapshot setiap 5 menit dan menandai keterlambatan setelah 75 menit. Saat hari WITA berganti, nama kemarin dibersihkan sampai snapshot hari baru tersedia.

Workflow dirancang menggunakan Workload Identity Federation Google, tanpa menyimpan kunci service account atau token pribadi di repository. Rencana identitas (belum diterapkan):

- Project `madanilombok-f692d` / `986196180038`.
- Pool `madani-live-github`, provider `github`, issuer `https://token.actions.githubusercontent.com`.
- Penerima: hanya repository GitHub `cahayaapp/madanilombok`, branch `refs/heads/main`, workflow `.github/workflows/live-tv.yml`; verifikasi numeric repository ID dan owner ID saat setup.
- Service account `madani-live@madanilombok-f692d.iam.gserviceaccount.com`.
- `roles/iam.workloadIdentityUser` hanya pada service account tersebut untuk principal repository terverifikasi.
- `roles/firebasedatabase.admin` pada project untuk service account penerbit. Ini izin admin pada RTDB project, bukan pembatasan izin ke node; kode penerbit membatasi baca ke sumber fitur dan tulis ke `madani_live` saja. Jangan menyatakan pembatasan kode sebagai batas IAM.
- API IAM, IAM Credentials, dan STS perlu diaktifkan jika belum aktif. Tidak ada perubahan billing atau DNS.

Penyiapan IAM **ditolak oleh pemeriksaan persetujuan otomatis** pada 12 November 2026 karena belum ada otorisasi spesifik pengguna atas penerima, izin, dan cakupan produksi. Tidak ada resource/izin IAM yang dibuat. Memerlukan persetujuan khusus sebelum setup. Karena itu workflow belum bisa diklaim berjalan otomatis.

Rujukan teknis: [federasi identitas deployment](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [Google GitHub auth](https://github.com/google-github-actions/auth), [jadwal GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Firebase REST authentication](https://firebase.google.com/docs/database/rest/auth).

## Definisi data

- **Unit:** santri mengikuti `gender` master, bukan menebak nama. Gender belum diketahui tampil hanya di Gabungan. Guru mengikuti santri pada kelas/kelompok jadwal mengajarnya; kelas campuran dapat membuat guru muncul di kedua layar. Gabungan memakai ID canonical dan menghitung tiap orang sekali.
- **Setoran:** anggota aktif halaqah Al-Qur’an aktif, di luar kelompok Bahasa Arab/mapel. Setoran Tahsin/Tahfiz/Muroja’ah hari ini yang tersimpan dan belum dihapus dihitung sekali per santri. Belum setoran bukan alfa.
- **Guru:** mengikuti jadwal aktif terkonfirmasi, scope per role, kalender pendidikan. Status hadir diutamakan, lalu izin disetujui/sakit tercatat, tidak hadir tercatat, jadwal mendatang, dan belum absen. Tidak menyamakan jadwal mendatang dengan absen. Guru unit tanpa jadwal yang dapat dikaitkan tidak ditebak dari gender guru; rekam nyata tanpa jadwal tetap dapat tampil pada Gabungan.
- **Santri:** memakai presensi FINAL terakhir hari ini dari KBM/program asrama dengan fallback presensi lama; tidak ada data menjadi **belum tercatat**, bukan alfa. Satu santri dihitung sekali.
- Semua tanggal mengikuti `Asia/Makassar` / WITA. Snapshot kedaluwarsa tengah malam kampus.

Proyeksi publik hanya berisi nama, label kelas/unit, status, total, unit, tanggal, waktu pembaruan, dan kedaluwarsa. Tidak memuat NISN/NIK, UID, kontak, GPS, alasan izin, diagnosis, nilai, konseling, atau keuangan. Data masuk dibangun kembali melalui allowlist, divalidasi sebelum tulis. Tidak ada arsip publik atau roster localStorage. TV hanya membaca `madani_live/{putra,putri,gabungan}`; penolakan akses membersihkan nama lama.

Penerbit membaca node sumber bernama, bukan seluruh database. Node historis yang bertingkat per tahun disaring hari ini di proses penerbit; belum menggunakan indeks harian baru. Kegagalan salah satu sumber membatalkan seluruh publikasi agar ringkasan parsial tidak mengganti data lengkap. Tulis memakai PATCH tiga snapshot publik, tidak mengubah sumber. Tidak membuka cabang `madani_app` ke publik.

## Waktu salat

Hisab lokal memakai koordinat kampus yang diberikan pengguna: `-8.5854457, 116.5755207`, UTC+8, Subuh 20°, Isya 18°, Asar standar, ihtiyat 2 menit. Berlabel **Hisab kampus**, bukan jadwal resmi Kemenag. Rujukan: [PrayTimes](https://praytimes.org/calculation), [Bimas Islam](https://bimasislam.kemenag.go.id/jadwal-sholat).

## Publikasi dan verifikasi 12 November 2026

- 63 pengujian Live, proyeksi unit, rendering role/route, dan kontrak keuangan lulus. Mencakup isolasi unit, duplikasi nama/ID, kelas campuran, sumber gagal, proyeksi field, penolakan akses, pergantian hari, paginasi, dan jeda. Pengujian memakai data sintetis, tanpa write operasional.
- JavaScript diperiksa sintaksnya, JSON dan workflow divalidasi, `git diff --check` bersih.
- Browser 1280×720: 12 nama tampil utuh tanpa overflow; layar Gabungan memakai data contoh berlabel.
- Pembacaan sumber nyata berhasil: 115 santri Putra, 131 Putri, 246 Gabungan; 60/75/135 peserta Al-Qur’an; 30/29/38 guru pada saat pemeriksaan. Ini jumlah populasi rekap, bukan semuanya berstatus hadir.
- Aturan publik unit telah lolos dry run dan dideploy. Readback sama persis dengan kandidat; seluruh aturan privat dan keuangan identik dengan salinan produksi sebelum perubahan.
- Tiga snapshot asli hari ini berhasil disimpan hanya pada `madani_live`, lalu diverifikasi HTTP 200 tanpa login dan lolos validasi tanggal/isi. Ini penerbitan satu kali, bukan bukti otomasi sudah aktif.
- Frontend masih harus dipush ke GitHub Pages. Terminal tidak memiliki autentikasi GitHub; GitHub Desktop sedang dipakai untuk repository `fajrulislam`. Jangan menyebut URL Madani Live sudah tayang sebelum HTTP dan tampilan produksi diverifikasi.
- Otomasi IAM masih menunggu persetujuan yang dijelaskan di atas. Penerbitan satu snapshot tidak membuktikan jadwal otomatis aktif.

Perintah tes:

```sh
MADANI_JSDOM_MODULE=/absolute/path/to/jsdom/lib/api.js node --experimental-vm-modules --test tests/live-display.mjs tests/live-ui.mjs tests/live-projection.mjs tests/role-rendering.mjs tests/finance-spark-cutover.mjs
```
