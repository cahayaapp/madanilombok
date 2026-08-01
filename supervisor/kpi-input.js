function simpanKPI() {
  const kpi = {
    naqib: document.getElementById("namaNaqib").value,
    skor: {
      d1: Number(d1.value),
      d2: Number(d2.value),
      d3: Number(d3.value),
      d4: Number(d4.value),
      d5: Number(d5.value)
    },
    bobot: [0.3, 0.25, 0.2, 0.15, 0.1],
    narasi: {
      kekuatan: kekuatan.value,
      penguatan: penguatan.value,
      rekomendasi: rekomendasi.value
    },
    waktu: new Date().toISOString()
  };

  localStorage.setItem("kpi_" + kpi.naqib, JSON.stringify(kpi));

  document.getElementById("hasil").innerHTML =
    "✔ KPI tersimpan. Ingat: angka adalah penanda proses.";
}
