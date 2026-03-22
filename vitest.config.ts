import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@axe': resolve(__dirname, 'src/app/class'),
      directive: resolve(__dirname, 'src/app/directive'),
      component: resolve(__dirname, 'src/app/component'),
      pipe: resolve(__dirname, 'src/app/pipe'),
      service: resolve(__dirname, 'src/app/service'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.d.ts', 'src/environments/**'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
