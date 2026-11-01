# Minimart dan Bendahara — Firebase Spark langsung

Status 1 November 2026: **aktif di produksi** pada https://madanilombok-f692d.web.app. Firebase Spark langsung, tanpa Cloudflare, Cloud Functions atau server sendiri. Tetap tunduk pada [kuota Firebase Spark](https://firebase.google.com/pricing); kapasitas volume besar belum diukur.

Akun kasir `mart@madani.app` dibuat setelah lookup exact email memastikan belum ada; scope PUTRA, password awal sesuai permintaan pengguna melalui provisioning tersembunyi. Kasir existing tetap tersimpan. Role Bendahara ditambahkan ke **Munawarah Nazari (`nazari@madani.app`)**, sesuai instruksi eksplisit; role guru_mapel/guru_wali dan password tidak diubah. Pengguna memilih role Bendahara setelah masuk.

Rules dibangun dari snapshot live, bukan menimpa aturan nonkeuangan dengan baseline repository. **22 tes emulator memakai rules live lulus**, termasuk kompatibilitas tagihan lama. Saat cutover, gate tetap off; hanya metadata `pinConfigured=false` ditambahkan pada satu wallet yang belum mempunyai PIN. Perbandingan menyeluruh finance sebelum/sesudah membuktikan semua nilai saldo, tagihan, mutasi dan riwayat lama lainnya identik. Tidak ada transaksi percobaan atau data dummy produksi. Gate kemudian diaktifkan setelah checksum lima file frontend cocok dengan rilis Hosting.

Cadangan privat dan hasil verifikasi disimpan di `outputs/finance-release-private/20261101/` (permission direktori0700/file0600, diabaikan Git dan Hosting). Tidak ada password/token pada cadangan. Catatan aktivasi/penugasan tersimpan pada audit_logs. Produk/stok produksi masih kosong saat aktivasi; petugas memasukkan barang aktual sebelum melayani belanja.

Paket Hosting awal dihentikan sebelum rilis karena daftar file mencakup `.git`; draft CREATED tersebut dihapus. Pengecualian direktori tersembunyi ditambah, manifest252file diperiksa, lalu rilis bersih berhasil. Tidak ada rilis publik dari draft yang dihentikan.

## Jalur aplikasi

- Firebase Authentication dan akun Madani existing tetap dipakai. Role kasir/minimart menuju satu POS, menu kasir lama dialihkan. Tidak ada login atau dompet paralel.
- `assets/js/minimart/client.js` memakai Firebase RTDB REST dengan ID token pengguna. Tidak ada endpoint backend aplikasi. `server/minimart/local-server.mjs` hanya host file untuk pengujian lokal.
- `assets/js/finance-spark/protocol.js` menyusun proposal multi-path; **bukan sumber otorisasi**. `scripts/finance-spark-rules.mjs` menghasilkan aturan yang memeriksa harga, saldo, stok, identitas, scope, ledger, shift, dan seluruh tautan terhadap keadaan database saat commit.
- `database.spark.rules.json` dan `database.rules.json` diselaraskan dengan rules live yang terpasang. `firebase.spark.json` menunjuk rules Spark; kedua konfigurasi Hosting mengecualikan direktori tersembunyi, log dan cadangan.
- Semua transaksi memerlukan `settings/finance/sparkEnabled === true`. Gate produksi telah diaktifkan setelah verifikasi cutover.

## Alur terintegrasi

Bendahara memiliki Keuangan Pesantren (pengembangan ditunda sesuai instruksi), SPP Santri, dan TopUp Uang Digital Santri. Topup menggunakan `finance/wallets/{studentId}/spending`, sekaligus menambahkan `wallet_transactions`; tabungan `savings` tidak dipotong untuk belanja. SPP memakai `finance/bills` dan `finance/payments` existing, terpisah dari topup.

POS mencari nama/NIS/ID dari master santri existing, menyimpan studentId beserta snapshot nama/NIS, menampilkan saldo terpilih, dan mendukung CASH/WALLET/MIXED. Wali melihat saldo, mutasi, tagihan, pembayaran serta riwayat belanja anak yang ditautkan. Kasir tidak boleh topup atau mengubah saldo bebas. Bendahara tidak mendapat hak kasir otomatis.

Produk, barang masuk, opname, pengeluaran stok, shift, riwayat dan laporan memakai UI minimart yang sama. Layout desktop katalog/keranjang berdampingan, mobile keranjang mudah diakses. Struk cetak/PDF browser, teks dan laporan CSV tersedia. Diskon, koreksi stok dan refund memerlukan supervisor. Modal terakhir disalin pada penjualan sebagai estimasi HPP.

