import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function readEnvFileValue(key: string) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!existsSync(envPath)) return undefined;

    const file = readFileSync(envPath, 'utf8');
    const line = file
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${key}=`));

    if (!line) return undefined;

    const value = line.slice(key.length + 1).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function getAdminEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    readEnvFileValue('NEXT_PUBLIC_SUPABASE_URL');

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    readEnvFileValue('SUPABASE_SERVICE_ROLE_KEY');

  return { url, serviceRoleKey };
}

export function hasAdminEnv() {
  const { url, serviceRoleKey } = getAdminEnv();
  return Boolean(url && serviceRoleKey);
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getAdminEnv();

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
