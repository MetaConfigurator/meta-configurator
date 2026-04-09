import {fileURLToPath, URL} from 'node:url';
import {createRequire} from 'node:module';

import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from "@vitejs/plugin-vue-jsx";
import {nodePolyfills} from "vite-plugin-node-polyfills";

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// Use process.env.USE_BASE_PATH to determine if base path should be included
const useMetaConfiguratorBasePath = process.env.USE_META_CONFIGURATOR_BASE_PATH === 'true';
const isExperimental = process.env.EXPERIMENTAL !== 'false';
const ACCEPT_RDF_HEADER =
  'application/rdf+xml, text/turtle, application/x-turtle, application/n-triples, text/n3, application/ld+json, application/json, application/xml, text/xml, text/plain';

function rdfProxyPlugin() {
  return {
    name: 'rdf-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/rdf-proxy', async (req, res) => {
        try {
          const reqUrl = new URL(req.url || '', 'http://localhost');
          const target = reqUrl.searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 'Missing "url" query parameter.'}));
            return;
          }

          let parsedTarget;
          try {
            parsedTarget = new URL(target);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 'Invalid target URL.'}));
            return;
          }

          if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 'Only http/https URLs are allowed.'}));
            return;
          }

          const upstream = await fetch(parsedTarget.toString(), {
            headers: {
              Accept: ACCEPT_RDF_HEADER,
            },
          });
          const body = await upstream.text();

          res.statusCode = upstream.status;
          const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
          res.setHeader('Content-Type', contentType);
          res.end(body);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({error: error instanceof Error ? error.message : 'Proxy failed.'}));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: useMetaConfiguratorBasePath ? '/meta-configurator/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_EXPERIMENTAL__: JSON.stringify(isExperimental),
  },
  plugins: [vue(), vueJsx(), rdfProxyPlugin(),

  nodePolyfills({
    globals: {
      Buffer: true,
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
