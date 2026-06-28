import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@schema': fileURLToPath(new URL('./src/schema', import.meta.url)),
    },
  },
});
