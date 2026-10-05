// Task rubric adapted from Cahaya Kesehatan, without operational records.
    export const TASK_GROUPS = [
      {
        id: "penerimaan_pemeriksaan",
        label: "Penerimaan Laporan & Pemeriksaan",
        icon: "🩺",
        className: "security",
        description: "Penerimaan laporan sakit, pemeriksaan awal, dan penyampaian data santri sakit.",
        tasks: [
          {
            id: "KS-01",
            no: 1,
            title: "Menerima Laporan Santri Sakit",
            standard: "Menerima laporan santri sakit dari Kepala Pengasuhan atau Naqib dengan mencatat nama santri, waktu laporan, keluhan awal, dan pihak yang melaporkan.",
            category: "Penerimaan Laporan"
          },
          {
            id: "KS-02",
            no: 2,
            title: "Melakukan Pemeriksaan / Check Up",
            standard: "Melakukan pemeriksaan awal terhadap santri yang sakit, meliputi keluhan, suhu tubuh, kondisi umum, tanda bahaya, dan kebutuhan rujukan bila diperlukan.",
            category: "Pemeriksaan Santri"
          },
          {
            id: "KS-03",
            no: 3,
            title: "Mengirim Laporan Data Santri Sakit",
            standard: "Mengirim data santri sakit menggunakan format laporan yang telah ditentukan secara lengkap, tepat waktu, dan mudah ditindaklanjuti.",
            category: "Pelaporan Kesehatan"
          }
        ]
      },
      {
        id: "pelayanan_pembinaan",
        label: "Pelayanan Obat & Edukasi",
        icon: "💊",
        className: "cleaning",
        description: "Pemberian obat, edukasi kesehatan, dan tindak lanjut pelayanan santri.",
        tasks: [
          {
            id: "KS-04",
            no: 4,
            title: "Memberikan Obat Sesuai Dosis",
            standard: "Memberikan obat sesuai keluhan, kebutuhan, dosis, aturan pakai, dan batas kewenangan petugas; tidak memberikan obat secara sembarangan.",
            category: "Pelayanan Obat"
          },
          {
            id: "KS-05",
            no: 5,
            title: "Memberikan Saran dan Edukasi Hidup Sehat",
            standard: "Memberikan arahan kepada santri mengenai istirahat, makan, minum, kebersihan diri, kepatuhan minum obat, pencegahan penularan, dan kebiasaan hidup sehat.",
            category: "Edukasi Kesehatan"
          }
        ]
      },
      {
        id: "administrasi_uks",
        label: "Rekam Medis, UKS & Administrasi",
        icon: "📋",
        className: "service",
        description: "Rekam medis, kebersihan UKS, pengelolaan obat, dan kerapian administrasi kesehatan.",
        tasks: [
          {
            id: "KS-06",
            no: 6,
            title: "Mengisi Buku Catatan Rekam Medis Santri",
            standard: "Mencatat identitas santri, keluhan, hasil pemeriksaan, obat atau tindakan, saran, waktu pelayanan, dan tindak lanjut secara lengkap.",
            category: "Rekam Medis"
          },
          {
            id: "KS-07",
            no: 7,
            title: "Menjaga Kebersihan Ruang UKS",
            standard: "Memastikan ruang UKS, tempat tidur, meja, alat kesehatan, lantai, tempat sampah, dan perlengkapan tetap bersih, rapi, serta siap digunakan.",
            category: "Kebersihan UKS"
          },
          {
            id: "KS-08",
            no: 8,
            title: "Memeriksa Stok dan Tanggal Kedaluwarsa Obat",
            standard: "Memeriksa jumlah stok, kondisi kemasan, tanggal kedaluwarsa, kebutuhan pengadaan, serta memisahkan obat yang tidak layak digunakan.",
            category: "Pengelolaan Obat"
          },
          {
            id: "KS-09",
            no: 9,
            title: "Merapikan Dokumen Administrasi Kesehatan",
            standard: "Merapikan laporan santri sakit, buku layanan, rekam medis, data stok obat, surat rujukan, nota kesehatan, dan dokumen pendukung lainnya.",
            category: "Administrasi Kesehatan"
          }
        ]
      }
    ];
