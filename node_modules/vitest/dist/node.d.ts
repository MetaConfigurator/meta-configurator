import { o as VitestRunMode, q as UserConfig, v as Vitest, a8 as MockFactory, a9 as MockMap, aa as TestSequencer, ab as WorkspaceSpec } from './types-e3c9754d.js';
export { ae as TestSequencerConstructor, ac as VitestWorkspace, ad as startVitest } from './types-e3c9754d.js';
import { UserConfig as UserConfig$1, Plugin } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeRunnerOptions } from 'vite-node';
import '@vitest/expect';
import '@vitest/snapshot';
import '@vitest/runner';
import '@vitest/runner/types';
import '@vitest/runner/utils';
import '@vitest/utils';
import 'tinybench';
import '@vitest/snapshot/manager';
import 'node:worker_threads';
import 'source-map';
import 'vite-node/server';
import 'node:fs';
import 'chai';

declare function createVitest(mode: VitestRunMode, options: UserConfig, viteOverrides?: UserConfig$1): Promise<Vitest>;

declare function VitestPlugin(options?: UserConfig, ctx?: Vitest): Promise<Plugin[]>;

type Key = string | symbol;
declare class VitestMocker {
    executor: VitestExecutor;
    private static pendingIds;
    private resolveCache;
    constructor(executor: VitestExecutor);
    private get root();
    private get mockMap();
    private get moduleCache();
    private deleteCachedItem;
    getSuiteFilepath(): string;
    getMocks(): {
        [x: string]: string | MockFactory | null;
    };
    private resolvePath;
    private resolveMocks;
    private callFunctionMock;
    getMockPath(dep: string): string;
    getDependencyMock(id: string): string | MockFactory | null;
    normalizePath(path: string): string;
    resolveMockPath(mockPath: string, external: string | null): string | null;
    mockObject(object: Record<Key, any>, mockExports?: Record<Key, any>): Record<Key, any>;
    unmockPath(path: string): void;
    mockPath(originalId: string, path: string, external: string | null, factory?: MockFactory): void;
    importActual<T>(rawId: string, importee: string): Promise<T>;
    importMock(rawId: string, importee: string): Promise<any>;
    requestWithMock(url: string, callstack: string[]): Promise<any>;
    queueMock(id: string, importer: string, factory?: MockFactory): void;
    queueUnmock(id: string, importer: string): void;
}

interface ExecuteOptions extends ViteNodeRunnerOptions {
    mockMap: MockMap;
}
declare class VitestExecutor extends ViteNodeRunner {
    options: ExecuteOptions;
    mocker: VitestMocker;
    constructor(options: ExecuteOptions);
    shouldResolveId(id: string, _importee?: string | undefined): boolean;
    resolveUrl(id: string, importer?: string): Promise<[url: string, fsPath: string]>;
    dependencyRequest(id: string, fsPath: string, callstack: string[]): Promise<any>;
    prepareContext(context: Record<string, any>): Record<string, any>;
}

declare class BaseSequencer implements TestSequencer {
    protected ctx: Vitest;
    constructor(ctx: Vitest);
    shard(files: WorkspaceSpec[]): Promise<WorkspaceSpec[]>;
    sort(files: WorkspaceSpec[]): Promise<WorkspaceSpec[]>;
}

export { BaseSequencer, ExecuteOptions, TestSequencer, Vitest, VitestExecutor, VitestPlugin, WorkspaceSpec, createVitest };
