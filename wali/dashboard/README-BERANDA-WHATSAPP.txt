PORTAL WALI — BERANDA WHATSAPP, MEDIA, DAN NOTIFIKASI
=====================================================

TEMPATKAN SELURUH FILE DI:
wali/dashboard/

FILE BARU/PENTING
-----------------
- beranda.html
- beranda-whatsapp.css
- beranda-whatsapp.js
- firebase-messaging-sw.js
- manifest.webmanifest
- index.html

FITUR CHAT
----------
1. Tampilan chat menyerupai WhatsApp:
   - daftar kontak
   - pencarian kontak
   - badge pesan belum dibaca
   - gelembung pesan hijau/putih
   - tanggal dan waktu
   - tampilan penuh pada HP

2. Wali hanya dapat melihat dan memulai chat dengan akun yang memiliki role:
   - direktur
   - wakil direktur / wakil / wadir
   - admin / administrator
   - konselor

3. Pesan wali dapat:
   - dikirim
   - diedit
   - dihapus secara soft delete

4. Jalur data chat tetap kompatibel:
   cahaya_app/pesan_global/{roomId}/{messageId}

5. Metadata ruang baru:
   cahaya_app/pesan_meta/{roomId}

6. Status baca:
   cahaya_app/pesan_dibaca/{usernameWali}/{roomId}

MEDIA
-----
- YouTube:
  watch URL, youtu.be, Shorts, Live, embed URL, dan video ID.
- Instagram:
  post, reel, dan shortcode.
- Foto langsung:
  JPG, JPEG, PNG, WebP, GIF.
- Video langsung:
  MP4, WebM, OGG.

Rasio tampilan:
- YouTube: 16:9
- Instagram post: 4:5
- Instagram reel: 9:16
- Foto langsung: tinggi otomatis sesuai gambar
- Video langsung: 16:9

Media utama tetap disisipkan setelah setiap dua status.
Semua media yang tersisa tetap ditampilkan setelah status terakhir.
Bila belum ada status hari ini, media masih tetap ditampilkan.

NOTIFIKASI DIBACA
-----------------
1. Chat hilang dari kartu notifikasi setelah ruang dibuka.
2. Komentar/balasan hilang setelah diklik.
3. Notifikasi admin/sistem hilang setelah diklik dan disimpan:

   cahaya_app/notifikasi_wali/{username}/{notificationId}
   └── dibaca: true

PUSH NOTIFICATION SAAT PORTAL DITUTUP
------------------------------------
Yang langsung aktif tanpa backend:
- bunyi saat halaman sedang terbuka
- toast di dalam portal
- browser notification saat tab terbuka di latar belakang

Agar notifikasi masuk ketika portal/browser ditutup:
1. Portal harus di-host melalui HTTPS.
2. Aktifkan Firebase Cloud Messaging Web Push.
3. Buat Web Push certificate/VAPID key.
4. Simpan PUBLIC VAPID KEY pada:

   cahaya_app/
   └── pengaturan_notifikasi_web/
       └── vapidKey: "PUBLIC_VAPID_KEY"

5. Deploy contoh Cloud Function pada:
   push-backend-example/

   Contoh backend memuat:
   - pushChatToWali
   - pushSystemNotificationToWali
   - pushBroadcastToAllWali

6. Wali membuka chat lalu menekan tombol Aktifkan dan mengizinkan notifikasi.

TOKEN PERANGKAT
---------------
Token push disimpan di:

cahaya_app/
└── fcm_tokens_wali/
    └── {usernameWali}/
        └── {tokenKey}/
            ├── token
            ├── username
            ├── namaAnak
            └── aktif

DEPLOY CONTOH CLOUD FUNCTION
----------------------------
Dari folder push-backend-example:

1. Pastikan Firebase CLI telah login.
2. Pilih proyek absensi-santri-fajrul-islam.
3. Jalankan npm install di folder functions.
4. Jalankan firebase deploy --only functions.

Konfigurasi contoh saat ini:
- Database instance:
  absensi-santri-fajrul-islam-default-rtdb
- Region:
  asia-southeast1

Bila Firebase menampilkan mismatch region, sesuaikan nilai region pada:
push-backend-example/functions/index.js

CATATAN
-------
- Bunyi notifikasi ketika halaman terbuka memakai audio portal.
- Ketika browser/aplikasi ditutup, bunyi dikendalikan oleh pengaturan
  notifikasi browser dan sistem operasi HP.
- Pemilik video YouTube/Instagram dapat menonaktifkan embedding.
  Dalam kondisi tersebut, browser tidak dapat memaksa video diputar.
- Edit/hapus memerlukan Firebase Rules yang mengizinkan akun terkait
  menulis pada jalur pesan.