## Konsistensi dan kontrol

Satu PATCH atomik berisi saldo, mutasi, stok, shift, penghitung harian, dan receipt/audit. Aturan menolak bila salah satu pasangan hilang atau nilai salah. Concurrent proposal yang menggunakan nilai lama ditolak; klien membaca ulang lalu mencoba dengan ID sama. Ini **bukan** pola baca lalu tulis tanpa pemeriksaan server. Lihat [atomic updates RTDB](https://firebase.google.com/docs/database/web/read-and-write).

Receipt `finance/sparkOps/{operationId}` tidak dapat diubah/dihapus klien. Fingerprint permintaan dan UID mengikat retry. UI mempertahankan ID saat double-click, reload atau respons terputus. Respons sukses harus diikuti pembacaan receipt dari server sebelum keranjang dibersihkan. Status tak pasti tidak dianggap gagal definitif atau dibuatkan ID pengganti.

Nilai rupiah integer; waktu receipt timestamp server; tanggal usaha WITA. PIN hash tersimpan pada wallet existing dan tidak dapat dibaca kasir/wali. Proof PIN milik UID sendiri, terikat operationId, berlaku dua menit. Maksimal lima percobaan tanpa keberhasilan per lima menit, jeda dua detik setelah percobaan belum berhasil. Pembelian PIN valid mereset jatah untuk pelanggan berikutnya. PIN plaintext tidak disimpan pada receipt/sessionStorage. Jam perangkat yang salah dapat menyebabkan penolakan aman; belum ada koreksi jam otomatis.

Grant read pada ancestor dipindahkan ke cabang nonkeuangan agar hash/keuangan tidak terbuka melalui ancestor. Generator menolak write ancestor atau wildcard tak dikenal yang perlu tinjauan. Aturan nonkeuangan dipertahankan. Klien finance lama tidak boleh tetap menulis setelah pergantian rules.

| Sumber existing | Kegunaan |
| --- | --- |
| `finance/wallets` | Satu saldo santri, PIN tersembunyi |
| `finance/wallet_transactions/{year}/{student}/{operationId}` | Mutasi saldo immutable |
| `finance/products/{unit}/{id}` | Produk dan stok yang sama |
| `finance/bills`, `finance/payments` | Tagihan/pembayaran SPP |
| `students`, `users` | Identitas dan scope existing |

| Metadata protokol baru di `finance` | Kegunaan |
| --- | --- |
| `sparkOps/{id}` | Receipt dan audit operasi berhasil |
| `sparkShifts`, `sparkActiveShifts` | Rekonsiliasi kas dan satu shift aktif |
| `sparkDaily/{student}/{day}` | Batas belanja harian, dihitung bruto |
| `sparkRefunds/{saleId}` | Penanda refund satu kali |
| `sparkBillPeriods/{year}/{student}/{period}` | Pencegahan SPP periode ganda termasuk arsip lama |
| `sparkPinProofs`, `sparkPinChanges` | Validasi PIN, akses terbatas |

Tidak menyalin saldo atau transaksi baru ke handler kasir legacy. Arsip penjualan/refund lama tetap dibaca untuk riwayat/laporan. **Refund langsung arsip lama belum didukung**: tombolnya dinonaktifkan; jangan menghapus arsip atau mengoreksi saldo manual untuk menyiasatinya.

## Pengujian yang dapat diulang

Node 22+, Java 21, dependency `server/minimart` diperlukan:

```sh
npm ci --prefix server/minimart --no-audit --no-fund
node scripts/minimart-emulator.mjs test
```

Runner membuat kandidat rules lengkap pada temporary directory, menjalankan Auth/RTDB demo terisolasi (9199/9100, hub4410), timeout tiga menit, lalu menghentikan prosesnya. Admin SDK hanya fixture uji; operasi yang diuji menggunakan ID token pengguna dan PATCH yang tunduk pada Rules. Tidak ada akun/data produksi pada fixture.

Uji manual: `node scripts/minimart-emulator.mjs serve`, buka `http://127.0.0.1:4179`. Auth9099/RTDB9000 terpisah dari port test. Tidak menimpa sesi demo yang sedang aktif. Akun demo mart memakai kredensial privat `/tmp/madani-minimart-accounts.json`; password yang diminta pengguna telah disetel pada sesi uji sebelumnya. Provisioning akun existing tidak mengganti password. Akun baru bisa diberi password melalui environment privat `MINIMART_PASSWORD`, bukan source/log/history terminal.

Verifikasi tahap Firebase langsung:

- **22 tes Auth/RTDB emulator lulus**, termasuk topup bendahara, wallet/cash/mixed, refund barang terpilih, SPP, overpayment bersamaan, stok terakhir dua kasir, topup bersamaan checkout, harga/actor palsu, saldo kurang, batas harian, akun nonaktif, scope wali, pembacaan hash ditolak, PIN throttle, respons hilang, dan arsip SPP anti-duplikat.
- **143 tes lokal/model/UI/role lulus**, termasuk alur POS dan bendahara, retry pending, santri, struk, laporan, routes, pengelolaan akun, serta planner cutover offline.
- Browser visual versi UI sebelumnya sudah diperiksa; pergantian transport Spark diuji melalui klien nyata pada emulator dan tes DOM. Belum QA visual ulang langsung pada browser, printer/scanner fisik, staging remote, volume operasional, atau transaksi uang produksi. Login produksi dan pembacaan kasir diverifikasi terpisah tanpa transaksi.

## Prosedur untuk pembaruan produksi berikutnya

1. Ambil rules produksi terbaru saja; hasilkan kandidat dari snapshot tersebut dengan `node scripts/finance-spark-rules.mjs INPUT_RULES OUTPUT_RULES`, tinjau diff nonkeuangan dan uji emulator lagi. Kandidat repository bukan jaminan identik rules live.
2. Hentikan sementara writer finance lama dan tutup shift lama. Siapkan metadata dengan `scripts/finance-spark-cutover.mjs`: planner offline menerima **finance yang dibutuhkan saja**, tidak melakukan ekspor seluruh database/koneksi/write. Hasil berisi pinConfigured, expiryDay, indeks periode SPP lama dan baseline belanja pada hari cutover; tidak mengubah nilai saldo/stok. Duplikat tagihan/tanggal tak diketahui harus diselesaikan dahulu. Jangan gunakan snapshot lama saat operasi masih berjalan.
3. Terapkan metadata melalui administrasi yang berwenang setelah ditinjau; belum ada alat auto-apply pada tahap ini. Periksa UID mart existing, role/scope kasir, dan UID petugas bendahara tanpa reset password sembarangan. Jangan menambahkan role bendahara ke kasir.
4. Perbarui rules dan frontend secara terkoordinasi, perbarui cache PWA, lalu aktifkan gate setelah validasi. Tidak menjalankan transaksi dummy dengan uang nyata. Aktivasi pertama telah dijalankan pada 1 November2026. Jangan mengulang baseline setelah ada sparkOps; planner sengaja menolak pengulangan.

Batas eksplisit: maksimal **10 jenis produk per transaksi**; Rules memvalidasi setiap baris. Parent mapping Rules membaca sampai10 studentIds; scope kasir sampai2 unit PUTRA/PUTRI. Refund penuh pada transaksi baru, bukan refund nominal parsial/arsip lama. Batas harian bruto tidak berkurang karena refund. Belum batch/FIFO, kamera barcode, foto produk, atau pengukuran kuota Spark pada volume nyata. SKU/barcode dapat dicari tetapi belum mempunyai indeks unik yang dipaksakan Rules. Jangan menyebut semua fitur lama sudah mempunyai parity penuh.

Kernel Node `engine.mjs`, `treasury-engine.mjs`, `firebase-service.mjs` dipertahankan sebagai referensi/regresi lama; tidak dipanggil aplikasi atau server static. Pengujian lama Admin transaction bukan bukti keamanan jalur Spark; suite otoritatif baru adalah `spark-tests.mjs`.

Verifikasi setelah aktivasi: login mart melalui Firebase Auth dan `createSparkClient.state` dengan ID token kasir (tanpa token admin) berhasil; **114 santri PUTRA** terdeteksi, produk0. Tidak ada write transaksi pada verifikasi. Halaman masuk terlihat di browser; QA visual POS produksi belum tuntas karena browser bawaan gagal memuat navigasi setelah login (`ERR_FAILED`). Endpoint HTML aplikasi mengembalikan HTTP200, dan pemeriksaan klien/API berhasil. Bendahara diverifikasi lewat Auth UID/profil/Rules emulator; tidak masuk menggunakan password pribadi Munawarah.
