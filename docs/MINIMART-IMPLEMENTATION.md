# Minimart — audit dan fondasi backend, 1 November 2026

## Status yang dapat dipercaya

**Belum siap digunakan operasional.** Audit terarah selesai; kernel transaksi dan adapter backend khusus emulator tersedia serta diuji dengan mock. Belum ada UI minimart, callable/HTTP endpoint, pemasangan SDK backend, atau pengujian Firebase Emulator. Tidak ada deployment, pembacaan saldo produksi, provisioning akun, perubahan rules, atau perubahan data produksi.

Tahap 1 selesai. Tahap 2/3 baru fondasi backend yang dapat diuji mandiri; belum selesai sebagai fitur aplikasi. Tahap 4 belum selesai. Tahap 5 baru pengujian model dan adapter mock.

## Hasil audit yang tidak perlu diulang

- `assets/js/auth.js`: satu Firebase Auth dengan profil `users/{uid}`, multi-role, penonaktifan dan pencabutan akses. `user-access-model.js` menyaring role melalui `permissions.js`; role `minimart` belum didaftarkan di portal/editor.
- `assets/js/modules/finance.js`: kasir lama menggunakan produk `finance/products/{unitId}`, unit `finance/cashierUnits`, saldo `finance/wallets/{studentId}/spending`, `pinHash` SHA-256, serta limit `settings/finance/dailySpendingLimit` (default 50000). Dompet savings harus tetap terpisah.
- Kasir lama menulis stok, saldo, penjualan dan mutasi secara berurutan dari browser. Kegagalan setelah debit dapat meninggalkan pencatatan tidak lengkap. Refund lama juga beberapa write terpisah. Jalur itu tidak dipakai untuk transaksi minimart baru.
- `database.rules.json` mengizinkan write pada ancestor `finance` untuk akun aktif yang primary role-nya bukan wali. Penolakan child tidak dapat membatalkan grant ancestor. Root read juga luas. Jangan mengaktifkan role minimart pada rules tersebut: bahkan role baru akan memperoleh hak tulis finance lama.
- `assets/js/modules/parent.js` membaca saldo yang sama dan penjualan lama `finance/cashier_transactions/{yearId}`. Riwayat minimart belum ditambahkan ke UI wali.
- `firebase.json` sebelumnya hanya memiliki hosting/database, tidak ada backend Functions. Backend baru dikecualikan dari hosting melalui `server/**`.
- Java launcher tersedia, tetapi `java -version` menyatakan Java Runtime tidak tersedia. Firebase Emulator belum dijalankan.

## Berkas dan kontrak implementasi

`server/minimart/engine.mjs` adalah kernel Node backend; jangan diimpor ke browser. `applyMinimartOperation(finance, operation, context)` tidak mengubah input. Kernel menghasilkan satu snapshot finance dengan saldo, stok, transaksi, mutasi, audit, dan idempotency bersamaan. Snapshot wajib disimpan melalui transaksi database, tidak boleh dengan get/set biasa.

`server/minimart/firebase-service.mjs` menyediakan adapter dependency-injected untuk Firebase Admin Auth/RTDB. Verifikasi token termasuk pemeriksaan revocation; UID, profil, tahun aktif, data santri, limit dan waktu berasal dari server. Ia melakukan satu transaksi pada `madani_app/finance`, membaca santri hanya berdasarkan ID terkait. Tidak membaca/mengekspor seluruh root database. Adapter menolak lingkungan selain host emulator loopback dan project `demo-*`. SDK Auth/Database yang diberikan harus dibuat untuk project/emulator tersebut sebelum adapter digunakan. Belum dipasang sebagai endpoint dan belum dihubungkan ke frontend.

API model:

- `product`: buat/edit/nonaktifkan, SKU/barcode unik per unit, harga/modal integer, kategori/satuan/minimum stok/kedaluwarsa; versi optimistis wajib. Stok awal nol dan tidak dapat diubah lewat metadata produk.
- `stock-in`: jumlah, modal unit, supplier, nota, alasan; stok dan histori bergerak bersama. Modal produk memakai harga beli terakhir, belum average cost/FIFO.
- `stock-adjust`: khusus supervisor, alasan dan expectedStock wajib; opname/rusak/hilang/kedaluwarsa. Pengeluaran nonpenjualan wajib mengurangi stok.
- `checkout`: keranjang multiproduk; qty integer, harga/modal dari database, stok nonnegatif, santri/unit tervalidasi, PIN existing, limit harian termasuk penjualan legacy. Metode `CASH`, `WALLET`, `MIXED`; diskon nominal hanya supervisor. Semua rupiah integer aman. Tunai tidak mengubah dompet. Waktu dari backend; tanggal usaha memakai WITA sesuai lokasi Lombok.
- `refund`: khusus admin/super_admin/director/deputy_director, **refund penuh saja**, alasan wajib; saldo/tunai dikembalikan sesuai porsi pembayaran asal. Stok hanya kembali untuk produk/jumlah pada daftar `returns`; daftar kosong berarti tidak ada stok yang kembali. Transaksi asal dipertahankan dengan status void. Refund uang parsial belum tersedia.

Role `minimart` di kernel wajib scope `roleScopes.minimart.cashierUnits` atau `financeUnit`; tidak mewarisi izin role kasir lama. Supervisor memperoleh seluruh unit. Ini kebijakan backend lokal, **belum registrasi role/izin aplikasi maupun rules database**.

