import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';

function classicScriptPlugin() {
  return {
    name: 'classic-script',
    apply: 'build',
    closeBundle() {
      const file = 'dist/index.html';
      let html = readFileSync(file, 'utf8');
      html = html.replace(
        '<script type="module" crossorigin src="',
        '<script defer src="'
      );
      html = html.replace(
        '<link rel="stylesheet" crossorigin href=',
        '<link rel="stylesheet" href='
      );
      writeFileSync(file, html);
    },
  };
}

export default defineConfig({
  plugins: [react(), classicScriptPlugin()],
  base: './',
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2018',
    minify: 'esbuild',
    assetsInlineLimit: 100000,
  },
});