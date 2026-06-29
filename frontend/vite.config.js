import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://triumphant-charisma-production-5363.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
      '/ai': {
        target: 'https://property-management-app-production-3e06.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});