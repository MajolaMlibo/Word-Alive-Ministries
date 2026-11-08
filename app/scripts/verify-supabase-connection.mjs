import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');

function valueFromEnvFile(envFile, name) {
  const prefix = `${name}=`;
  const line = envFile
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().startsWith(prefix));

  if (!line) {
    return undefined;
  }

  return line.trim().slice(prefix.length).trim().replace(/^['"]|['"]$/g, '');
}

try {
  const envFile = await readFile(envPath, 'utf8');
  const supabaseUrl = valueFromEnvFile(envFile, 'EXPO_PUBLIC_SUPABASE_URL');
  const publishableKey = valueFromEnvFile(
    envFile,
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  );

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'app/.env must define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`,
    { headers: { apikey: publishableKey } }
  );

  if (!response.ok) {
    throw new Error(`Supabase Auth responded with HTTP ${response.status}.`);
  }

  console.log('Supabase connection verified: Auth settings responded with HTTP 200.');
} catch (error) {
  console.error(
    `Supabase connection verification failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
}
