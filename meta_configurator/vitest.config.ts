import {fileURLToPath, URL} from 'node:url';
import {mergeConfig} from 'vite';
import {configDefaults, defineConfig} from 'vitest/config';
import viteConfig from './vite.config';
import {config} from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import {UserConfig} from "vitest";




const userConfig: UserConfig = defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/*'],
    root: fileURLToPath(new URL('./', import.meta.url)),
    transformMode: {
      web: [/\.[jt]sx$/],
    },
    coverage: {
      provider: 'c8',
    },
  },
});

export default mergeConfig(
  viteConfig,
  userConfig,
);
