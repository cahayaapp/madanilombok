CATATAN KEAMANAN MODUL KEUANGAN

Modul ini memakai transaksi Firebase RTDB pada rekening santri agar pengurangan saldo dilakukan secara atomik. PIN enam angka disimpan dalam bentuk hash dengan salt dan dikunci sementara setelah tiga kali salah.

Karena CAHAYA App masih berbasis web client, pengamanan terbaik tetap memerlukan Firebase Security Rules dan/atau Cloud Functions. Jangan memberikan role keuangan atau kasir kepada akun yang tidak berwenang. Gunakan HTTPS dan jangan membagikan akun petugas.
