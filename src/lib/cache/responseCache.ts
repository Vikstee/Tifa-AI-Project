// Smart In-Memory & Supabase Permanent Knowledge Cache for TIFA AI
// Provides instant (<0.5s) answers for repeated or contextually identical queries
// Persists knowledge indefinitely in Supabase PostgreSQL while accelerating RAM lookups

import { getKnowledgeBankMemory, saveKnowledgeBankMemory } from '@/lib/db/supabaseQueries';

interface CacheEntry {
  responseText: string;
  timestamp: number;
}

// 24 hours TTL for RAM cache entries (dapat disesuaikan)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Maximum 500 cached entries (~2MB RAM max) to prevent memory leaks
const MAX_CACHE_ENTRIES = 500;

// Global in-memory cache map
const responseCacheMap = new Map<string, CacheEntry>();

/**
 * Normalizes user prompt to a canonical key.
 * Converts to lowercase, trims whitespace, removes non-alphanumeric noise.
 */
export function normalizePromptKey(prompt: string, userId?: string): string {
  const cleanPrompt = prompt
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ');
  
  // Scope by userId if provided, else global
  const scope = userId ? `user:${userId}` : 'global';
  return `${scope}:${cleanPrompt}`;
}

/**
 * Retrieves cached response if valid (checks RAM first, then Supabase permanent DB).
 */
export async function getCachedResponseAsync(prompt: string, userId?: string, hasFiles: boolean = false): Promise<string | null> {
  // If prompt involves files or real-time commands, bypass cache for freshness
  if (hasFiles) return null;

  const key = normalizePromptKey(prompt, userId);

  // 1. Check ultra-fast RAM cache first (<0.1ms)
  const entry = responseCacheMap.get(key);
  if (entry) {
    const now = Date.now();
    if (now - entry.timestamp <= CACHE_TTL_MS) {
      console.log(`[Tifa Cache] ⚡ RAM Cache HIT for key: "${key}"`);
      return entry.responseText;
    }
  }

  // 2. Fallback to Supabase Permanent Knowledge Bank (Indefinite storage)
  try {
    const dbKnowledge = await getKnowledgeBankMemory(key);
    if (dbKnowledge?.knowledge_output) {
      console.log(`[Tifa Cache] 🏛️ Supabase Permanent Knowledge HIT for key: "${key}" (use_count: ${dbKnowledge.use_count})`);
      // Warm up RAM cache for next hits
      responseCacheMap.set(key, {
        responseText: dbKnowledge.knowledge_output,
        timestamp: Date.now()
      });
      return dbKnowledge.knowledge_output;
    }
  } catch (err) {
    console.warn('[Tifa Cache] Supabase lookup error:', err);
  }

  return null;
}

/**
 * Stores generated response in RAM cache and saves permanently to Supabase DB.
 */
export async function setCachedResponseAsync(prompt: string, responseText: string, userId?: string, hasFiles: boolean = false): Promise<void> {
  if (hasFiles || !responseText || responseText.length < 20) return;

  // Evict oldest RAM entry if max capacity reached
  if (responseCacheMap.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCacheMap.keys().next().value;
    if (oldestKey) responseCacheMap.delete(oldestKey);
  }

  const key = normalizePromptKey(prompt, userId);

  // 1. Store in RAM Cache
  responseCacheMap.set(key, {
    responseText,
    timestamp: Date.now()
  });

  // 2. Persist in Supabase ai_knowledge_bank permanently
  try {
    await saveKnowledgeBankMemory(key, prompt, responseText);
    console.log(`[Tifa Cache] 💾 Saved permanently to Supabase Knowledge Bank: "${key}"`);
  } catch (err) {
    console.warn('[Tifa Cache] Failed to persist knowledge in Supabase:', err);
  }
}
