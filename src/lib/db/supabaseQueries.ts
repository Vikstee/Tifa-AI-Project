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
    
    const { data, error } = await query.limit(limitAmount || 50);
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
    // Protect against massive memory dumps by hard-capping at 5000 rows for manual frontend aggregation
    const { data, error } = await query.limit(5000);
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
    // Fetch existing memory to accumulate traits
    const existing = await getUserMemory(userId);
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
      user_id: userId,
      memory_text: updatedText,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
    if (error) return { error: error.message };
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
