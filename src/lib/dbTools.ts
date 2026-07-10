import { supabase } from './supabaseClient';

// 1. Lookup a specific record by ID
export async function lookupRecord(tableName: string, idColumn: string, idValue: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq(idColumn, idValue)
    .single();

  if (error) {
    return { error: error.message };
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
    return { error: error.message };
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
    return { error: error.message };
  }

  const totalSum = data.reduce((acc, row: any) => acc + (Number(row[sumColumn]) || 0), 0);
  
  return { 
    count: data.length,
    totalSum: totalSum
  };
}

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
  }
];
