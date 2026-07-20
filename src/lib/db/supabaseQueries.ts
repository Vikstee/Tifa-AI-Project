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
      query = query.order(orderColumn, { ascending: orderAscending !== false, nullsFirst: false });
    }
    
    const { data, error } = await query.limit(limitAmount || 100);
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

export const getUserMemory = async (userId: string) => {
  try {
    const { data, error } = await supabase.from('user_memories').select('memory_text').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') return { error: error.message }; // PGRST116 is not found
    return { data: data?.memory_text || '' };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const updateUserMemory = async (userId: string, memoryText: string) => {
  try {
    const { error } = await supabase.from('user_memories').upsert({
      user_id: userId,
      memory_text: memoryText,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
    if (error) return { error: error.message };
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
};

/**
 * Utility to scan JSON results for UUIDs and replace them with Project Names.
 * This ensures Gemini always receives human-readable names for project_ids.
 */
export const enrichWithProjectNames = async (data: any) => {
  if (!data) return data;
  let strData = JSON.stringify(data);
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const matches = strData.match(uuidRegex);
  
  if (!matches || matches.length === 0) return data;
  
  const uniqueUuids = [...new Set(matches)];
  
  // Query Supabase for these UUIDs in projects table
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, project_name')
    .in('id', uniqueUuids);
    
  if (error || !projects || projects.length === 0) return data;
  
  // Replace UUIDs with project_name
  for (const proj of projects) {
    const regex = new RegExp(proj.id, 'gi');
    strData = strData.replace(regex, `${proj.project_name} (${proj.id.substring(0,4)})`);
  }
  
  return JSON.parse(strData);
};
