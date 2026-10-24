import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { repositoryRoot, resolveDatabasePath } from '@coffee/database';

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const portText = environment.PORT ?? '3001';
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('PORT must be an integer from 1 through 65535.');
  if (environment.DATABASE_PATH === '') throw new Error('DATABASE_PATH cannot be empty.');
  return { port: Number(portText), databasePath: resolveDatabasePath(environment.DATABASE_PATH) };
}
export function loadEnvironmentFile(): void {
  const file = resolve(repositoryRoot, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}
