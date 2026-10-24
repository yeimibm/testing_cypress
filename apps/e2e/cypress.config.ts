import { defineConfig } from 'cypress';
import { databaseTasks } from './tasks/database';

export default defineConfig({
  video: true,
  screenshotOnRunFailure: true,
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  viewportWidth: 1440,
  viewportHeight: 1000,
  retries: 0,
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    testIsolation: true,
    setupNodeEvents(on) {
      on('task', databaseTasks());
    },
  },
});
