import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

function deployPlugin() {
  return {
    name: 'deploy-to-root',
    apply: 'build',
    closeBundle() {
      const candidates = ['dist/index.html', 'dist/src/index.html'];
      let srcPath = null;
      for (const c of candidates) {
        if (existsSync(c)) { srcPath = c; break; }
      }
      if (!srcPath) return;

      let html = readFileSync(srcPath, 'utf8');
      html = html.replace(/<script type="module" crossorigin src="\.\.\/assets\//g, '<script defer src="./assets/');
      html = html.replace(/<link rel="stylesheet" crossorigin href="\.\.\/assets\//g, '<link rel="stylesheet" href="./assets/');
      writeFileSync('index.html', html);

      if (existsSync('dist/assets')) {
        mkdirSync('assets', { recursive: true });
        cpSync('dist/assets', 'assets', { recursive: true });
      }

      if (existsSync('dist/src')) {
        rmSync('dist/src', { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), deployPlugin()],
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
    rollupOptions: {
      input: fileURLToPath(new URL('./src/index.html', import.meta.url)),
    },
  },
});