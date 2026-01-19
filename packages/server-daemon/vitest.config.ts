import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist']
    }
  },
  resolve: {
    alias: {
      '@streaming-enhancement/keystore-native': path.resolve(__dirname, '../../shared/keystore-native')
    }
  }
});
