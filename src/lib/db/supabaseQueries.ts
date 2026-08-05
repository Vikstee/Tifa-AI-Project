import { supabase } from '../supabaseClient';

const DB_COLUMN_MAP: Record<string, string> = {
  'periode': 'period',
  'tahun': 'period',
  'realisasi revenue (rp)': 'revenue',
  'realisasi revenue': 'revenue',
  'revenue': 'revenue',
  'target rkap (rp)': 'rkap',
  'target rkap': 'rkap',
  'rkap': 'rkap',
  'proyeksi outlook (rp)': 'outlook_amount',
  'proyeksi outlook': 'outlook_amount',
  'outlook': 'outlook_amount',
  'total cash in (rp)': 'cash_in',
  'total cash in': 'cash_in',
  'cash in': 'cash_in',
  'cash_in': 'cash_in',
  'nilai bast (rp)': 'bast_amount',
  'nilai bast': 'bast_amount',
  'bast': 'bast_amount',
  'total invoice (rp)': 'invoice',
  'total invoice': 'invoice',
  'invoice': 'invoice',
  'denda pinalty (rp)': 'pinalty',
  'denda pinalty': 'pinalty',
  'pinalty': 'pinalty',
  'nama proyek': 'project_name',
  'nama_proyek': 'project_name',
  'portofolio': 'portfolio',
  'portfolio': 'portfolio',
  'segmen': 'segment',
  'segment': 'segment',
  'ranking': 'id'
};

export const mapDbColumnName = (colName?: string): string => {
  if (!colName) return '';
  const clean = colName.trim().replace(/^"+|"+$/g, '').toLowerCase();
  return DB_COLUMN_MAP[clean] || clean;
};

