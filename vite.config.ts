import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        // Backend writes here on every prediction; ignore so it doesn't
        // trigger a Vite page reload that wipes Analysis page state.
        ignored: ['**/backend_api/data/**', '**/.venv/**', '**/__pycache__/**'],
      },
    },
  };
});
