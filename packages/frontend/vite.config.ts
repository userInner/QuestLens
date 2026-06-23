import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'process', 'events', 'string_decoder'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    fs: {
      strict: false
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  preview: {
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-injective': [
            '@injectivelabs/sdk-ts',
            '@injectivelabs/wallet-core',
            '@injectivelabs/wallet-base',
            '@injectivelabs/wallet-cosmos',
            '@injectivelabs/wallet-evm',
            '@injectivelabs/networks',
            '@injectivelabs/ts-types',
          ],
          'vendor-ethers': ['ethers'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  resolve: {
    alias: {
      // Some Injective packages reference these Node built-ins
      'node:crypto': 'crypto-browserify',
    },
  },
  define: {
    'process.env': {},
  },
})
