export { startTests } from '@vitest/runner';
import { a as ResolvedConfig, _ as CoverageOptions, S as CoverageProvider, Y as CoverageProviderModule } from './types-e3c9754d.js';
import '@vitest/expect';
import '@vitest/snapshot';
import 'vite';
import '@vitest/runner/types';
import '@vitest/runner/utils';
import '@vitest/utils';
import 'tinybench';
import 'vite-node/client';
import '@vitest/snapshot/manager';
import 'node:worker_threads';
import 'vite-node';
import 'source-map';
import 'vite-node/server';
import 'node:fs';
import 'chai';

declare function setupCommonEnv(config: ResolvedConfig): Promise<void>;

interface Loader {
    executeId: (id: string) => Promise<{
        default: CoverageProviderModule;
    }>;
}
declare function getCoverageProvider(options: CoverageOptions | undefined, loader: Loader): Promise<CoverageProvider | null>;
declare function startCoverageInsideWorker(options: CoverageOptions | undefined, loader: Loader): Promise<unknown>;
declare function takeCoverageInsideWorker(options: CoverageOptions | undefined, loader: Loader): Promise<unknown>;
declare function stopCoverageInsideWorker(options: CoverageOptions | undefined, loader: Loader): Promise<unknown>;

export { getCoverageProvider, setupCommonEnv, startCoverageInsideWorker, stopCoverageInsideWorker, takeCoverageInsideWorker };
