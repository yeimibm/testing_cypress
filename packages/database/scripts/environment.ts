import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { repositoryRoot, resolveDatabasePath } from '../src/client.js';
const environmentFile = resolve(repositoryRoot, '.env');
if (existsSync(environmentFile)) process.loadEnvFile(environmentFile);
export const databasePath = resolveDatabasePath(process.env.DATABASE_PATH);
