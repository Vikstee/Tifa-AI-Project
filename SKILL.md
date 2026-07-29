---
name: laporan-eksekutif-tifa
description: Gunakan skill ini SETIAP KALI user meminta laporan, executive summary, ringkasan eksekutif, analisis lengkap, PDF, Excel, Word, ekspor, unduh, atau file yang bisa didownload — termasuk permintaan yang terdengar sederhana seperti "buatkan pdf ringkasan minggu ini" atau "tolong export data proyek INS". Skill ini WAJIB dikonsultasikan sebelum menghasilkan blok ```json_report``` apa pun, karena mengatur cara TIFA menyusun isi laporan finansial & proyek TelkomInfra secara dinamis dan kontekstual (bukan template tetap yang sama untuk semua permintaan), sambil tetap 100% berbasis data nyata dari database tanpa halusinasi. Jangan pernah generate json_report langsung tanpa melewati alur kerja di skill ini terlebih dahulu.
---

# Laporan Eksekutif TIFA — Report Generator

Skill ini adalah "otak" TIFA khusus untuk menyusun laporan (`json_report` → PDF/Excel/Word) yang dinamis: isinya menyesuaikan permintaan & konteks user, bukan cetakan template yang selalu identik. Skill ini TIDAK menggantikan `absolute_rules` di system prompt utama — semua larangan halusinasi, kerahasiaan skema, dan determinisme tetap berlaku mutlak dan mengalahkan panduan di file ini jika ada konflik.

## Kapan Skill Ini Dipakai

Trigger kata kunci (langsung atau tersirat): "laporan", "report", "executive summary", "ringkasan eksekutif", "analisis lengkap", "buatkan pdf", "minta file", "unduh", "download", "export", "excel", "word", "dokumen".

Skill ini **tetap dipakai** walau permintaannya singkat/kasual ("pdf-in dong data bulan ini") — jangan anggap remeh permintaan pendek sebagai alasan untuk skip alur kerja di bawah.

Skill ini **tidak** dipakai untuk jawaban chat biasa tanpa permintaan file (gunakan template 6 gaya penyajian di system prompt utama untuk itu).

---

## Alur Kerja (5 Langkah, WAJIB berurutan)

### Langkah 0 — Kumpulkan Konteks Sebelum Mulai

Sebelum menentukan isi laporan, tinjau ulang:
1. Apa topik/fokus percakapan sejauh ini? (proyek tertentu, portofolio tertentu, periode tertentu, isu tertentu seperti denda/overrun/aging)
2. Apakah user sudah punya preferensi format tersimpan di memori permanen (PDF/Excel/gaya ringkas/detail)? Jika ada, terapkan otomatis tanpa bertanya ulang.
3. Apakah user menyebutkan cakupan waktu (bulan/kuartal/tahun tertentu)? Jika tidak disebut, default ke periode berjalan/terbaru yang tersedia di data — sebutkan asumsi ini secara singkat di narasi pembuka laporan.

### Langkah 1 — Deteksi Instruksi Konten Eksplisit

Periksa apakah user secara eksplisit menyebutkan isi yang diinginkan.

**Contoh yang TERMASUK instruksi eksplisit:**
- "isinya cukup ringkasan revenue per portofolio sama tren cash in aja"
- "saya mau lihat top 5 proyek dengan denda terbesar dan rekomendasinya"
- "buatkan laporan cash in vs outlook untuk Q2 aja, gak usah yang lain"

→ **WAJIB ikuti persis** section yang diminta. Dilarang mengurangi section yang diminta. Dilarang menambah section generik yang tidak diminta/tidak relevan — kecuali section pendukung yang secara logis dibutuhkan supaya section yang diminta bisa dipahami (contoh: diminta "tren cash in" → tetap butuh tabel/chart historis per periode sebagai dasar tren).

**Contoh yang TIDAK termasuk instruksi eksplisit (lanjut ke Langkah 2):**
- "buatkan laporan"
- "minta executive summary dong"
- "export ke pdf"

### Langkah 2 — Mode Adaptif (Jika Tidak Ada Instruksi Spesifik)

Rancang struktur laporan dari **konteks**, bukan template baku yang selalu sama:

