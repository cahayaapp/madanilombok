# Pemetaan Struktur Organisasi Al-Madani ke Role MadaniApp

Struktur ini dibaca dari bagan organisasi yang diberikan pengguna pada 30 September 2026.

```text
Direktur (AH)
├── Wakil Direktur (MT)
├── Kepala Sekolah Formal
│   ├── WK Kur
│   ├── WK Sis
│   ├── WK Sar
│   ├── WK Humas
│   ├── WK Pres
│   └── Pendidikan & Kependidikan
│       ├── Guru Mapel
│       ├── Guru Wali
│       └── dll.
├── Kepala Asrama Putra (Mhs)
│   ├── Naqib
│   ├── Guru Wali (fungsi mentoring individu)
│   ├── Konselor
│   ├── Ketua Kamar / OSMA
│   ├── Pembina Usrah
│   └── Tahsin Tahfiz
└── Kepala Asrama Putri (Nrl)
    ├── Naqib
    ├── Guru Wali (fungsi mentoring individu)
    ├── Konselor
    ├── Ketua Kamar / OSMA + Takhassus GEMA
    ├── Pembina Usrah
    └── Tahsin Tahfiz
```

## Keputusan implementasi pilot

- Identitas AH/MT/Mhs/Nrl dikonfirmasi pengguna pada 2 Oktober 2026: Abdul Hayyi (`AMD-SDM-0001`) Direktur + Kepala SMK; Muhammad Tuzri (`AMD-SDM-0054`) Wakil Direktur + Kepala SMP; Muhasim (`AMD-SDM-0055`) Kepala Asrama Putra; Nuril Azmi (`AMD-SDM-0062`) Kepala Asrama Putri.
- Penugasan ganda memakai `roleScopes`: pimpinan lintas unit, Kepala Sekolah hanya unit SMK/SMP masing-masing. Data sumber tetap mempertahankan nama asli; nama terkonfirmasi disimpan dalam displayName.
- Guru Wali adalah role yang menjalankan **mentoring individu**. Menu bernama Mentor tidak diberikan kepada user terpisah.
- Pembina Tahsin/Tahfiz dipetakan ke `mentor_tahsin_tahfiz`.
- Naqib menjalankan pengawalan program asrama dan pelaporan temuan/kasus.
- Konselor menerima kasus dan menjalankan konseling, tindakan edukatif, poin, SP dan penutupan kasus.
- Ketua kamar/OSMA dan Pembina Usrah belum dibuat sebagai role login tersendiri pada pilot karena belum diminta sebagai role aplikasi.

Data nama yang terbaca dari bagan disimpan di `seed/organization-structure.json`. Kandidat pencocokan terhadap master SDM ada di `seed/role-assignment-suggestions.json`; kandidat yang ambigu **harus diverifikasi manusia sebelum digunakan sebagai akun/role**.
