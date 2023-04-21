import { performance } from 'node:perf_hooks';
import { c as createBirpc } from './vendor-index.7dcbfa46.js';
import { workerId } from 'tinypool';
import { g as getWorkerState } from './vendor-global.6795f91f.js';
import { s as startViteNode, m as moduleCache, a as mockMap } from './vendor-execute.70609f6f.js';
import { s as setupInspect } from './vendor-inspector.47fc8cbb.js';
import { a as rpcDone } from './vendor-rpc.4d3d7a54.js';
import '@vitest/utils';
import 'node:url';
import 'vite-node/client';
import 'vite-node/utils';
import 'pathe';
import '@vitest/runner/utils';
import './vendor-paths.84fc7a99.js';
import 'node:fs';
import '@vitest/spy';
import 'node:module';

function init(ctx) {
  if (typeof __vitest_worker__ !== "undefined" && ctx.config.threads && ctx.config.isolate)
    throw new Error(`worker for ${ctx.files.join(",")} already initialized by ${getWorkerState().ctx.files.join(",")}. This is probably an internal bug of Vitest.`);
  const { config, port, workerId: workerId$1 } = ctx;
  process.env.VITEST_WORKER_ID = String(workerId$1);
  process.env.VITEST_POOL_ID = String(workerId);
  globalThis.__vitest_environment__ = config.environment;
  globalThis.__vitest_worker__ = {
    ctx,
    moduleCache,
    config,
    mockMap,
    durations: {
      environment: 0,
      prepare: performance.now()
    },
    rpc: createBirpc(
      {},
      {
        eventNames: ["onUserConsoleLog", "onFinished", "onCollected", "onWorkerExit"],
        post(v) {
          port.postMessage(v);
        },
        on(fn) {
          port.addListener("message", fn);
        }
      }
    )
  };
  if (ctx.invalidates) {
    ctx.invalidates.forEach((fsPath) => {
      moduleCache.delete(fsPath);
      moduleCache.delete(`mock:${fsPath}`);
    });
  }
  ctx.files.forEach((i) => moduleCache.delete(i));
}
async function run(ctx) {
  const inspectorCleanup = setupInspect(ctx.config);
  try {
    init(ctx);
    const { run: run2, executor } = await startViteNode(ctx);
    await run2(ctx.files, ctx.config, ctx.environment, executor);
    await rpcDone();
  } finally {
    inspectorCleanup();
  }
}

export { run };