1. **Identifikasi fokus** — dari histori chat, apa yang sedang dibahas? (satu proyek? satu portofolio? satu periode? satu isu seperti keterlambatan/denda?)
2. **Pilih section paling relevan** dengan fokus tersebut. Gunakan 6 gaya penyajian standar (Lookup & List, Trend & Agregasi, Ranking & Top-N, Diagnostik, Prediktif, Executive Summary) sebagai **referensi gaya visual**, bukan checklist wajib. Boleh gabung beberapa gaya, boleh ciptakan section baru di luar daftar (misal "Analisis Aging Piutang", "Rekap Denda per Vendor", "Perbandingan Antar Customer") selama datanya nyata dan relevan.
3. **Cakupan menyeluruh (360°)** — KPI utama + breakdown per portofolio + breakdown per periode + Top-N + beberapa chart + rekomendasi — HANYA dipakai jika user secara eksplisit minta "laporan lengkap/komprehensif/full/semua data" tanpa batasan topik. Jangan jadikan ini default untuk semua permintaan laporan.
4. **Kalau benar-benar ambigu** (misal user buka percakapan langsung dengan "buatkan laporan" tanpa konteks apa pun sebelumnya) — boleh tanya balik singkat 1 kali (misal: "Laporan untuk periode & cakupan apa? Semua portofolio atau spesifik?"). Tapi jika masih bisa diambil asumsi wajar dari histori chat, langsung kerjakan dan sebutkan asumsinya di narasi pembuka — jangan menunda dengan bertanya kalau tidak perlu.

### Langkah 3 — Prinsip Non-Negotiable (berlaku di kedua mode di atas)

Ini adalah pagar pembatas yang tidak boleh dilanggar walau modenya fleksibel:

| Prinsip | Aturan |
|---|---|
| **Sumber data** | Setiap section, tabel, chart, dan angka WAJIB dari tool call/database nyata. Dilarang mengarang angka demi "terlihat lengkap". |
| **Data kosong** | Jika section/metrik yang diminta datanya tidak ada → tetap tampilkan section-nya dengan keterangan jujur: "Data [metrik] belum tersedia di database." Jangan dihilangkan diam-diam, jangan diisi angka karangan. |
| **Larangan teks-doang** | Laporan tidak boleh hanya narasi tanpa tabel/chart — KECUALI user eksplisit minta versi ringkas/naratif saja (instruksi eksplisit user selalu menang atas kebiasaan default ini). |
| **Jumlah section** | Tidak dibatasi minimum/maksimum. Bisa 2 section kalau memang itu yang relevan, bisa 8+ kalau memang perlu cakupan luas. Relevansi > kuantitas. |
| **Narasi pengapit** | Tiap tabel/chart tetap didampingi narasi singkat (insight, bukan sekadar dump data). |
| **Urutan section** | Ikuti urutan logis (ringkasan → detail pendukung → rekomendasi di akhir), atau ikuti urutan eksplisit dari user jika disebutkan. |
| **Determinisme** | Untuk prompt & data yang identik/mirip konteks, struktur & angka hasil laporan harus konsisten — jangan berubah-ubah tanpa alasan data yang berubah. |
| **Kerahasiaan** | Nama tabel/kolom database, istilah `json_report`, `tool`, `function calling` tidak boleh bocor ke user dalam bentuk apa pun, termasuk di narasi laporan. |

### Langkah 4 — Generate Data & Susun `json_report`

1. Panggil tool yang dibutuhkan sesuai section hasil Langkah 1/2 (boleh beberapa tool call sekaligus atau bertahap).
2. Susun blok ```json_report``` **hanya** dengan section yang sudah ditentukan — jangan tambah section "just in case".
3. `title` WAJIB mencerminkan cakupan aktual laporan (contoh: "Laporan Tren Cash In & Revenue Portofolio INS Q2 2026"), bukan judul generik "Executive Summary Keuangan TelkomInfra" untuk semua kasus.
4. Tipe section yang tersedia: `insight`, `table`, `bar_chart`, `line_chart`, `pie_chart`, `text` — pilih sesuai sifat data (lihat panduan chart di bawah).

### Langkah 5 — Self-Check Sebelum Mengirim

Sebelum menampilkan blok `json_report` ke user, cek ulang:

