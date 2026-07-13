export const dbToolsDefinitions = [
  {
    type: "function",
    function: {
      name: 'lookupRecord',
      description: 'Mencari satu baris data spesifik berdasarkan ID atau primary key.',
      parameters: {
        type: 'object',
        properties: {
          tableName: { type: 'string', description: 'Nama tabel (contoh: projects, contracts, purchase_orders, sales_orders, invoices, cash_in)' },
          idColumn: { type: 'string', description: 'Nama kolom ID (contoh: id, project_id, po_id)' },
          idValue: { type: 'string', description: 'Nilai ID yang dicari' }
        },
        required: ['tableName', 'idColumn', 'idValue']
      }
    }
  },
  {
    type: "function",
    function: {
      name: 'filterRecords',
      description: 'Mencari beberapa baris data berdasarkan kriteria tertentu.',
      parameters: {
        type: 'object',
        properties: {
          tableName: { type: 'string', description: 'Nama tabel (contoh: purchase_orders)' },
          filterColumn: { type: 'string', description: 'Nama kolom untuk filter (contoh: status)' },
          filterValue: { type: 'string', description: 'Nilai yang dicari. Bisa exact match atau operator (contoh: "Approved", ">=1000", "<50")' }
        },
        required: ['tableName', 'filterColumn', 'filterValue']
      }
    }
  },
  {
    type: "function",
    function: {
      name: 'aggregateRecords',
      description: 'Menghitung total penjumlahan (SUM) dari suatu kolom angka.',
      parameters: {
        type: 'object',
        properties: {
          tableName: { type: 'string', description: 'Nama tabel (contoh: invoices)' },
          sumColumn: { type: 'string', description: 'Nama kolom yang akan dijumlahkan (contoh: amount, total_amount)' },
          filterColumn: { type: 'string', description: 'Kolom untuk filter opsional' },
          filterValue: { type: 'string', description: 'Nilai filter opsional' }
        },
        required: ['tableName', 'sumColumn']
      }
    }
  },
  {
    type: "function",
    function: {
      name: "aggregate_chart",
      description: "Meminta server Python untuk mengagregasi data jutaan baris (groupby) dan mengembalikannya dalam format chart JSON untuk dirender. Gunakan ini saat pengguna meminta grafik agregasi.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "Nama tabel (contoh: purchase_orders, invoices, cash_in, cash_out)"
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
    }
  },
  {
    type: "function",
    function: {
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
    }
  },
  {
    type: "function",
    function: {
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
  }
];