ID operasi wajib dibuat sekali dan dipertahankan ketika retry. Fingerprint mengikat ID ke UID, tahun dan payload selain PIN; ID sama/payload sama mengembalikan hasil asli. ID sama/payload berbeda ditolak. PIN/token/password tidak disimpan dalam receipt/audit/idempotency.

## Skema tambahan (semuanya di bawah finance)

| Path | Isi |
| --- | --- |
| `products/{unitId}/{productId}` | Produk existing, metadata diperluas dan version |
| `wallets/{studentId}/spending` | Saldo belanja existing; tidak membuat dompet baru |
| `wallet_transactions/{yearId}/{studentId}/MM_{operationId}` | Debit/refund existing ledger, source minimart, ID penjualan terkait |
| `minimart/sales/{yearId}/{operationId}` | Receipt canonical dan snapshot item/harga/modal |
| `minimart/refunds/{yearId}/{operationId}` | Refund uang dan rincian stok kembali |
| `minimart/stock_movements/{operationId}` | Penerimaan/koreksi, stok sebelum/sesudah, petugas, waktu, alasan |
| `minimart/audit/{operationId}` | Audit atomik perubahan berhasil |
| `minimart/operations/{operationId}` | Fingerprint dan hasil idempotensi |

Penjualan minimart sengaja belum diproyeksikan ke `cashier_transactions`: handler void lama akan salah memproses tunai/kombinasi dan tidak atomik. Ledger saldo tetap sama. Pembaca parent/laporan perlu digabung dari kedua sumber dengan identitas canonical, tanpa penyalinan yang menyebabkan hitung ganda. Tidak ada rules baru yang dianggap dapat mengamankan child selama grant finance ancestor masih terbuka.

## Pengujian yang sudah dilakukan

```sh
node --test --test-timeout=20000 tests/minimart-engine.mjs tests/minimart-service.mjs
```

38 tes model/adapter mock lulus: skenario A/B/C/D/F; E melalui simulasi optimistic compare-and-swap/retry; double-click dan lost response; larangan stock/saldo negatif; harga browser diabaikan; PIN dan limit; scope unit; penolakan akun nonaktif/dicabut/role lain; integer dan ID tidak sah; produk dan stok; abort commit tidak memberi receipt sukses; lingkungan produksi ditolak sebelum akses SDK.

**Tidak membuktikan** transaksi/concurrency SDK Firebase sebenarnya, enforcement rules, Auth login riil, tampilan desktop/mobile, performa volume produksi, atau settlement tunai. Tidak ada transaksi uji dengan uang asli.

## Pekerjaan berikutnya — urutan wajib

1. Siapkan Java dan dependency SDK terisolasi untuk emulator demo. Uji adapter terhadap Firebase Auth/RTDB Emulator, termasuk retry callback null, disconnect sesudah commit, dua kasir, refund bersamaan, dan kegagalan write. Benchmark transaksi ancestor finance yang akan menjadi titik kontensi.
2. Rancang migrasi semua writer finance existing (saldo, pembayaran, stok, PIN, cashier, refund) bersama aturan akses. Jangan sekadar menambah deny child, dan jangan memutus alur keuangan lama. Read scope, kerahasiaan pinHash, rate limit/lockout percobaan PIN, otorisasi saat perubahan profil/scope bersamaan, dan pengetatan mutasi saldo wajib dituntaskan sebelum aktivasi.
3. Tambahkan endpoint backend autentikasi, batas ukuran request, timeout, serta response error yang aman. Gate emulator baru boleh diganti setelah integrasi/rules teruji; tidak ada instruksi untuk deploy sekarang.
4. Daftarkan role minimart, permission/editor scope/navigasi/beranda, UI produk dan POS dua kolom yang mengikuti tema Madani; pilihan santri harus menampilkan konfirmasi identitas. Implementasikan scanner USB, keranjang, struk, loading/error/empty states dan retry ID yang bertahan saat koneksi putus. Kamera opsional.
5. Lengkapi UI stok/riwayat/refund; shift buka/tutup dan kas nonpenjualan; laporan omzet vs kas vs estimasi laba, grafik, filter, ekspor; diskon persen sesuai izin; proyeksi parent. Hubungkan cash sale/refund ke shift secara atomik sebelum uji operasional.
6. Akun `mart@madani.app`: belum diperiksa live, belum dibuat/diubah. Melalui Admin SDK tepercaya, cari email persis; gunakan UID existing dan pertahankan password/role lama. Bila belum ada, buat hanya dalam emulator/staging dahulu dengan secret dari input privat atau environment (jangan argumen CLI/log/file repo). Jika race email-already-exists, lookup ulang, jangan akun kedua. Scope unit perlu ditetapkan secara eksplisit. Aktivasi live memerlukan instruksi terpisah karena permintaan ini melarang akun/data dummy produksi. Password awal tidak disalin ke kode atau dokumen.

Referensi API adapter: [Firebase Admin transactions](https://firebase.google.com/docs/database/admin/save-data), [Realtime Database Emulator](https://firebase.google.com/docs/emulator-suite/connect_rtdb). Desain endpoint mendatang mengikuti [Callable Functions](https://firebase.google.com/docs/functions/callable).
