import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlFiles = readdirSync(__dirname).filter((file) => file.endsWith('.html'));
const input = Object.fromEntries(
  htmlFiles.map((file) => [file.replace(/\.html$/, ''), resolve(__dirname, file)])
);

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    rollupOptions: {
      input
    }
  }
});
