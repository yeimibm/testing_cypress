import { seedDatabase } from '../src/lifecycle.js';
import { databasePath } from './environment.js';
seedDatabase(databasePath);
console.log(`Seeded SQLite database: ${databasePath}`);
