# Pembaruan role — 4 Oktober 2026 (implementasi lokal)

Instruksi aktif: Guru Mapel dipisahkan dari Pembina Tahfiz, Guru Wali mengikuti Mentor Cahaya, KPI tidak ditampilkan di semua role, UKS ditambahkan. Identitas BSI tosca/emas/ivory tetap. Pencocokan/merge nama SDM ditunda oleh pengguna.

## Yang sudah diimplementasikan

- Guru Mapel: menu/setoran/indikator Tahfiz dipisahkan; skema ujian Tahsin/Tahfiz dan jadwal khususnya tidak ditampilkan. Data penilaian lama tetap disimpan.
- Pembina Tahfiz: label role tersendiri dengan ID kompatibel `mentor_tahsin_tahfiz`; beranda khusus, halaqah berdasarkan penugasan SDM, dan modul Tahsin/Tahfiz/Murojaah yang sudah ada.
- KPI: seluruh menu, navigasi bawah dan akses route dinonaktifkan untuk seluruh 15 role. Rekam historis tetap ada. Jurnal Liburan tetap nonaktif.
- Guru Wali: beranda dua menu mengikuti Mentor Cahaya, 12 indikator / 5 dimensi, klarifikasi, syukur, fokus, target, Strong Why, strategi, riwayat/filter pekan-bulan dan hasil pada rekam yang sama. ID santri tetap master Madani. Penugasan mentor tidak diwarisi dari Wali Kelas.
- UKS: jurnal 9 indikator, pemeriksaan 9 bagian, batch stok/expiry, pemberian obat, memo pembelajaran, pengajuan rujukan/penjemputan, dan keputusan Direktur/Wakil Direktur. Pemeriksaan serta debit stok satu transaksi; retry memakai operation ID yang sama. Izin sakit mengoreksi Alfa pada presensi KBM/program hari pemeriksaan, mempertahankan status asal, nilai dan rujukan pemeriksaan. Koreksi merupakan proyeksi yang dapat dicoba ulang; tidak mengubah poin kasus formal.
- Konselor: routing Pemula/Madya (berat/kritis/moral dan pengulangan tiga hari), tabayyun dengan NFDK opsional, sesi, tindakan, evaluasi, eskalasi eksplisit dan tanggapan pimpinan. Pemula melepas kasus ketika diteruskan ke Madya; tanggapan pimpinan tetap mempertahankan Konselor sebagai penangan. Poin final hanya sekali dan mempunyai ID proyeksi tetap. Kasus menjadi sumber otoritatif; indeks konseling/tindakan/poin dapat disinkronkan ulang setelah gangguan koneksi.
- Naqib: asesmen santri 12 indikator sesuai rubrik sumber; muhasabah pekanan dengan empat penilaian diri dan refleksi terstruktur. Riwayat lama tetap tersimpan.
- Pimpinan: beranda dan panel mengambil pola layout manager Cahaya; personil/supervisor, pengamatan pembelajaran, target/capaian materi, progres nilai, program asrama, mentoring dan riwayat. Pembinaan ditautkan ke akun personil, arah dibedakan dari target terukur, catatan dapat diperbarui dengan pemeriksaan versi dan riwayat. Perubahan SOP/proses dicatat sebagai registry; tidak mengubah kode otomatis.
- Rapor: Kepala Sekolah dapat membuka ulang sesi nilai final dengan alasan tanpa menimpa nilai lama. Guru melihat instruksi revisi dan memfinalisasi ulang. Wakil Direktur (padanan Supervisor) meninjau kelengkapan mapel dari jadwal, meminta perbaikan, mempublikasikan snapshot rapor, atau menarik publikasi dengan alasan. Wali melihat snapshot terpublikasi, peringkat akademik, nama pemeriksa dan tombol cetak; nilai dari jalur legacy tetap dipertahankan. Direktur/Kepala Sekolah dapat meninjau status tanpa hak publikasi.
- Temuan: observasi dapat ditautkan ke temuan, pembinaan ditautkan ke temuan/personil yang sama, dan eskalasi ditujukan Kepala → Wakil Direktur → Direktur. Personil mengirim bukti melalui Tindak Lanjut Saya; penyelesaian tetap diverifikasi pejabat lain.
- Kepala Sekolah: pengaturan guru mukim dan absensi ibadah lima waktu. Kepala Asrama: absensi ibadah Naqib sesuai lingkup. Roster memakai SDM yang terhubung ke akun; tidak mengarang identitas yang masih ditunda.

## Verifikasi saat ini

121 pengujian lokal lulus, termasuk kontrak role/route, rendering lintas role, workflow Guru Wali, UKS, Konselor, Naqib, target Direktur dan absensi ibadah. Test repository menggunakan data simulasi, tidak menulis data operasional Firebase. 73 berkas JavaScript lolos pemeriksaan sintaks dan 29 JSON lolos parsing. Pengujian ekspresi rules belum sama dengan Firebase Emulator; emulator belum dapat dijalankan karena Java runtime tidak tersedia. Tampilan Guru Wali (tosca, tanpa overflow horizontal) dan UKS diperiksa di browser pada lebar 390 px; ini bukan bukti seluruh halaman identik secara piksel.

Modul keuangan dan node rules keuangan dibandingkan dengan HEAD dan tetap sama. Bagian keuangan wali tidak diubah.

## Akun UKS / produksi

Form akun `kesehatan@madani.app` sudah diisi di Manajemen Akun, dengan role Kesehatan/UKS saja, aktif, dan password sesuai permintaan (tidak ditulis di source). Pencarian awal menunjukkan akun belum ada. Tindakan Simpan ditolak auto-review karena meminta konfirmasi langsung untuk penambahan akses kesehatan. Konfirmasi sudah diajukan kepada pengguna; akun **belum dibuat**. Jangan mencoba jalur lain untuk melewati penolakan ini.

Belum ada deployment atau perubahan rules produksi. Rules masih berstatus pilot: read root yang sudah ada mengizinkan akun aktif membaca banyak domain. Jangan menyatakan pembatasan UI sebagai isolasi keamanan database. Belum ada pengujian login riil setiap role atau penulisan rekam kesehatan produksi.

## Pekerjaan lanjutan sebelum klaim kesetaraan penuh

- Publikasi rapor inti sudah tersedia. Peringkat akademik memakai competition ranking (nilai lengkap saja, seri mendapat peringkat sama) dan snapshot tersimpan saat publikasi; cetak rapor akademik wali tersedia. Ranking Santri Terbaik lintas domain dan sinkronisasi ulang ranking terpublikasi seperti Cahaya belum dipindahkan. Snapshot dibuat dari pembacaan nilai sebelum transaksi publikasi; belum ada transaksi lintas seluruh sumber nilai.
- Hubungan observasi–temuan–pembinaan, eskalasi berjenjang dan bukti personil sudah tersedia; evaluasi personil yang lengkap dan seluruh variasi formulir/aturan Cahaya masih perlu audit kesetaraan lebih lanjut.
- Seluruh cabang UI/aturan Cahaya belum diperiksa satu per satu, termasuk laporan/cetak wali dan fitur program Naqib lama. Jangan klaim 100%.
- GPS Madani belum mempunyai koordinat terkonfirmasi; tidak boleh memakai titik Cahaya.
- Identitas SDM yang ambigu dan nama santri yang sebelumnya ditunda tetap menunggu konfirmasi; tidak digabung otomatis.
- Uji Firebase Emulator, autentikasi tiap role, produksi dan perangkat PWA masih diperlukan.
