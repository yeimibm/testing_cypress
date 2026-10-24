import { resetDatabase } from './lifecycle.js';
import { resolveDatabasePath } from './client.js';
export function resetTestDatabase(): void { resetDatabase(resolveDatabasePath('.data/e2e.sqlite'), 'test'); }
