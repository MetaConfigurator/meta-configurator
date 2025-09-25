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
      // Don't externalize json-schema-faker - ensure it gets bundled
      external: [],
    },
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
  // Define global for runtime
  define: {
    global: 'globalThis',
  },
  test: {
    // add test config here
  },
});
