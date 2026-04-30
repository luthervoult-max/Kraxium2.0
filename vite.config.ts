import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-stately/private/flags/flags': path.resolve(
        __dirname,
        './node_modules/react-stately/dist/exports/private/flags/flags.js',
      ),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')
          if (normalizedId.includes('/node_modules/@xyflow/react/')) return 'xyflow'
          if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase'
          if (normalizedId.includes('/node_modules/@tremor/')) return 'tremor'
          return undefined
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
