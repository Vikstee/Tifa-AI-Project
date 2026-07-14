import { supabase } from '../supabaseClient';

export const lookupRecord = async (tableName: string, idColumn: string, idValue: string, selectColumns?: string) => {
  try {
    const { data, error } = await supabase.from(tableName).select(selectColumns || '*').eq(idColumn, idValue);
    if (error) return { error: error.message };
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const filterRecords = async (tableName: string, filterColumn: string, filterValue: string, selectColumns?: string, limitAmount?: number, orderColumn?: string, orderAscending?: boolean) => {
  try {
    let query = supabase.from(tableName).select(selectColumns || '*');
    if (filterColumn && filterValue) {
      if (filterValue.startsWith('>=') || filterValue.startsWith('<=')) {
        const op = filterValue.substring(0, 2);
        const val = filterValue.substring(2).trim();
        if (op === '>=') query = query.gte(filterColumn, val);
        else query = query.lte(filterColumn, val);
      } else if (filterValue.startsWith('>')) {
        query = query.gt(filterColumn, filterValue.substring(1).trim());
      } else if (filterValue.startsWith('<')) {
        query = query.lt(filterColumn, filterValue.substring(1).trim());
      } else {
        query = query.ilike(filterColumn, `%${filterValue}%`);
      }
    }
    
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: orderAscending !== false });
    }
    
    const { data, error } = await query.limit(limitAmount || 15);
    if (error) return { error: error.message };
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const aggregateRecords = async (tableName: string, sumColumn: string, filterColumn?: string, filterValue?: string) => {
  try {
    let query = supabase.from(tableName).select(sumColumn);
    if (filterColumn && filterValue) {
      query = query.ilike(filterColumn, `%${filterValue}%`);
    }
    const { data, error } = await query;
    if (error) return { error: error.message };
    
    let total = 0;
    data.forEach((row: any) => {
      if (row[sumColumn]) total += Number(row[sumColumn]);
    });
    return { total, count: data.length };
  } catch (error: any) {
    return { error: error.message };
  }
};
