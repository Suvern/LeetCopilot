import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

function localDevelopmentKey() {
  try {
    const line = readFileSync(resolve(__dirname, '.env'), 'utf8').split(/\r?\n/).find((value) => value.startsWith('DEEPSEEK_API_KEY')) ?? '';
    return line.split(/[:=]/).slice(1).join(':').trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  base: './',
  define: { __LEETLENS_DEV_API_KEY__: JSON.stringify(localDevelopmentKey()) },
  plugins: [solid()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: { entryFileNames: 'assets/[name].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
    },
  },
});
