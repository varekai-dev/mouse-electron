import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    outDir: '../dist-electron',
    emptyOutDir: false,
    target: 'node18',
    rollupOptions: {
      input: resolve(__dirname, 'preload.ts'),
      output: {
        entryFileNames: 'preload.js',
        format: 'cjs',
      },
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
    },
  },
})


