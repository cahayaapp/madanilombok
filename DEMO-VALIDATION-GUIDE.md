# MadaniApp V2.2 — Demo & Validasi Tim Al-Madani

## Sebelum demo
1. Login Super Admin.
2. Buka `admin/validation.html`.
3. Klik **Backup Sebelum Demo** sekali.
4. Buka tab data yang akan divalidasi: Santri, SDM, Kelas/Rombel, Kamar, Halaqah, Program 24 Jam, Jadwal Pelajaran, atau Jadwal 24 Jam.

## Saat demo
- Klik **Edit** pada baris, ubah data, lalu **Simpan**.
- Data langsung masuk Firebase dan bisa langsung dicek dari Portal.
- **Tambah** menambah record baru.
- **Hapus** menghapus record, tetapi perubahan sesi tetap tercatat dan dapat dikembalikan melalui **Batalkan**.
- Untuk pindah kelas/kamar/halaqah gunakan tautan **Penempatan Santri**, karena relasi penempatan tetap disimpan per tahun ajaran.

## Setelah demo
- Klik **Download Snapshot JSON** untuk menyimpan salinan data terkini.
- Semua perubahan sesi tercatat di `madani_app/reference/validation_changes/...`.
- Backup tersimpan di `madani_app/reference/validation_snapshots/...`.

## PWA / Install App
- Root `index.html` mengikuti pola index CAHAYA APP: install scene + login scene.
- Chrome/Edge/Android akan menampilkan Install MadaniApp ketika event `beforeinstallprompt` tersedia.
- iPhone/iPad menampilkan petunjuk Share → Tambahkan ke Layar Utama.
- Service worker: `sw.js`; manifest: `manifest.json`.
