import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Canonical Vite config. This lives at the project root so that tooling such
// as the shadcn CLI can detect a Vite project (it globs for `vite.config.*`).
// The Electron Forge renderer build loads it via `vite.renderer.config.mjs`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
