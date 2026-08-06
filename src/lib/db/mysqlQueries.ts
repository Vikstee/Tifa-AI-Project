import { queryMysql } from './mysqlClient';

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

const sanitizeIdentifier = (name: string): string => {
  return name.replace(/`/g, '');
};

export const lookupRecord = async (tableName: string, idColumn: string, idValue: string, selectColumns?: string) => {
  try {
    const cleanTable = sanitizeIdentifier(tableName);
    const realIdCol = sanitizeIdentifier(mapDbColumnName(idColumn));
    const cols = selectColumns ? selectColumns.split(',').map(c => `\`${sanitizeIdentifier(c.trim())}\``).join(', ') : '*';
    const sql = `SELECT ${cols} FROM \`${cleanTable}\` WHERE \`${realIdCol}\` = ? LIMIT 1`;
    const rows = await queryMysql(sql, [idValue]);
    return { data: rows };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const filterRecords = async (tableName: string, filterColumn?: string, filterValue?: string, selectColumns?: string, limitAmount?: number, orderColumn?: string, orderAscending?: boolean) => {
  try {
    const cleanTable = sanitizeIdentifier(tableName);
    const realFilterCol = filterColumn ? sanitizeIdentifier(mapDbColumnName(filterColumn)) : null;
    const realOrderCol = orderColumn ? sanitizeIdentifier(mapDbColumnName(orderColumn)) : null;
    
    let sql = `SELECT * FROM \`${cleanTable}\``;
    const params: any[] = [];

    if (realFilterCol && filterValue) {
      if (filterValue.startsWith('>=') || filterValue.startsWith('<=')) {
        const op = filterValue.substring(0, 2);
        const val = filterValue.substring(2).trim();
        sql += ` WHERE \`${realFilterCol}\` ${op} ?`;
        params.push(val);
      } else if (filterValue.startsWith('>')) {
        sql += ` WHERE \`${realFilterCol}\` > ?`;
        params.push(filterValue.substring(1).trim());
      } else if (filterValue.startsWith('<')) {
        sql += ` WHERE \`${realFilterCol}\` < ?`;
        params.push(filterValue.substring(1).trim());
      } else {
        sql += ` WHERE \`${realFilterCol}\` LIKE ?`;
        params.push(`%${filterValue}%`);
      }
    }

    if (realOrderCol) {
      const direction = orderAscending !== false ? 'ASC' : 'DESC';
      sql += ` ORDER BY \`${realOrderCol}\` ${direction}`;
    }

    const limit = limitAmount || 50;
    sql += ` LIMIT ?`;
    params.push(limit);

    const rows = await queryMysql(sql, params);
    return { data: rows };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const aggregateRecords = async (tableName: string, sumColumn: string, filterColumn?: string, filterValue?: string) => {
  try {
    const cleanTable = sanitizeIdentifier(tableName);
    const realSumCol = sanitizeIdentifier(mapDbColumnName(sumColumn));
    const realFilterCol = filterColumn ? sanitizeIdentifier(mapDbColumnName(filterColumn)) : null;

    let sql = `SELECT SUM(\`${realSumCol}\`) as total, COUNT(*) as count FROM \`${cleanTable}\``;
    const params: any[] = [];

    if (realFilterCol && filterValue) {
      sql += ` WHERE \`${realFilterCol}\` LIKE ?`;
      params.push(`%${filterValue}%`);
    }

    const rows = await queryMysql(sql, params);
    const firstRow = rows[0] || {};
    return {
      total: Number(firstRow.total || 0),
      count: Number(firstRow.count || 0)
    };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const toValidUuid = (userId: string): string => {
  if (!userId) return 'default_user';
  return userId.trim();
};

export const getUserMemory = async (userId: string) => {
  try {
    const validUuid = toValidUuid(userId);
    const sql = `SELECT memory_text FROM user_memories WHERE user_id = ? LIMIT 1`;
    const rows = await queryMysql(sql, [validUuid]);
    return { data: rows[0]?.memory_text || '' };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const updateUserMemory = async (userId: string, memoryText: string) => {
  try {
    const validUuid = toValidUuid(userId);
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

    const sql = `
      INSERT INTO user_memories (user_id, memory_text, updated_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE memory_text = VALUES(memory_text), updated_at = NOW()
    `;
    await queryMysql(sql, [validUuid, updatedText]);
    return { success: true, memory: updatedText };
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
    
    const sql = `
      INSERT INTO user_memories (user_id, memory_text, updated_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE memory_text = VALUES(memory_text), updated_at = NOW()
    `;
    await queryMysql(sql, [validUuid, remaining]);
    return { success: true, memory: remaining };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const clearUserMemory = async (userId: string) => {
  try {
    const validUuid = toValidUuid(userId);
    const sql = `
      INSERT INTO user_memories (user_id, memory_text, updated_at)
      VALUES (?, '', NOW())
      ON DUPLICATE KEY UPDATE memory_text = '', updated_at = NOW()
    `;
    await queryMysql(sql, [validUuid]);
    return { success: true, memory: '' };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const enrichWithProjectNames = async (data: any) => {
  if (!data) return data;
  let strData = JSON.stringify(data);
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const matches = strData.match(uuidRegex);
  
  if (!matches || matches.length === 0) return data;
  
  const uniqueUuids = Array.from(new Set(matches));
  try {
    const placeholders = uniqueUuids.map(() => '?').join(',');
    const sql = `SELECT id, project_name FROM \`data_po-cashin\` WHERE id IN (${placeholders})`;
    const projects = await queryMysql(sql, uniqueUuids);

    if (!projects || projects.length === 0) return data;

    for (const proj of projects) {
      const regex = new RegExp(String(proj.id), 'gi');
      strData = strData.replace(regex, `${proj.project_name} (${proj.id})`);
    }

    return JSON.parse(strData);
  } catch {
    return data;
  }
};

export const saveKnowledgeBankMemory = async (intentKey: string, promptSample: string, outputText: string) => {
  try {
    const safeKey = intentKey ? intentKey.slice(0, 250) : 'default_intent';
    const sql = `
      INSERT INTO ai_knowledge_bank (intent_key, prompt_sample, knowledge_output, use_count, is_active, last_used_at)
      VALUES (?, ?, ?, 1, 1, NOW())
      ON DUPLICATE KEY UPDATE
        prompt_sample = VALUES(prompt_sample),
        knowledge_output = VALUES(knowledge_output),
        use_count = use_count + 1,
        is_active = 1,
        last_used_at = NOW()
    `;
    await queryMysql(sql, [safeKey, promptSample, outputText]);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
};

export const getKnowledgeBankMemory = async (intentKey: string) => {
  try {
    const safeKey = intentKey ? intentKey.slice(0, 250) : 'default_intent';
    const sql = `SELECT * FROM ai_knowledge_bank WHERE intent_key = ? AND is_active = 1 LIMIT 1`;
    const rows = await queryMysql(sql, [safeKey]);
    const data = rows[0];

    if (data) {
      const updateSql = `UPDATE ai_knowledge_bank SET use_count = use_count + 1, last_used_at = NOW() WHERE intent_key = ?`;
      queryMysql(updateSql, [safeKey]).catch(() => {});
    }

    return data || null;
  } catch (err) {
    return null;
  }
};

export const deleteOutdatedKnowledgeMemory = async (memoryId: string) => {
  try {
    const sql = `DELETE FROM ai_knowledge_bank WHERE id = ? OR intent_key = ?`;
    await queryMysql(sql, [memoryId, memoryId]);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
};

export const listTopUsedKnowledgeMemories = async (limitAmount = 50) => {
  try {
    const sql = `SELECT * FROM ai_knowledge_bank ORDER BY use_count DESC LIMIT ?`;
    const rows = await queryMysql(sql, [limitAmount]);
    return { data: rows };
  } catch (err: any) {
    return { error: err.message };
  }
};
