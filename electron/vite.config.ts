import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

// This config builds both main and preload
// Main uses ES modules, preload uses CommonJS
export default defineConfig({
  build: {
    outDir: '../dist-electron',
    emptyOutDir: true,
    target: 'node18',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'main.ts'),
        preload: resolve(__dirname, 'preload.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
      external: [
        'electron',
        '@nut-tree-fork/nut-js',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
    },
  },
})

