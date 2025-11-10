import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    outDir: '../dist-electron',
    emptyOutDir: false,
    target: 'node18',
    rollupOptions: {
      input: resolve(__dirname, 'main.ts'),
      output: {
        entryFileNames: 'main.js',
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


