import {fileURLToPath, URL} from 'node:url';

import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from "@vitejs/plugin-vue-jsx";
import {nodePolyfills} from "vite-plugin-node-polyfills";

// Use process.env.USE_BASE_PATH to determine if base path should be included
const useMetaConfiguratorBasePath = process.env.USE_META_CONFIGURATOR_BASE_PATH === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  base: useMetaConfiguratorBasePath ? '/meta-configurator/' : '/',
  plugins: [vue(), vueJsx(),

  nodePolyfills({
    globals: {
      Buffer: false,
      global: true,
      process: true,
    },
  }),

],
  build: {
    outDir: 'dist',
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Isolate json-schema-faker to minimize minification issues
          'vendor-jsf': ['json-schema-faker']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: [
      "json-schema-faker", // ensure ESM build is pre-bundled for dev
    ],
  },
  test: {
    // add test config here
  },
});
