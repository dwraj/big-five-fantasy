import { defineConfig } from 'vitest/config';

// Root Vitest config for BACKEND tests (server/**/*.test.js).
// The frontend has its own suite under web/ (run via `npm run test:web`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.js'],
    setupFiles: ['server/test/setup.js'],
  },
});
