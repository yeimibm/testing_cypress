import { createDatabase } from '@coffee/database';
import { createApp } from './app.js';
import { loadConfig, loadEnvironmentFile } from './config.js';

loadEnvironmentFile();
const config = loadConfig();
const db = createDatabase(config.databasePath);
const server = createApp({ db }).listen(config.port, '127.0.0.1', () => {
  console.log(`Coffee API listening at http://127.0.0.1:${config.port}`);
});
server.on('error', (error) => { console.error('API startup failed:', error); db.close(); process.exitCode = 1; });
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close((error) => { db.close(); if (error) { console.error('API shutdown failed:', error); process.exitCode = 1; } });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
