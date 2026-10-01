# Schema Realtime Database — MadaniApp V2 Pilot

Root: `madani_app`

```text
madani_app/
├── settings/
│   ├── currentAcademicYearId
│   └── finance/
│       └── dailySpendingLimit
├── academic_years/
├── units/
├── students/
├── staff/
├── classes/
├── dormitories/
├── rooms/
├── groups/
├── subjects/
├── programs/
├── assignments/
│   ├── classes/{academicYearId}/{studentId}
│   ├── rooms/{academicYearId}/{studentId}
│   └── groups/{academicYearId}/{groupId}/{studentId}
├── schedules/
│   ├── academic/
│   └── daily/
├── users/{firebaseUid}/
├── academic/
│   ├── teacher_attendance/{academicYearId}/
│   ├── student_attendance/{academicYearId}/
│   ├── quran_records/{academicYearId}/{groupId}/{studentId}/
│   ├── grades/{academicYearId}/{classId}/{subjectId}/{period}/{studentId}
│   └── lesson_plans/{academicYearId}/
├── boarding/
│   ├── program_attendance/{academicYearId}/{date}/{programId}/{studentId}
│   ├── program_reports/{academicYearId}/
│   ├── initiatives/{academicYearId}/
│   ├── naqib_examples/{academicYearId}/{naqibUid}/
│   ├── student_assessments/{academicYearId}/{period}/
│   ├── naqib_self_review/{academicYearId}/{naqibUid}/
│   ├── mentoring/{academicYearId}/{studentId}/{sessionId}
│   ├── cases/{academicYearId}/{caseId}
│   ├── counseling/{academicYearId}/{caseId}/{sessionId}
│   ├── case_actions/{academicYearId}/{actionId}
│   ├── escalations/{academicYearId}/{escalationId}
│   ├── warning_letters/{academicYearId}/{letterId}
│   └── counselor_self_review/{academicYearId}/{counselorUid}/
├── discipline/
│   └── points/{academicYearId}/{studentId}/{transactionId}
├── parent/
│   ├── permissions/{academicYearId}/{studentId}/
│   └── calendar/
├── health/
│   └── records/{academicYearId}/{studentId}/
├── messages/{threadId}/
├── announcements/
├── finance/
│   ├── billingTypes/
│   ├── cashierUnits/
│   ├── bills/{academicYearId}/{studentId}/{billId}
│   ├── payments/{academicYearId}/{paymentId}
│   ├── wallets/{studentId}/
│   │   ├── savings
│   │   ├── spending
│   │   └── pinHash
│   ├── wallet_transactions/{academicYearId}/{studentId}/{transactionId}
│   ├── products/{cashierUnit}/{productId}
│   └── cashier_transactions/{academicYearId}/{transactionId}
├── reference/
│   └── rules/
├── seed_validation/
└── audit_logs/
```

## Prinsip relasi

1. `students/{studentId}` hanya menyimpan identitas induk. Kelas, kamar, dan halaqah tidak menjadi identitas permanen.
2. Penempatan kelas/kamar/kelompok disimpan per tahun ajaran pada `assignments`.
3. Transaksi akademik, asrama, disiplin dan keuangan selalu membawa `studentId` / `staffId` sebagai referensi utama, bukan nama.
4. Satu SDM boleh mempunyai beberapa role. Role aktif di portal hanya mengubah konteks kerja, bukan membuat user baru.
5. Rekam mentoring Guru Wali menyimpan target **dan hasil target pada record yang sama** agar tidak tercipta catatan paralel.
6. Poin final kasus disimpan sebagai transaksi immutable-ish pada `discipline/points`; `boarding/cases/{caseId}.finalPointTransactionId` mencegah finalisasi ganda pada alur UI.
7. Kasus dan SP hanya tampil kepada Wali bila secara eksplisit memiliki `parentVisible: true`.
8. Saldo `savings` dan `spending` terpisah. Kasir hanya mengurangi `spending`.
9. Transaksi kasir yang dibatalkan tidak dihapus: status berubah menjadi `void`, alasan/aktor/waktu disimpan, saldo dikembalikan, stok dipulihkan, dan mutasi refund dicatat.
10. Master data hasil konsolidasi mempertahankan `source`, `validationStatus`, atau `seeded` saat relevan agar asal data bisa ditelusuri.

## Master data awal

`seed/master-data.json` dibentuk dari workbook `source-data/Master_Data_Awal_Pondok_Pesantren_Al_Madani_2026-09-30.xlsx`. Import dilakukan melalui halaman `/bootstrap/` dan tidak boleh dijalankan berulang kali pada database yang sudah berisi master santri.

## Catatan production

Struktur ini adalah baseline pilot. Transaksi keuangan dan pembatasan akses sensitif harus di-hardening dengan Firebase Rules yang lebih granular dan idealnya Cloud Functions sebelum production.