export const lookupRecord = async (tableName: string, idColumn: string, idValue: string, selectColumns?: string) => {
  try {
    const realIdCol = mapDbColumnName(idColumn);
    const { data, error } = await supabase.from(tableName).select(selectColumns || '*').eq(realIdCol, idValue);
    if (error) return { error: error.message };
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const filterRecords = async (tableName: string, filterColumn?: string, filterValue?: string, selectColumns?: string, limitAmount?: number, orderColumn?: string, orderAscending?: boolean) => {
  try {
    const realFilterCol = mapDbColumnName(filterColumn);
    const realOrderCol = mapDbColumnName(orderColumn);

    let query = supabase.from(tableName).select('*');
    if (realFilterCol && filterValue) {
      if (filterValue.startsWith('>=') || filterValue.startsWith('<=')) {
        const op = filterValue.substring(0, 2);
        const val = filterValue.substring(2).trim();
        if (op === '>=') query = query.gte(realFilterCol, val);
        else query = query.lte(realFilterCol, val);
      } else if (filterValue.startsWith('>')) {
        query = query.gt(realFilterCol, filterValue.substring(1).trim());
      } else if (filterValue.startsWith('<')) {
        query = query.lt(realFilterCol, filterValue.substring(1).trim());
      } else {
        query = query.ilike(realFilterCol, `%${filterValue}%`);
      }
    }
    
    if (realOrderCol) {
      query = query.order(realOrderCol, { ascending: orderAscending !== false, nullsFirst: false });
    }
    
    const { data, error } = await query.limit(limitAmount || 50);
    if (error) return { error: error.message };
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const aggregateRecords = async (tableName: string, sumColumn: string, filterColumn?: string, filterValue?: string) => {
  try {
    const realSumCol = mapDbColumnName(sumColumn);
    const realFilterCol = mapDbColumnName(filterColumn);

    let query = supabase.from(tableName).select(realSumCol);
    if (realFilterCol && filterValue) {
      query = query.ilike(realFilterCol, `%${filterValue}%`);
    }
    const { data, error } = await query.limit(5000);
    if (error) return { error: error.message };
    
    let total = 0;
    (data || []).forEach((row: any) => {
      if (row[realSumCol]) total += Number(row[realSumCol]);
    });
    return { total, count: data?.length || 0 };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const deleteUserMemoryItem = async (userId: string, memoryText: string) => {
  try {
    const validUuid = toValidUuid(userId);
    const existing = await getUserMemory(validUuid);
    const target = memoryText.trim().toLowerCase();
    if (!existing?.data || !target) return { success: true, memory: '' };
    const remaining = existing.data.split(/\r?\n/).filter((line: string) => !line.toLowerCase().includes(target)).join('\n').trim();
    const { error } = await supabase.from('user_memories').upsert({ user_id: validUuid, memory_text: remaining, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { error: error.message };
    return { success: true, memory: remaining };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const clearUserMemory = async (userId: string) => {
  try {
    const validUuid = toValidUuid(userId);
    const { error } = await supabase.from('user_memories').upsert({ user_id: validUuid, memory_text: '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { error: error.message };
    return { success: true, memory: '' };
  } catch (error: any) {
    return { error: error.message };
  }
};
/**
 * Ensures any userId string (e.g. "default_user", "viki", etc.) is converted
 * into a valid UUID string format so Supabase UUID column never errors.
 */
export const toValidUuid = (userId: string): string => {
  if (!userId) return '00000000-0000-4000-8000-000000000001';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) return userId;

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
  return `00000000-0000-4000-8000-${hexHash}`;
};

export const getUserMemory = async (userId: string) => {
  try {
    const validUuid = toValidUuid(userId);
    const { data, error } = await supabase.from('user_memories').select('memory_text').eq('user_id', validUuid).single();
    if (error && error.code !== 'PGRST116') return { error: error.message }; // PGRST116 is not found
    return { data: data?.memory_text || '' };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const updateUserMemory = async (userId: string, memoryText: string) => {
  try {
    const validUuid = toValidUuid(userId);
    // Fetch existing memory to accumulate traits
    const existing = await getUserMemory(validUuid);
    let updatedText = memoryText.trim();

    if (existing?.data && existing.data.trim()) {
      const formattedItem = updatedText.startsWith('-') ? updatedText : `- ${updatedText}`;
      if (!existing.data.includes(updatedText)) {
        updatedText = `${existing.data.trim()}\n${formattedItem}`;
      } else {
        updatedText = existing.data.trim();
      }
    } else {
      updatedText = updatedText.startsWith('-') ? updatedText : `- ${updatedText}`;
    }

    const { error } = await supabase.from('user_memories').upsert({
      user_id: validUuid,
      memory_text: updatedText,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
    if (error) {
      console.error('[Tifa Memory Error]:', error);
      return { error: error.message };
    }
    return { success: true, memory: updatedText };
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
  
  const uniqueUuids = Array.from(new Set(matches));
  
  // Query Supabase for these UUIDs in data_po-cashin table
  const { data: projects, error } = await supabase
    .from('data_po-cashin')
    .select('id, project_name')
    .in('id', uniqueUuids);
    
  if (error || !projects || projects.length === 0) return data;
  
  // Replace UUIDs with project_name
  for (const proj of projects) {
    const regex = new RegExp(String(proj.id), 'gi');
    strData = strData.replace(regex, `${proj.project_name} (${proj.id})`);
  }
  
  return JSON.parse(strData);
};

/**
 * Saves a high-value knowledge memory entry permanently to Supabase ai_knowledge_bank.
 */
export const saveKnowledgeBankMemory = async (intentKey: string, promptSample: string, outputText: string) => {
  try {
    const { data, error } = await supabase.from('ai_knowledge_bank').upsert({
      intent_key: intentKey,
      prompt_sample: promptSample,
      knowledge_output: outputText,
      use_count: 1,
      is_active: true,
      last_used_at: new Date().toISOString()
    }, { onConflict: 'intent_key' });

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Fetches an active knowledge memory entry by intentKey from Supabase.
 */
export const getKnowledgeBankMemory = async (intentKey: string) => {
  try {
    const { data, error } = await supabase
      .from('ai_knowledge_bank')
      .select('*')
      .eq('intent_key', intentKey)
      .eq('is_active', true)
      .single();

    if (error) return null;
    
    // Increment use_count asynchronously
    if (data) {
      await supabase.from('ai_knowledge_bank').update({
        use_count: (data.use_count || 1) + 1,
        last_used_at: new Date().toISOString()
      }).eq('id', data.id);
    }

    return data;
  } catch (err) {
    return null;
  }
};

/**
 * Deletes or deactivates an outdated memory entry (Developer Tooling).
 */
export const deleteOutdatedKnowledgeMemory = async (memoryId: string) => {
  try {
    const { error } = await supabase.from('ai_knowledge_bank').delete().eq('id', memoryId);
    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Lists top used memory entries ordered by frequency for analytics/admin review.
 */
export const listTopUsedKnowledgeMemories = async (limitAmount = 50) => {
  try {
    const { data, error } = await supabase
      .from('ai_knowledge_bank')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(limitAmount);

    if (error) return { error: error.message };
    return { data: data || [] };
  } catch (err: any) {
    return { error: err.message };
  }
};
