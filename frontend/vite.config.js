import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor';
          }
        },
      },
    },
  },
});
