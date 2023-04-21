import { setSafeTimers } from '@vitest/utils';
import { r as resetRunOnceCounter } from './vendor-run-once.69ce7172.js';

let globalSetup = false;
async function setupCommonEnv(config) {
  resetRunOnceCounter();
  setupDefines(config.defines);
  if (globalSetup)
    return;
  globalSetup = true;
  setSafeTimers();
  if (config.globals)
    (await import('./chunk-integrations-globals.d419838f.js')).registerApiGlobally();
}
function setupDefines(defines) {
  for (const key in defines)
    globalThis[key] = defines[key];
}

export { setupCommonEnv as s };