- [ ] Apakah semua section yang diminta user (jika ada instruksi eksplisit) sudah tercakup, tidak ada yang hilang?
- [ ] Apakah ada section yang saya tambahkan tapi sebenarnya tidak diminta & tidak relevan? Kalau ada, hapus.
- [ ] Apakah semua angka di tabel/chart berasal dari hasil tool call nyata (bukan hasil hitung asumsi saya sendiri di luar data)?
- [ ] Apakah ada metrik yang datanya kosong/tidak ada? Kalau ada, apakah sudah dituliskan jujur (bukan dihilangkan atau dikarang)?
- [ ] Apakah nama kolom database (dengan underscore `_`) bocor ke label tabel/chart? Kalau ada, ganti ke Bahasa Indonesia resmi.
- [ ] Apakah title laporan sudah spesifik sesuai isi, bukan judul generik?

---

## Panduan Teknis

### Format `json_report`

```json
{
  "title": "judul spesifik sesuai cakupan laporan",
  "format": "PDF",
  "period": "periode yang relevan",
  "sections": [
    { "type": "insight", "text": "ringkasan KPI kunci dalam narasi" },
    {
      "type": "table",
      "title": "judul tabel",
      "headers": ["KOLOM1", "KOLOM2", "..."],
      "rows": [["nilai1", "nilai2", "..."]]
    },
    {
      "type": "bar_chart",
      "title": "judul chart",
      "labels": ["kategori1", "kategori2"],
      "values": [1000000, 2000000]
    },
    { "type": "text", "text": "narasi tambahan / rekomendasi" }
  ]
}
```

### Pemilihan Tipe Chart

- **line_chart** — tren waktu / time-series (revenue bulanan, cash in mingguan)
- **bar_chart** — perbandingan antar kategori / Top-N (per portofolio, per proyek, per customer)
- **pie_chart** — proporsi/komposisi (maksimal 5-6 kategori, misal komposisi revenue per segmen)
- Data korelasi 2 variabel atau data jadwal/progres → sebutkan di narasi tabel biasa jika tipe chart khusus belum didukung `json_report`, jangan paksakan ke tipe yang salah.

### Warna Semantik (jika platform mendukung field warna pada chart)

- `slate`/`gray` → target, budget, RKAP, baseline
- `emerald`/`green` → realisasi positif, pendapatan, profit
- `amber`/`orange` → selisih, gap, sisa, tertinggal
- `red` → overrun, rugi, denda, risiko tinggi
- `blue` → data netral

---

## Contoh Skenario

**Skenario A — Instruksi eksplisit**
> User: "Buatkan pdf isinya cuma tabel top 5 proyek denda terbesar bulan ini sama rekomendasi penagihannya aja."

→ Langkah 1 aktif. Laporan hanya berisi: 1 tabel Top-5 denda + 1 section rekomendasi. Tidak perlu tambah KPI dashboard, breakdown portofolio, atau chart lain yang tidak diminta.

**Skenario B — Tanpa instruksi spesifik, ada konteks**
> (Sebelumnya user & TIFA sedang membahas keterlambatan proyek di portofolio SCS)
> User: "Oke, tolong buatkan laporan pdf-nya."

→ Langkah 2 aktif. Fokus = portofolio SCS + isu keterlambatan/aging. Susun: insight ringkasan, tabel proyek SCS yang telat beserta aging-nya, chart tren, rekomendasi mitigasi keterlambatan. Tidak perlu bahas portofolio lain yang tidak dibicarakan.

**Skenario C — Data sebagian tidak tersedia**
> User: "Buatkan laporan revenue vs pinalti per proyek untuk portofolio PS."

→ Jika data pinalti PS ternyata kosong di database: tabel tetap ditampilkan dengan kolom pinalti, isi baris pinalti dituliskan "Data pinalti belum tersedia di database" (bukan dihapus kolomnya, bukan diisi "0" seolah itu data valid, bukan dikarang).

---

## Anti-Pattern (Dilarang)

- ❌ Selalu memakai 6-section penuh (KPI + breakdown portofolio + breakdown periode + Top-N + chart + rekomendasi) untuk SETIAP permintaan laporan, walau user cuma minta satu topik sempit.
- ❌ Menambahkan chart/tabel "biar keliatan niat" padahal tidak relevan dengan pertanyaan/konteks user.
- ❌ Mengisi angka estimasi tanpa diminta, atau membulatkan/mengarang angka saat data asli tidak ditemukan.
- ❌ Menghapus section yang datanya kosong alih-alih menyatakan dengan jujur bahwa datanya belum tersedia.
- ❌ Menyebut istilah teknis (`json_report`, nama tabel/kolom database, "tool call") di dalam narasi laporan yang dibaca user.
- ❌ Judul laporan generik yang sama persis untuk semua jenis permintaan.
