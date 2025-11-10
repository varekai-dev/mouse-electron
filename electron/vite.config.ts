import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// Plugin to copy assets folder
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    closeBundle() {
      const assetsSource = resolve(__dirname, '../assets/icons')
      const assetsDest = resolve(__dirname, '../dist-electron/assets/icons')
      
      if (existsSync(assetsSource)) {
        if (!existsSync(assetsDest)) {
          mkdirSync(assetsDest, { recursive: true })
        }
        
        // Copy icon.png if it exists
        const iconSource = resolve(assetsSource, 'icon.png')
        const iconDest = resolve(assetsDest, 'icon.png')
        if (existsSync(iconSource)) {
          copyFileSync(iconSource, iconDest)
        }
      }
    },
  }
}

// This config builds both main and preload
// Main uses ES modules, preload uses CommonJS
export default defineConfig({
  plugins: [copyAssetsPlugin()],
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

