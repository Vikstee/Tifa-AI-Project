export const dbToolsDefinitions = [
  {
    name: 'update_user_memory',
    description: 'Menyimpan atau memperbarui ingatan AI tentang pengguna (profil, preferensi, instruksi khusus). Gunakan tool ini jika pengguna memberitahu sesuatu tentang dirinya yang harus diingat AI untuk obrolan berikutnya.',
    parameters: {
      type: 'object',
      properties: {
        memory_text: { type: 'string', description: 'Teks ingatan yang ingin disimpan (contoh: "Pengguna ingin dipanggil Pak Bos", "Pengguna suka laporan Excel"). Teks ini akan menimpa ingatan lama, jadi pastikan teks ini mencakup ringkasan semua ingatan penting.' }
      },
      required: ['memory_text']
    }
  },
  {
    name: 'lookupRecord',
    description: 'Mencari satu baris data spesifik berdasarkan ID atau primary key.',
    parameters: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Nama tabel (contoh: projects, rkap_stg, po_amount, outlook_amount, bast_amount_app2, revenue, invoice, cash_in)' },
        idColumn: { type: 'string', description: 'Nama kolom ID (contoh: id, project_id, po_id)' },
        idValue: { type: 'string', description: 'Nilai ID yang dicari' },
        selectColumns: { type: 'string', description: 'Opsional. Daftar kolom yang ditarik (koma). Contoh: "id, name, amount". Gunakan ini untuk menghemat kuota token!' }
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
        tableName: { type: 'string', description: 'Nama tabel (contoh: projects, rkap_stg, po_amount, outlook_amount, bast_amount_app2, revenue, invoice, cash_in). Untuk JOIN pakai tabel milestone + joinTable.' },
        filterColumn: { type: 'string', description: 'Nama kolom untuk filter (contoh: status)' },
        filterValue: { type: 'string', description: 'Nilai yang dicari. Bisa exact match atau operator (contoh: "Approved", ">=1000", "<50")' },
        selectColumns: { type: 'string', description: 'Opsional. Daftar kolom yang ditarik (contoh: "id, total_amount"). Gunakan untuk hemat token!' },
        limitAmount: { type: 'number', description: 'Opsional. Jumlah maksimal baris (default 15). Hemat token dengan membatasi baris.' },
        orderColumn: { type: 'string', description: 'Opsional. Nama kolom untuk mengurutkan (contoh: created_at, amount). Sangat berguna untuk mencari nilai Terbesar, Terkecil, Terbaru, atau Terlama.' },
        orderAscending: { type: 'boolean', description: 'Opsional. True untuk naik (Terkecil/Terlama), False untuk turun (Terbesar/Terbaru). Default: True.' }
      },
      required: ['tableName', 'filterColumn', 'filterValue']
    }
  },
  {
    name: 'aggregateRecords',
    description: 'Menghitung total penjumlahan (SUM) dari suatu kolom angka.',
    parameters: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Nama tabel (contoh: rkap_stg, po_amount, outlook_amount, bast_amount_app2, revenue, invoice, cash_in)' },
        sumColumn: { type: 'string', description: 'Nama kolom yang akan dijumlahkan (contoh: cash_in, revenue, po_amount, rkap_stg, invoice)' },
        filterColumn: { type: 'string', description: 'Kolom untuk filter opsional' },
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
          description: "Nama tabel (contoh: projects, rkap_stg, po_amount, outlook_amount, bast_amount_app2, revenue, invoice, cash_in)"
        },
        group_by: {
          type: "string",
          description: "Kolom yang dikelompokkan (contoh: status, client_name)"
        },
        sum_col: {
          type: "string",
          description: "Kolom angka yang dijumlahkan (contoh: amount)"
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
  }
];
