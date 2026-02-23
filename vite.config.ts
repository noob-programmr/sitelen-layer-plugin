import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SitelenLayerPlugin',
      fileName: 'sitelen-layer-plugin',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  }
});
