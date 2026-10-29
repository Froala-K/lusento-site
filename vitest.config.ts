import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// 프로젝트 루트를 동적으로 탐색 (artisan 파일 기준 — _bundled/활성 모두 호환)
function findProjectRoot(startDir: string): string {
    let dir = startDir;
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'artisan'))) return dir;
        dir = path.dirname(dir);
    }
    return path.resolve(startDir, '../..'); // fallback
}

const rootDir = findProjectRoot(__dirname);

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [rootDir],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(rootDir, 'resources/js/tests/setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}', '__tests__/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'resources/js'),
      '@core': path.resolve(rootDir, 'resources/js/core'),
      // 코어 렌더러와 독립 템플릿이 같은 React 인스턴스로 테스트되어야 한다.
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      '@testing-library/react': path.resolve(rootDir, 'node_modules/@testing-library/react'),
    },
  },
});
