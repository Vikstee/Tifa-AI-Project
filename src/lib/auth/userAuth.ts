import crypto from 'crypto';
import { queryMysql } from '../db/mysqlClient';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

export interface UserRecord {
  id: string;
  user_uuid: string;
  name: string;
  email: string;
  wa_number?: string;
  llm_model?: string;
  avatar_url?: string;
}

export async function registerUser(email: string, password: string, name: string, waNumber?: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email dan password wajib diisi.');
  }

  // 1. Check if email already registered
  const existingRows = await queryMysql<any>('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
  if (existingRows.length > 0) {
    throw new Error('Email sudah terdaftar. Silakan masuk menggunakan akun Anda.');
  }

  // 2. Hash password and generate UUID
  const passwordHash = hashPassword(password);
  const userUuid = crypto.randomUUID();
  const displayName = name?.trim() || cleanEmail.split('@')[0];

  const sql = `
    INSERT INTO users (user_uuid, name, email, password_hash, wa_number, llm_model)
    VALUES (?, ?, ?, ?, ?, 'flash')
  `;
  await queryMysql(sql, [userUuid, displayName, cleanEmail, passwordHash, waNumber || '']);

  return {
    id: userUuid,
    user_uuid: userUuid,
    name: displayName,
    email: cleanEmail,
    wa_number: waNumber || '',
    llm_model: 'flash',
  };
}

export async function loginUser(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Email dan password wajib diisi.');
  }

  // 1. Fetch user by email
  const rows = await queryMysql<any>('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
  if (rows.length === 0) {
    throw new Error('Email belum terdaftar. Silakan daftar akun terlebih dahulu.');
  }

  const user = rows[0];

  // 2. Verify password
  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('Password yang Anda masukkan salah.');
  }

  const token = `token-${user.user_uuid}-${Date.now()}`;

  return {
    token,
    user: {
      id: user.user_uuid,
      user_uuid: user.user_uuid,
      name: user.name,
      email: user.email,
      wa_number: user.wa_number || '',
      llm_model: user.llm_model || 'flash',
      avatar_url: user.avatar_url || '',
    },
  };
}

export async function updateUserProfile(userId: string, data: { name?: string; waNumber?: string; avatarUrl?: string; llmModel?: string; password?: string }) {
  if (!userId) throw new Error('User ID wajib disertakan');

  const fields: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    params.push(data.name);
  }
  if (data.waNumber !== undefined) {
    fields.push('wa_number = ?');
    params.push(data.waNumber);
  }
  if (data.avatarUrl !== undefined) {
    fields.push('avatar_url = ?');
    params.push(data.avatarUrl);
  }
  if (data.llmModel !== undefined) {
    fields.push('llm_model = ?');
    params.push(data.llmModel);
  }
  if (data.password) {
    fields.push('password_hash = ?');
    params.push(hashPassword(data.password));
  }

  if (fields.length === 0) return { success: true };

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE user_uuid = ? OR id = ?`;
  params.push(userId, userId);

  await queryMysql(sql, params);
  return { success: true };
}
