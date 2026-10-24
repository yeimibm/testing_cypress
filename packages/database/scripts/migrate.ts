import { migrateDatabase } from '../src/lifecycle.js';
import { databasePath } from './environment.js';
migrateDatabase(databasePath);
console.log(`Migrated SQLite database: ${databasePath}`);
