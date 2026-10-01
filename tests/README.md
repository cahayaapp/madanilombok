# Verifikasi role MadaniApp

Dari root repository, dengan Node 22+:

```sh
node --test tests/role-contracts.mjs
node --experimental-vm-modules --test tests/role-rendering.mjs
```

Tes rendering memerlukan `jsdom` 30. Bila tidak terpasang lokal, `MADANI_JSDOM_MODULE` dapat menunjuk absolute path entry jsdom yang sudah terpasang. Contoh lingkungan audit:

```sh
MADANI_JSDOM_MODULE=/Users/haimac/Documents/CahayaAppV2/node_modules/jsdom/lib/api.js node --experimental-vm-modules --test tests/role-rendering.mjs
```

Lokasi tersebut hanya menyediakan pustaka pengujian; acuan fitur tetap `fajrulislam`. Tes tidak membaca data atau kode aplikasi CahayaAppV2.

Repository Firebase diganti mock di dalam VM. Pengujian tidak masuk akun, tidak menulis database, dan tidak membuktikan enforcement rules atau keberhasilan transaksi Firebase nyata. Rendering seluruh menu memeriksa kegagalan awal halaman; hanya workflow yang disebutkan eksplisit dalam nama tes yang disimulasikan sampai penyimpanan.
