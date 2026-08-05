export const dbToolsDefinitions = [
  {
    name: 'lookupRecord',
    description: 'Mencari satu baris data spesifik berdasarkan ID atau primary key.',
    parameters: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Nama tabel utama (gunakan: data_po-cashin)' },
        idColumn: { type: 'string', description: 'Nama kolom ID (contoh: id, io_number)' },
        idValue: { type: 'string', description: 'Nilai ID atau IO number yang dicari' },
        selectColumns: { type: 'string', description: 'Opsional. Daftar kolom yang ingin diambil (default: "*").' }
      },
      required: ['tableName', 'idColumn', 'idValue']
    }
  },
  {
    name: 'filterRecords',
    description: 'Mencari beberapa baris data berdasarkan kriteria tertentu.',
    parameters: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Nama tabel (gunakan: data_po-cashin).' },
        filterColumn: { type: 'string', description: 'Nama kolom untuk filter (contoh: customer, segment, portfolio, period, funnel)' },
        filterValue: { type: 'string', description: 'Opsional. Nilai yang dicari. Bisa exact match atau operator (contoh: "TELKOMSEL", ">=1000", "<50")' },
        selectColumns: { type: 'string', description: 'Opsional. Kolom spesifik yang ingin diambil (contoh: "project_name, customer, revenue, cash_in, period")' },
        limitAmount: { type: 'number', description: 'Opsional. Jumlah maksimal baris (default 100). Hemat token dengan membatasi baris.' },
        orderColumn: { type: 'string', description: 'Opsional. Nama kolom untuk mengurutkan (contoh: revenue, cash_in, rkap, bast_amount). Sangat berguna untuk mencari nilai Terbesar, Terkecil, Terbaru, atau Terlama.' },
        orderAscending: { type: 'boolean', description: 'Opsional. True untuk naik (Terkecil/Terlama), False untuk turun (Terbesar/Terbaru). Default: True.' }
      },
      required: ['tableName']
    }
  },
  {
    name: 'aggregateRecords',
    description: 'Menghitung total penjumlahan (SUM) dari suatu kolom angka.',
    parameters: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Nama tabel (gunakan: data_po-cashin)' },
        sumColumn: { type: 'string', description: 'Nama kolom yang akan dijumlahkan (contoh: cash_in, revenue, po_amount, rkap, bast_amount, invoice, pinalty)' },
        filterColumn: { type: 'string', description: 'Kolom untuk filter opsional (contoh: customer, segment, portfolio)' },
        filterValue: { type: 'string', description: 'Nilai filter opsional' }
      },
      required: ['tableName', 'sumColumn']
    }
  },
  {
    name: "aggregate_chart",
    description: "Meminta server Python untuk mengagregasi data jutaan baris (groupby) dan mengembalikannya dalam format chart JSON untuk dirender. Gunakan ini saat pengguna meminta grafik agregasi.",
    parameters: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Nama tabel (gunakan: data_po-cashin)"
        },
        group_by: {
          type: "string",
          description: "Kolom yang dikelompokkan (contoh: portfolio, segment, customer, period)"
        },
        sum_col: {
          type: "string",
          description: "Kolom angka yang dijumlahkan (contoh: revenue, cash_in, rkap)"
        }
      },
      required: ["table", "group_by", "sum_col"]
    }
  },
  {
    name: "predict_cashflow",
    description: "Meminta server Python untuk melakukan Machine Learning (Linear Regression) untuk memprediksi net cash flow di bulan-bulan mendatang.",
    parameters: {
      type: "object",
      properties: {
        months_ahead: {
          type: "number",
          description: "Jumlah bulan ke depan yang ingin diprediksi (contoh: 3)"
        }
      },
      required: ["months_ahead"]
    }
  },
  {
    name: "detect_anomaly",
    description: "Meminta server Python untuk mendeteksi transaksi/invoice yang aneh atau janggal menggunakan statistik Z-score dan mendeteksi tagihan ganda (duplikat).",
    parameters: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Nama tabel yang ingin diperiksa (contoh: invoices, purchase_orders)"
        },
        amount_col: {
          type: "string",
          description: "Kolom angka yang akan dicek anomalinya (contoh: amount, total_amount)"
        }
      },
      required: ["table", "amount_col"]
    }
  },
  {
    name: "update_user_memory",
    description: "Menyimpan atau memperbarui ingatan/fakta permanen tentang user (misalnya nama panggilan, peran, preferensi, kebiasaan, dll). Fakta ini akan diingat terus-menerus di semua percakapan di masa depan.",
    parameters: {
      type: "object",
      properties: {
        memory_text: {
          type: "string",
          description: "Teks yang berisi SEMUA ingatan/fakta tentang user saat ini (akan menimpa ingatan lama). Jangan hanya menambahkan data baru, tapi pertahankan juga data lama yang masih relevan (rangkum semuanya)."
        }
      },
      required: ["memory_text"]
    }
  },
  {
    name: "ask_database_sql",
    description: "Alat AI canggih (Agen Text-to-SQL) untuk menjawab pertanyaan statistik, hitungan matematis, tren agregat kompleks, persentase, atau perbandingan antar kolom/tabel. Jika 'filterRecords' dan 'aggregateRecords' tidak cukup, JANGAN jawab 'saya tidak bisa', tetapi panggil alat ini dengan memasukkan pertanyaan Anda persis dalam bahasa Indonesia.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Pertanyaan jelas dan detail dalam bahasa Indonesia (contoh: 'Berapa total revenue untuk proyek telkomsel di tahun 2026?')"
        }
      },
      required: ["question"]
    }
  },
  {
    name: "search_document",
    description: "Mencari potongan teks atau paragraf spesifik di dalam file dokumen (seperti PDF) yang telah diunggah pengguna, menggunakan Vector Search. Gunakan alat ini ketika pengguna menanyakan isi dari dokumen atau file yang mereka unggah.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Kata kunci atau inti pertanyaan untuk dicari di dalam dokumen (contoh: 'syarat denda keterlambatan')"
        },
        file_name: {
          type: "string",
          description: "Opsional. Nama file spesifik jika diketahui. Jika tidak diisi, akan mencari di semua dokumen."
        }
      },
      required: ["query"]
    }
  }
];
