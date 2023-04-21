import { g as globalApis } from './vendor-constants.538d9b49.js';
import { i as index } from './vendor-index.81b9e499.js';
import '@vitest/runner';
import './vendor-vi.a3ff54b1.js';
import '@vitest/runner/utils';
import '@vitest/utils';
import './vendor-index.fad2598b.js';
import 'pathe';
import 'std-env';
import './vendor-global.6795f91f.js';
import 'chai';
import './vendor-_commonjsHelpers.76cdd49e.js';
import '@vitest/expect';
import '@vitest/snapshot';
import './vendor-tasks.042d6084.js';
import 'util';
import '@vitest/spy';
import './vendor-run-once.69ce7172.js';

function registerApiGlobally() {
  globalApis.forEach((api) => {
    globalThis[api] = index[api];
  });
}

export { registerApiGlobally };
