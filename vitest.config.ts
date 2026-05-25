import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular({ jit: false })],
  resolve: {
    alias: {
      '@axe': resolve(__dirname, 'src/app'),
      '@env': resolve(__dirname, 'src/environments'),
      '@pkg': resolve(__dirname, 'package.json'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    pool: 'threads',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/app/testing/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.d.ts', 'src/environments/**'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
