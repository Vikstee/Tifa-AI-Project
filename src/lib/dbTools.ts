import { supabase } from './supabaseClient';

// 1. Lookup a specific record by ID
export async function lookupRecord(tableName: string, idColumn: string, idValue: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq(idColumn, idValue)
    .single();

  if (error) {
    const { data: sample } = await supabase.from(tableName).select('*').limit(1);
    const cols = sample && sample.length > 0 ? Object.keys(sample[0]).join(', ') : 'unknown';
    return { error: `${error.message}. Note: Available columns in ${tableName} might be: ${cols}` };
  }
  return { data };
}

// 2. Filter records based on a condition (Limit to 5 to avoid token overflow)
export async function filterRecords(tableName: string, filterColumn: string, filterValue: string, limit: number = 5) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .ilike(filterColumn, `%${filterValue}%`)
    .limit(limit);

  if (error) {
    const { data: sample } = await supabase.from(tableName).select('*').limit(1);
    const cols = sample && sample.length > 0 ? Object.keys(sample[0]).join(', ') : 'unknown';
    return { error: `${error.message}. Note: Available columns in ${tableName} might be: ${cols}` };
  }
  
  // Also get the total count
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .ilike(filterColumn, `%${filterValue}%`);

  return { 
    totalMatch: count,
    showing: data.length,
    data 
  };
}

// 3. Aggregate (Sum) a column, optionally filtered by status
export async function aggregateRecords(tableName: string, sumColumn: string, filterColumn?: string, filterValue?: string) {
  let query = supabase.from(tableName).select(sumColumn);
  
  if (filterColumn && filterValue) {
    query = query.eq(filterColumn, filterValue);
  }

  const { data, error } = await query;

  if (error) {
    const { data: sample } = await supabase.from(tableName).select('*').limit(1);
    const cols = sample && sample.length > 0 ? Object.keys(sample[0]).join(', ') : 'unknown';
    return { error: `${error.message}. Hint: Available columns in ${tableName} are: ${cols}. Please retry with the correct column name.` };
  }

  const totalSum = data.reduce((acc, row: any) => acc + (Number(row[sumColumn]) || 0), 0);
  
  return { 
    count: data.length,
    totalSum: totalSum
  };
}

export const aggregateChartPython = async (table: string, group_by: string, sum_col: string) => {
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/aggregate_chart` : 'http://localhost:4028/api/aggregate_chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, group_by, sum_col })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching python chart data:', error);
    return { error: error.message };
  }
};

export const predictCashflowPython = async (months_ahead: number) => {
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/predict_cashflow` : 'http://localhost:4028/api/predict_cashflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ months_ahead })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching python forecast:', error);
    return { error: error.message };
  }
};

export const detectAnomalyPython = async (table: string, amount_col: string) => {
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/detect_anomaly` : 'http://localhost:4028/api/detect_anomaly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, amount_col })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching python anomalies:', error);
    return { error: error.message };
  }
};

export const dbToolsDefinitions = [
  {
    name: 'lookupRecord',
    description: 'Cari satu data spesifik berdasarkan ID (seperti project_id, po_number, so_number). Gunakan ini jika user menanyakan status atau detail 1 item spesifik.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tableName: {
          type: 'STRING',
          description: 'Nama tabel (projects, contracts, purchase_orders, sales_orders, invoices, cash_in)'
        },
        idColumn: {
          type: 'STRING',
          description: 'Nama kolom ID (project_id, po_number, so_number, contract_id, invoice_number, transaction_id)'
        },
        idValue: {
          type: 'STRING',
          description: 'Nilai ID yang dicari, pastikan formatnya benar (misal PRJ-2026-001, PO-2025-0123)'
        }
      },
      required: ['tableName', 'idColumn', 'idValue']
    }
  },
  {
    name: 'filterRecords',
    description: 'Cari sekumpulan data berdasarkan filter tertentu (misalnya status, nama klien). Mengembalikan maksimal 5 data agar tidak kepanjangan.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tableName: {
          type: 'STRING',
          description: 'Nama tabel (projects, contracts, purchase_orders, sales_orders, invoices, cash_in)'
        },
        filterColumn: {
          type: 'STRING',
          description: 'Kolom yang difilter (misal: status, client, vendor)'
        },
        filterValue: {
          type: 'STRING',
          description: 'Nilai filter (misal: Paid, Outstanding, Delayed)'
        }
      },
      required: ['tableName', 'filterColumn', 'filterValue']
    }
  },
  {
    name: 'aggregateRecords',
    description: 'Menghitung total nilai (Sum) dari banyak data (misalnya total uang, total nilai invoice), bisa difilter berdasarkan status jika perlu.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tableName: {
          type: 'STRING',
          description: 'Nama tabel (projects, contracts, purchase_orders, sales_orders, invoices, cash_in)'
        },
        sumColumn: {
          type: 'STRING',
          description: 'Nama kolom yang akan dijumlahkan uangnya (amount, value)'
        },
        filterColumn: {
          type: 'STRING',
          description: 'Kolom filter opsional (misal: status)'
        },
        filterValue: {
          type: 'STRING',
          description: 'Nilai filter opsional (misal: Paid, Unpaid)'
        }
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
  },
  {
    name: "predict_cashflow",
    description: "Meminta server Python untuk melakukan Machine Learning (Linear Regression) untuk memprediksi net cash flow di bulan-bulan mendatang berdasarkan data historis cash_in dan cash_out.",
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
    description: "Meminta server Python untuk mendeteksi transaksi/invoice yang aneh atau janggal menggunakan statistik Z-score dan mendeteksi tagihan ganda (duplikat). Gunakan jika user meminta deteksi fraud/anomali.",
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
