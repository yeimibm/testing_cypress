import { defineConfig } from 'drizzle-kit';
// Read emitted ESM so Drizzle Kit resolves NodeNext .js imports consistently.
export default defineConfig({ schema: './dist/schema/*.js', out: './migrations', dialect: 'sqlite' });
