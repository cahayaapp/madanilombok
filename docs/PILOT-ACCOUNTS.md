# Akun Pilot MadaniApp V2.1

Password sementara seluruh akun pilot: `Madani123!`

| Role | Email | Mapping awal |
|---|---|---|
| Super Admin | admin@almadani.app | Administrator |
| Guru Mapel | guru@almadani.app | Abdul Hamid / SD Kelas 1 |
| Mentor Tahsin Tahfiz | tahfiz@almadani.app | Muammar / Halaqah Muammar |
| Naqib | naqib@almadani.app | Nopan / Asrama Putra |
| Konselor | konselor@almadani.app | Muhasim / Putra |
| Guru Wali | wali.kelas@almadani.app | Wali Kelas 7 Putra |
| Kasir | kasir@almadani.app | Kasir Putra |
| Wali Santri | walisantri@almadani.app | AMD-SD-0001 |

## Urutan setup pertama

1. Firebase Console → Authentication → Sign-in method → aktifkan **Email/Password**.
2. Deploy `database.rules.json` versi paket ini.
3. Buka `/setup/` dan buat Super Admin pertama.
4. Login/lanjut ke `/admin/accounts.html`.
5. Klik **Buat / Sinkronkan Semua Akun Pilot**.
6. Bila master data belum masuk, buka `/bootstrap/` dan import baseline.
7. Uji `/app/` dengan akun role satu per satu.

## Keamanan

- Password di atas hanya untuk pilot internal.
- Ganti seluruh password sebelum production.
- Hapus atau jangan deploy folder `/setup/` di production setelah bootstrap selesai.
- Jangan menyimpan kredensial production di repository.
