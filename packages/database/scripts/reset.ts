import { resetDatabase } from '../src/lifecycle.js';
import { databasePath } from './environment.js';
const environment = process.env.NODE_ENV ?? 'development';
if (environment !== 'development' && environment !== 'test') throw new Error('Reset is restricted to development and test.');
resetDatabase(databasePath, environment);
console.log(`Reset SQLite database: ${databasePath}`);
