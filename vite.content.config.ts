import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [solid()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: resolve(__dirname, 'src/content/main.tsx'), name: 'LeetCopilotContent', formats: ['iife'], fileName: () => 'assets/content.js' },
    rollupOptions: { output: { assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'assets/content.css' : 'assets/[name]-[hash][extname]' } },
  },
});
