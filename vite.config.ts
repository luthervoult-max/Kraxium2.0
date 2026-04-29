import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          xyflow: ['@xyflow/react'],
          supabase: ['@supabase/supabase-js'],
          tremor: ['@tremor/react'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
})
