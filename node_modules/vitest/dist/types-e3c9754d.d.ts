import { MatchersObject, MatcherState } from '@vitest/expect';
import { SnapshotResult, SnapshotStateOptions, SnapshotState } from '@vitest/snapshot';
import { TransformResult as TransformResult$1, ViteDevServer, UserConfig as UserConfig$1, CommonServerOptions, AliasOptions, DepOptimizationConfig } from 'vite';
import * as _vitest_runner from '@vitest/runner';
import { Task as Task$1, Test as Test$2, TaskCustom, SequenceHooks, SequenceSetupFiles } from '@vitest/runner';
import { File, Test as Test$1, Suite, TaskResultPack, Task } from '@vitest/runner/types';
import { ParsedStack, ErrorWithDiff, ChainableFunction } from '@vitest/runner/utils';
import { Awaitable as Awaitable$1, Arrayable as Arrayable$1 } from '@vitest/utils';
import { Task as Task$2, TaskResult, Bench, Options } from 'tinybench';
import { ViteNodeRunner } from 'vite-node/client';
import { SnapshotManager } from '@vitest/snapshot/manager';
import { MessagePort } from 'node:worker_threads';
import { RawSourceMap, FetchResult, ViteNodeResolveId, ModuleCacheMap } from 'vite-node';
import { RawSourceMap as RawSourceMap$1 } from 'source-map';
import { ViteNodeServer } from 'vite-node/server';
import { Stats } from 'node:fs';
import * as chai from 'chai';

/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
declare type Colors = {
    comment: {
        close: string;
        open: string;
    };
    content: {
        close: string;
        open: string;
    };
    prop: {
        close: string;
        open: string;
    };
    tag: {
        close: string;
        open: string;
    };
    value: {
        close: string;
        open: string;
    };
};
declare type Indent = (arg0: string) => string;
declare type Refs = Array<unknown>;
declare type Print = (arg0: unknown) => string;
declare type ThemeReceived = {
    comment?: string;
    content?: string;
    prop?: string;
    tag?: string;
    value?: string;
};
declare type CompareKeys = ((a: string, b: string) => number) | undefined;
interface PrettyFormatOptions {
    callToJSON?: boolean;
    compareKeys?: CompareKeys;
    escapeRegex?: boolean;
    escapeString?: boolean;
    highlight?: boolean;
    indent?: number;
    maxDepth?: number;
    min?: boolean;
    plugins?: Plugins;
    printBasicPrototype?: boolean;
    printFunctionName?: boolean;
    theme?: ThemeReceived;
}
declare type Config = {
    callToJSON: boolean;
    compareKeys: CompareKeys;
    colors: Colors;
    escapeRegex: boolean;
    escapeString: boolean;
    indent: string;
    maxDepth: number;
    min: boolean;
    plugins: Plugins;
    printBasicPrototype: boolean;
    printFunctionName: boolean;
    spacingInner: string;
    spacingOuter: string;
};
declare type Printer = (val: unknown, config: Config, indentation: string, depth: number, refs: Refs, hasCalledToJSON?: boolean) => string;
declare type Test = (arg0: any) => boolean;
declare type NewPlugin = {
    serialize: (val: any, config: Config, indentation: string, depth: number, refs: Refs, printer: Printer) => string;
    test: Test;
};
declare type PluginOptions = {
    edgeSpacing: string;
    min: boolean;
    spacing: string;
};
declare type OldPlugin = {
    print: (val: unknown, print: Print, indent: Indent, options: PluginOptions, colors: Colors) => string;
    test: Test;
};
declare type Plugin = NewPlugin | OldPlugin;
declare type Plugins = Array<Plugin>;

// Type definitions for @sinonjs/fake-timers 8.1
// Project: https://github.com/sinonjs/fake-timers
// Definitions by: Wim Looman <https://github.com/Nemo157>
//                 Rogier Schouten <https://github.com/rogierschouten>
//                 Yishai Zehavi <https://github.com/zyishai>
//                 Remco Haszing <https://github.com/remcohaszing>
//                 Jaden Simon <https://github.com/JadenSimon>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

/**
 * Names of clock methods that may be faked by install.
 */
type FakeMethod =
    | 'setTimeout'
    | 'clearTimeout'
    | 'setImmediate'
    | 'clearImmediate'
    | 'setInterval'
    | 'clearInterval'
    | 'Date'
    | 'nextTick'
    | 'hrtime'
    | 'requestAnimationFrame'
    | 'cancelAnimationFrame'
    | 'requestIdleCallback'
    | 'cancelIdleCallback'
    | 'performance'
    | 'queueMicrotask';

interface FakeTimerInstallOpts {
    /**
     * Installs fake timers with the specified unix epoch (default: 0)
     */
    now?: number | Date | undefined;

    /**
     * An array with names of global methods and APIs to fake. By default, `@sinonjs/fake-timers` does not replace `nextTick()` and `queueMicrotask()`.
     * For instance, `FakeTimers.install({ toFake: ['setTimeout', 'nextTick'] })` will fake only `setTimeout()` and `nextTick()`
     */
    toFake?: FakeMethod[] | undefined;

    /**
     * The maximum number of timers that will be run when calling runAll() (default: 1000)
     */
    loopLimit?: number | undefined;

    /**
     * Tells @sinonjs/fake-timers to increment mocked time automatically based on the real system time shift (e.g. the mocked time will be incremented by
     * 20ms for every 20ms change in the real system time) (default: false)
     */
    shouldAdvanceTime?: boolean | undefined;

    /**
     * Relevant only when using with shouldAdvanceTime: true. increment mocked time by advanceTimeDelta ms every advanceTimeDelta ms change
     * in the real system time (default: 20)
     */
    advanceTimeDelta?: number | undefined;

    /**
     * Tells FakeTimers to clear 'native' (i.e. not fake) timers by delegating to their respective handlers. These are not cleared by
     * default, leading to potentially unexpected behavior if timers existed prior to installing FakeTimers. (default: false)
     */
    shouldClearNativeTimers?: boolean | undefined;
}

interface ParsedFile extends File {
    start: number;
    end: number;
}
interface ParsedTest extends Test$1 {
    start: number;
    end: number;
}
interface ParsedSuite extends Suite {
    start: number;
    end: number;
}
interface LocalCallDefinition {
    start: number;
    end: number;
    name: string;
    type: 'suite' | 'test';
    mode: 'run' | 'skip' | 'only' | 'todo';
    task: ParsedSuite | ParsedFile | ParsedTest;
}
interface FileInformation {
    file: File;
    filepath: string;
    parsed: string;
    map: RawSourceMap | null;
    definitions: LocalCallDefinition[];
}

declare class TypeCheckError extends Error {
    message: string;
    stacks: ParsedStack[];
    name: string;
    constructor(message: string, stacks: ParsedStack[]);
}
interface ErrorsCache {
    files: File[];
    sourceErrors: TypeCheckError[];
}
type Callback<Args extends Array<any> = []> = (...args: Args) => Awaitable<void>;
declare class Typechecker {
    protected ctx: WorkspaceProject;
    protected files: string[];
    private _onParseStart?;
    private _onParseEnd?;
    private _onWatcherRerun?;
    private _result;
    private _tests;
    private tempConfigPath?;
    private allowJs?;
    private process;
    constructor(ctx: WorkspaceProject, files: string[]);
    onParseStart(fn: Callback): void;
    onParseEnd(fn: Callback<[ErrorsCache]>): void;
    onWatcherRerun(fn: Callback): void;
    protected collectFileTests(filepath: string): Promise<FileInformation | null>;
    protected getFiles(): string[];
    collectTests(): Promise<Record<string, FileInformation>>;
    protected markPassed(file: File): void;
    protected prepareResults(output: string): Promise<{
        files: File[];
        sourceErrors: TypeCheckError[];
    }>;
    protected parseTscLikeOutput(output: string): Promise<Map<string, {
        error: TypeCheckError;
        originalError: TscErrorInfo;
    }[]>>;
    clear(): Promise<void>;
    stop(): Promise<void>;
    protected ensurePackageInstalled(root: string, checker: string): Promise<void>;
    prepare(): Promise<void>;
    start(): Promise<void>;
    getResult(): ErrorsCache;
    getTestFiles(): File[];
    getTestPacks(): TaskResultPack[];
}

declare class VitestServer extends ViteNodeServer {
    private _vitestPath?;
    private getVitestPath;
    protected processTransformResult(id: string, result: TransformResult$1): Promise<TransformResult$1>;
}

interface InitializeServerOptions {
    server?: VitestServer;
    runner?: ViteNodeRunner;
}
declare class WorkspaceProject {
    path: string | number;
    ctx: Vitest;
    configOverride: Partial<ResolvedConfig> | undefined;
    config: ResolvedConfig;
    server: ViteDevServer;
    vitenode: VitestServer;
    runner: ViteNodeRunner;
    browser: ViteDevServer;
    typechecker?: Typechecker;
    closingPromise: Promise<unknown> | undefined;
    browserProvider: BrowserProvider | undefined;
    constructor(path: string | number, ctx: Vitest);
    getName(): string;
    isCore(): boolean;
    get reporters(): Reporter[];
    globTestFiles(filters?: string[]): Promise<string[]>;
    globAllTestFiles(config: ResolvedConfig, cwd: string): Promise<string[]>;
    globFiles(include: string[], exclude: string[], cwd: string): Promise<string[]>;
    filterFiles(testFiles: string[], filters?: string[]): string[];
    initBrowserServer(options: UserConfig): Promise<void>;
    setServer(options: UserConfig, server: ViteDevServer, params?: InitializeServerOptions): Promise<void>;
    report<T extends keyof Reporter>(name: T, ...args: ArgumentsType$1<Reporter[T]>): Promise<void>;
    typecheck(filters?: string[]): Promise<void>;
    isBrowserEnabled(): boolean | 0;
    getSerializableConfig(): ResolvedConfig;
    close(): Promise<unknown>;
    initBrowserProvider(): Promise<void>;
}

interface BrowserProviderOptions {
    browser: string;
}
interface BrowserProvider {
    name: string;
    getSupportedBrowsers(): readonly string[];
    initialize(ctx: WorkspaceProject, options: BrowserProviderOptions): Awaitable$1<void>;
    openPage(url: string): Awaitable$1<void>;
    close(): Awaitable$1<void>;
}
interface BrowserConfigOptions {
    /**
     * if running tests in the broweser should be the default
     *
     * @default false
     */
    enabled?: boolean;
    /**
     * Name of the browser
     */
    name: string;
    /**
     * browser provider
     *
     * @default 'webdriverio'
     */
    provider?: 'webdriverio' | 'playwright' | (string & {});
    /**
     * enable headless mode
     *
     * @default process.env.CI
     */
    headless?: boolean;
    /**
     * Serve API options.
     *
     * The default port is 63315.
     */
    api?: ApiConfig | number;
}
interface ResolvedBrowserOptions extends BrowserConfigOptions {
    enabled: boolean;
    headless: boolean;
    api: ApiConfig;
}

type WorkspaceSpec = [project: WorkspaceProject, testFile: string];
type RunWithFiles = (files: WorkspaceSpec[], invalidates?: string[]) => Promise<void>;
interface ProcessPool {
    runTests: RunWithFiles;
    close: () => Promise<void>;
}

interface CollectingPromise {
    promise: Promise<void>;
    resolve: () => void;
}
declare class StateManager {
    filesMap: Map<string, File[]>;
    pathsSet: Set<string>;
    collectingPromise: CollectingPromise | undefined;
    browserTestPromises: Map<string, {
        resolve: (v: unknown) => void;
        reject: (v: unknown) => void;
    }>;
    idMap: Map<string, Task>;
    taskFileMap: WeakMap<Task, File>;
    errorsSet: Set<unknown>;
    processTimeoutCauses: Set<string>;
    catchError(err: unknown, type: string): void;
    clearErrors(): void;
    getUnhandledErrors(): unknown[];
    addProcessTimeoutCause(cause: string): void;
    getProcessTimeoutCauses(): string[];
    getPaths(): string[];
    getFiles(keys?: string[]): File[];
    getFilepaths(): string[];
    getFailedFilepaths(): string[];
    collectPaths(paths?: string[]): void;
    collectFiles(files?: File[]): void;
    clearFiles(project: WorkspaceProject, paths?: string[]): void;
    updateId(task: Task): void;
    updateTasks(packs: TaskResultPack[]): void;
    updateUserLog(log: UserConsoleLog): void;
}

declare class Logger {
    ctx: Vitest;
    console: Console;
    outputStream: NodeJS.WriteStream & {
        fd: 1;
    };
    errorStream: NodeJS.WriteStream & {
        fd: 2;
    };
    logUpdate: ((...text: string[]) => void) & {
        clear(): void;
        done(): void;
    };
    private _clearScreenPending;
    constructor(ctx: Vitest, console?: Console);
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    clearFullScreen(message: string): void;
    clearScreen(message: string, force?: boolean): void;
    private _clearScreen;
    printError(err: unknown, fullStack?: boolean, type?: string): Promise<void>;
    printNoTestFound(filters?: string[]): void;
    printBanner(): void;
    printUnhandledErrors(errors: unknown[]): Promise<void>;
    printSourceTypeErrors(errors: TypeCheckError[]): Promise<void>;
}

interface SuiteResultCache {
    failed: boolean;
    duration: number;
}
declare class ResultsCache {
    private cache;
    private workspacesKeyMap;
    private cachePath;
    private version;
    private root;
    getCachePath(): string | null;
    setConfig(root: string, config: ResolvedConfig['cache']): void;
    getResults(key: string): SuiteResultCache | undefined;
    readFromCache(): Promise<void>;
    updateResults(files: File[]): void;
    removeFromCache(filepath: string): void;
    writeToCache(): Promise<void>;
}

interface CliOptions extends UserConfig {
    /**
     * Override the watch mode
     */
    run?: boolean;
}
/**
 * Start Vitest programmatically
 *
 * Returns a Vitest instance if initialized successfully.
 */
declare function startVitest(mode: VitestRunMode, cliFilters: string[], options: CliOptions, viteOverrides?: UserConfig$1): Promise<Vitest | undefined>;

type FileStatsCache = Pick<Stats, 'size'>;
declare class FilesStatsCache {
    cache: Map<string, FileStatsCache>;
    getStats(key: string): FileStatsCache | undefined;
    populateStats(root: string, specs: WorkspaceSpec[]): Promise<void>;
    updateStats(fsPath: string, key: string): Promise<void>;
    removeStats(fsPath: string): void;
}

declare class VitestCache {
    results: ResultsCache;
    stats: FilesStatsCache;
    getFileTestResults(key: string): SuiteResultCache | undefined;
    getFileStats(key: string): {
        size: number;
    } | undefined;
    static resolveCacheDir(root: string, dir: string | undefined): string;
    static clearCache(options: CliOptions): Promise<{
        dir: string;
        cleared: boolean;
    }>;
}

declare class Vitest {
    readonly mode: VitestRunMode;
    config: ResolvedConfig;
    configOverride: Partial<ResolvedConfig>;
    server: ViteDevServer;
    state: StateManager;
    snapshot: SnapshotManager;
    cache: VitestCache;
    reporters: Reporter[];
    coverageProvider: CoverageProvider | null | undefined;
    browserProvider: BrowserProvider | undefined;
    logger: Logger;
    pool: ProcessPool | undefined;
    vitenode: VitestServer;
    invalidates: Set<string>;
    changedTests: Set<string>;
    filenamePattern?: string;
    runningPromise?: Promise<void>;
    closingPromise?: Promise<void>;
    isFirstRun: boolean;
    restartsCount: number;
    runner: ViteNodeRunner;
    private coreWorkspace;
    projects: WorkspaceProject[];
    private projectsTestFiles;
    constructor(mode: VitestRunMode);
    private _onRestartListeners;
    private _onSetServer;
    setServer(options: UserConfig, server: ViteDevServer, cliOptions: UserConfig): Promise<void>;
    private createCoreWorkspace;
    getCoreWorkspaceProject(): WorkspaceProject;
    private resolveWorkspace;
    private initCoverageProvider;
    private initBrowserProviders;
    typecheck(filters?: string[]): Promise<void[]>;
    start(filters?: string[]): Promise<void>;
    private getTestDependencies;
    filterTestsBySource(specs: WorkspaceSpec[]): Promise<WorkspaceSpec[]>;
    getProjectsByTestFile(file: string): WorkspaceSpec[];
    runFiles(paths: WorkspaceSpec[]): Promise<void>;
    rerunFiles(files?: string[], trigger?: string): Promise<void>;
    changeNamePattern(pattern: string, files?: string[], trigger?: string): Promise<void>;
    changeFilenamePattern(pattern: string): Promise<void>;
    rerunFailed(): Promise<void>;
    updateSnapshot(files?: string[]): Promise<void>;
    private _rerunTimer;
    private scheduleRerun;
    getModuleProjects(id: string): WorkspaceProject[];
    private unregisterWatcher;
    private registerWatcher;
    /**
     * @returns A value indicating whether rerun is needed (changedTests was mutated)
     */
    private handleFileChanged;
    private reportCoverage;
    close(): Promise<void>;
    /**
     * Close the thread pool and exit the process
     */
    exit(force?: boolean): Promise<void>;
    report<T extends keyof Reporter>(name: T, ...args: ArgumentsType$1<Reporter[T]>): Promise<void>;
    globTestFiles(filters?: string[]): Promise<WorkspaceSpec[]>;
    private isTargetFile;
    shouldKeepServer(): boolean;
    isInSourceTestFile(code: string): boolean;
    onServerRestart(fn: OnServerRestartHandler): void;
    onAfterSetServer(fn: OnServerRestartHandler): void;
}

type MockFactoryWithHelper = (importOriginal: <T = unknown>() => Promise<T>) => any;
type MockFactory = () => any;
type MockMap = Map<string, Record<string, string | null | MockFactory>>;

interface TestSequencer {
    /**
     * Slicing tests into shards. Will be run before `sort`.
     * Only run, if `shard` is defined.
     */
    shard(files: WorkspaceSpec[]): Awaitable<WorkspaceSpec[]>;
    sort(files: WorkspaceSpec[]): Awaitable<WorkspaceSpec[]>;
}
interface TestSequencerConstructor {
    new (ctx: Vitest): TestSequencer;
}

declare abstract class BaseReporter implements Reporter {
    start: number;
    end: number;
    watchFilters?: string[];
    isTTY: boolean;
    ctx: Vitest;
    private _filesInWatchMode;
    private _lastRunTimeout;
    private _lastRunTimer;
    private _lastRunCount;
    private _timeStart;
    constructor();
    get mode(): VitestRunMode;
    onInit(ctx: Vitest): void;
    relative(path: string): string;
    onFinished(files?: File[], errors?: unknown[]): Promise<void>;
    onTaskUpdate(packs: TaskResultPack[]): void;
    onWatcherStart(files?: File[], errors?: unknown[]): Promise<void>;
    private resetLastRunLog;
    onWatcherRerun(files: string[], trigger?: string): Promise<void>;
    onUserConsoleLog(log: UserConsoleLog): void;
    shouldLog(log: UserConsoleLog): boolean;
    onServerRestart(reason?: string): void;
    reportSummary(files: File[]): Promise<void>;
    reportTestSummary(files: File[]): Promise<void>;
    private printErrorsSummary;
    reportBenchmarkSummary(files: File[]): Promise<void>;
    private printTaskErrors;
    registerUnhandledRejection(): void;
}

declare class BasicReporter extends BaseReporter {
    isTTY: boolean;
    reportSummary(files: File[]): Promise<void>;
}

type Awaitable<T> = T | PromiseLike<T>;
type Nullable<T> = T | null | undefined;
type Arrayable<T> = T | Array<T>;
type ArgumentsType$1<T> = T extends (...args: infer U) => any ? U : never;
type MutableArray<T extends readonly any[]> = {
    -readonly [k in keyof T]: T[k];
};
interface Constructable {
    new (...args: any[]): any;
}
interface ModuleCache {
    promise?: Promise<any>;
    exports?: any;
    code?: string;
}
interface EnvironmentReturn {
    teardown: (global: any) => Awaitable<void>;
}
interface Environment {
    name: string;
    setup(global: any, options: Record<string, any>): Awaitable<EnvironmentReturn>;
}
interface UserConsoleLog {
    content: string;
    type: 'stdout' | 'stderr';
    taskId?: string;
    time: number;
    size: number;
}
interface ModuleGraphData {
    graph: Record<string, string[]>;
    externalized: string[];
    inlined: string[];
}
type OnServerRestartHandler = (reason?: string) => Promise<void> | void;

interface ListRendererOptions$1 {
    renderSucceed?: boolean;
    logger: Logger;
    showHeap: boolean;
    mode: VitestRunMode;
}
declare function createListRenderer(_tasks: Task[], options: ListRendererOptions$1): {
    start(): any;
    update(_tasks: Task[]): any;
    stop(): Promise<any>;
    clear(): void;
};

declare class DefaultReporter extends BaseReporter {
    renderer?: ReturnType<typeof createListRenderer>;
    rendererOptions: ListRendererOptions$1;
    onTestRemoved(trigger?: string): Promise<void>;
    onCollected(): void;
    onFinished(files?: _vitest_runner.File[], errors?: unknown[]): Promise<void>;
    onWatcherStart(files?: _vitest_runner.File[], errors?: unknown[]): Promise<void>;
    stopListRender(): Promise<void>;
    onWatcherRerun(files: string[], trigger?: string): Promise<void>;
    onUserConsoleLog(log: UserConsoleLog): void;
}

declare class DotReporter extends BaseReporter {
    renderer?: ReturnType<typeof createListRenderer>;
    onCollected(): void;
    onFinished(files?: _vitest_runner.File[], errors?: unknown[]): Promise<void>;
    onWatcherStart(): Promise<void>;
    stopListRender(): Promise<void>;
    onWatcherRerun(files: string[], trigger?: string): Promise<void>;
    onUserConsoleLog(log: UserConsoleLog): void;
}

interface Callsite {
    line: number;
    column: number;
}
declare class JsonReporter$1 implements Reporter {
    start: number;
    ctx: Vitest;
    onInit(ctx: Vitest): void;
    protected logTasks(files: File[]): Promise<void>;
    onFinished(files?: File[]): Promise<void>;
    /**
     * Writes the report to an output file if specified in the config,
     * or logs it to the console otherwise.
     * @param report
     */
    writeReport(report: string): Promise<void>;
    protected getFailureLocation(test: Task): Promise<Callsite | undefined>;
}

declare class VerboseReporter extends DefaultReporter {
    constructor();
    onTaskUpdate(packs: TaskResultPack[]): void;
}

interface Reporter {
    onInit?(ctx: Vitest): void;
    onPathsCollected?: (paths?: string[]) => Awaitable<void>;
    onCollected?: (files?: File[]) => Awaitable<void>;
    onFinished?: (files?: File[], errors?: unknown[]) => Awaitable<void>;
    onTaskUpdate?: (packs: TaskResultPack[]) => Awaitable<void>;
    onTestRemoved?: (trigger?: string) => Awaitable<void>;
    onWatcherStart?: (files?: File[], errors?: unknown[]) => Awaitable<void>;
    onWatcherRerun?: (files: string[], trigger?: string) => Awaitable<void>;
    onServerRestart?: (reason?: string) => Awaitable<void>;
    onUserConsoleLog?: (log: UserConsoleLog) => Awaitable<void>;
    onProcessTimeout?: () => Awaitable<void>;
}

declare class TapReporter implements Reporter {
    protected ctx: Vitest;
    private logger;
    onInit(ctx: Vitest): void;
    static getComment(task: Task$1): string;
    private logErrorDetails;
    protected logTasks(tasks: Task$1[]): void;
    onFinished(files?: _vitest_runner.File[]): Promise<void>;
}

declare class JUnitReporter implements Reporter {
    private ctx;
    private reportFile?;
    private baseLog;
    private logger;
    private _timeStart;
    onInit(ctx: Vitest): Promise<void>;
    writeElement(name: string, attrs: Record<string, any>, children: () => Promise<void>): Promise<void>;
    writeErrorDetails(error: ErrorWithDiff): Promise<void>;
    writeLogs(task: Task$1, type: 'err' | 'out'): Promise<void>;
    writeTasks(tasks: Task$1[], filename: string): Promise<void>;
    onFinished(files?: _vitest_runner.File[]): Promise<void>;
}

declare class TapFlatReporter extends TapReporter {
    onInit(ctx: Vitest): void;
    onFinished(files?: _vitest_runner.File[]): Promise<void>;
}

declare class HangingProcessReporter implements Reporter {
    whyRunning: (() => void) | undefined;
    onInit(): void;
    onProcessTimeout(): void;
}

declare class JsonReporter implements Reporter {
    start: number;
    ctx: Vitest;
    onInit(ctx: Vitest): void;
    protected logTasks(files: File[]): Promise<void>;
    onFinished(files?: File[]): Promise<void>;
    /**
     * Writes the report to an output file if specified in the config,
     * or logs it to the console otherwise.
     * @param report
     */
    writeReport(report: string): Promise<void>;
}

interface ListRendererOptions {
    renderSucceed?: boolean;
    logger: Logger;
    showHeap: boolean;
}
declare function createTableRenderer(_tasks: Task[], options: ListRendererOptions): {
    start(): any;
    update(_tasks: Task[]): any;
    stop(): Promise<any>;
    clear(): void;
};

declare class TableReporter extends BaseReporter {
    renderer?: ReturnType<typeof createTableRenderer>;
    rendererOptions: ListRendererOptions$1;
    onTestRemoved(trigger?: string): Promise<void>;
    onCollected(): void;
    onFinished(files?: _vitest_runner.File[], errors?: unknown[]): Promise<void>;
    onWatcherStart(): Promise<void>;
    stopListRender(): Promise<void>;
    onWatcherRerun(files: string[], trigger?: string): Promise<void>;
    onUserConsoleLog(log: UserConsoleLog): void;
}

declare const BenchmarkReportsMap: {
    default: typeof TableReporter;
    verbose: typeof VerboseReporter;
    json: typeof JsonReporter;
};
type BenchmarkBuiltinReporters = keyof typeof BenchmarkReportsMap;

declare const ReportersMap: {
    default: typeof DefaultReporter;
    basic: typeof BasicReporter;
    verbose: typeof VerboseReporter;
    dot: typeof DotReporter;
    json: typeof JsonReporter$1;
    tap: typeof TapReporter;
    'tap-flat': typeof TapFlatReporter;
    junit: typeof JUnitReporter;
    'hanging-process': typeof HangingProcessReporter;
};
type BuiltinReporters = keyof typeof ReportersMap;

declare function createExpect(test?: Test$2): Vi.ExpectStatic;
declare const globalExpect: Vi.ExpectStatic;

declare function setupChaiConfig(config: ChaiConfig): void;
type ChaiConfig = Omit<Partial<typeof chai.config>, 'useProxy' | 'proxyExcludedKeys'>;

// utils
type NullValue = null | undefined | void;

type PartialNull<T> = {
	[P in keyof T]: T[P] | null;
};

interface RollupError extends RollupLog {
	name?: string;
	stack?: string;
	watchFiles?: string[];
}

type RollupWarning = RollupLog;

interface RollupLog {
	binding?: string;
	cause?: unknown;
	code?: string;
	exporter?: string;
	frame?: string;
	hook?: string;
	id?: string;
	ids?: string[];
	loc?: {
		column: number;
		file?: string;
		line: number;
	};
	message: string;
	names?: string[];
	plugin?: string;
	pluginCode?: string;
	pos?: number;
	reexporter?: string;
	stack?: string;
	url?: string;
}

interface ExistingRawSourceMap {
	file?: string;
	mappings: string;
	names: string[];
	sourceRoot?: string;
	sources: string[];
	sourcesContent?: (string | null)[];
	version: number;
	x_google_ignoreList?: number[];
}

interface SourceMap {
	file: string;
	mappings: string;
	names: string[];
	sources: string[];
	sourcesContent: (string | null)[];
	version: number;
	toString(): string;
	toUrl(): string;
}

type SourceMapInput = ExistingRawSourceMap | string | null | { mappings: '' };

interface ModuleOptions {
	assertions: Record<string, string>;
	meta: CustomPluginOptions;
	moduleSideEffects: boolean | 'no-treeshake';
	syntheticNamedExports: boolean | string;
}

interface SourceDescription extends Partial<PartialNull<ModuleOptions>> {
	ast?: AcornNode;
	code: string;
	map?: SourceMapInput;
}

interface PluginCache {
	delete(id: string): boolean;
	get<T = any>(id: string): T;
	has(id: string): boolean;
	set<T = any>(id: string, value: T): void;
}

interface MinimalPluginContext {
	meta: PluginContextMeta;
}

interface EmittedAsset {
	fileName?: string;
	name?: string;
	needsCodeReference?: boolean;
	source?: string | Uint8Array;
	type: 'asset';
}

interface EmittedChunk {
	fileName?: string;
	id: string;
	implicitlyLoadedAfterOneOf?: string[];
	importer?: string;
	name?: string;
	preserveSignature?: PreserveEntrySignaturesOption;
	type: 'chunk';
}

type EmittedFile = EmittedAsset | EmittedChunk;

type EmitFile = (emittedFile: EmittedFile) => string;

interface ModuleInfo extends ModuleOptions {
	ast: AcornNode | null;
	code: string | null;
	dynamicImporters: readonly string[];
	dynamicallyImportedIdResolutions: readonly ResolvedId[];
	dynamicallyImportedIds: readonly string[];
	exportedBindings: Record<string, string[]> | null;
	exports: string[] | null;
	hasDefaultExport: boolean | null;
	/** @deprecated Use `moduleSideEffects` instead */
	hasModuleSideEffects: boolean | 'no-treeshake';
	id: string;
	implicitlyLoadedAfterOneOf: readonly string[];
	implicitlyLoadedBefore: readonly string[];
	importedIdResolutions: readonly ResolvedId[];
	importedIds: readonly string[];
	importers: readonly string[];
	isEntry: boolean;
	isExternal: boolean;
	isIncluded: boolean | null;
}

type GetModuleInfo = (moduleId: string) => ModuleInfo | null;

interface CustomPluginOptions {
	[plugin: string]: any;
}

interface PluginContext extends MinimalPluginContext {
	addWatchFile: (id: string) => void;
	cache: PluginCache;
	emitFile: EmitFile;
	error: (error: RollupError | string, pos?: number | { column: number; line: number }) => never;
	getFileName: (fileReferenceId: string) => string;
	getModuleIds: () => IterableIterator<string>;
	getModuleInfo: GetModuleInfo;
	getWatchFiles: () => string[];
	load: (
		options: { id: string; resolveDependencies?: boolean } & Partial<PartialNull<ModuleOptions>>
	) => Promise<ModuleInfo>;
	/** @deprecated Use `this.getModuleIds` instead */
	moduleIds: IterableIterator<string>;
	parse: (input: string, options?: any) => AcornNode;
	resolve: (
		source: string,
		importer?: string,
		options?: {
			assertions?: Record<string, string>;
			custom?: CustomPluginOptions;
			isEntry?: boolean;
			skipSelf?: boolean;
		}
	) => Promise<ResolvedId | null>;
	setAssetSource: (assetReferenceId: string, source: string | Uint8Array) => void;
	warn: (warning: RollupWarning | string, pos?: number | { column: number; line: number }) => void;
}

interface PluginContextMeta {
	rollupVersion: string;
	watchMode: boolean;
}

interface ResolvedId extends ModuleOptions {
	external: boolean | 'absolute';
	id: string;
	resolvedBy: string;
}

interface TransformPluginContext extends PluginContext {
	getCombinedSourcemap: () => SourceMap;
}

type TransformResult = string | NullValue | Partial<SourceDescription>;
type PreserveEntrySignaturesOption = false | 'strict' | 'allow-extension' | 'exports-only';

interface AcornNode {
	end: number;
	start: number;
	type: string;
}

// Type definitions for istanbul-lib-report 3.0


interface Node {
    isRoot(): boolean;
    visit(visitor: Visitor, state: any): void;
}

interface Visitor<N extends Node = Node> {
    onStart(root: N, state: any): void;
    onSummary(root: N, state: any): void;
    onDetail(root: N, state: any): void;
    onSummaryEnd(root: N, state: any): void;
    onEnd(root: N, state: any): void;
}

// Type definitions for istanbul-reports 3.0


interface FileOptions {
    file: string;
}

interface ProjectOptions {
    projectRoot: string;
}

interface ReportOptions {
    clover: CloverOptions;
    cobertura: CoberturaOptions;
    'html-spa': HtmlSpaOptions;
    html: HtmlOptions;
    json: JsonOptions;
    'json-summary': JsonSummaryOptions;
    lcov: LcovOptions;
    lcovonly: LcovOnlyOptions;
    none: never;
    teamcity: TeamcityOptions;
    text: TextOptions;
    'text-lcov': TextLcovOptions;
    'text-summary': TextSummaryOptions;
}

interface CloverOptions extends FileOptions, ProjectOptions {}

interface CoberturaOptions extends FileOptions, ProjectOptions {}

interface HtmlSpaOptions extends HtmlOptions {
    metricsToShow: Array<'lines' | 'branches' | 'functions' | 'statements'>;
}
interface HtmlOptions {
    verbose: boolean;
    skipEmpty: boolean;
    subdir: string;
    linkMapper: LinkMapper;
}

type JsonOptions = FileOptions;
type JsonSummaryOptions = FileOptions;

interface LcovOptions extends FileOptions, ProjectOptions {}
interface LcovOnlyOptions extends FileOptions, ProjectOptions {}

interface TeamcityOptions extends FileOptions {
    blockName: string;
}

interface TextOptions extends FileOptions {
    maxCols: number;
    skipEmpty: boolean;
    skipFull: boolean;
}
type TextLcovOptions = ProjectOptions;
type TextSummaryOptions = FileOptions;

interface LinkMapper {
    getPath(node: string | Node): string;
    relativePath(source: string | Node, target: string | Node): string;
    assetPath(node: Node, name: string): string;
}

declare type ArgumentsType<T> = T extends (...args: infer A) => any ? A : never;
declare type ReturnType$1<T> = T extends (...args: any) => infer R ? R : never;
declare type PromisifyFn<T> = ReturnType$1<T> extends Promise<any> ? T : (...args: ArgumentsType<T>) => Promise<Awaited<ReturnType$1<T>>>;
declare type BirpcFn<T> = PromisifyFn<T> & {
    /**
     * Send event without asking for response
     */
    asEvent(...args: ArgumentsType<T>): void;
};
declare type BirpcReturn<RemoteFunctions> = {
    [K in keyof RemoteFunctions]: BirpcFn<RemoteFunctions[K]>;
};

interface RuntimeRPC {
    fetch: (id: string, environment: VitestEnvironment) => Promise<FetchResult>;
    resolveId: (id: string, importer: string | undefined, environment: VitestEnvironment) => Promise<ViteNodeResolveId | null>;
    getSourceMap: (id: string, force?: boolean) => Promise<RawSourceMap$1 | undefined>;
    onFinished: (files: File[], errors?: unknown[]) => void;
    onWorkerExit: (error: unknown, code?: number) => void;
    onPathsCollected: (paths: string[]) => void;
    onUserConsoleLog: (log: UserConsoleLog) => void;
    onUnhandledError: (err: unknown, type: string) => void;
    onCollected: (files: File[]) => void;
    onAfterSuiteRun: (meta: AfterSuiteRunMeta) => void;
    onTaskUpdate: (pack: TaskResultPack[]) => void;
    snapshotSaved: (snapshot: SnapshotResult) => void;
    resolveSnapshotPath: (testPath: string) => string;
}
interface ContextTestEnvironment {
    name: VitestEnvironment;
    options: EnvironmentOptions | null;
}
interface ContextRPC {
    config: ResolvedConfig;
    files: string[];
    invalidates?: string[];
    environment: ContextTestEnvironment;
}

interface WorkerContext extends ContextRPC {
    workerId: number;
    port: MessagePort;
}
type ResolveIdFunction = (id: string, importer?: string) => Promise<ViteNodeResolveId | null>;
interface AfterSuiteRunMeta {
    coverage?: unknown;
}
interface WorkerGlobalState {
    ctx: WorkerContext;
    config: ResolvedConfig;
    rpc: BirpcReturn<RuntimeRPC>;
    current?: Test$2;
    filepath?: string;
    environmentTeardownRun?: boolean;
    moduleCache: ModuleCacheMap;
    mockMap: MockMap;
    durations: {
        environment: number;
        prepare: number;
    };
}

interface CoverageProvider {
    name: string;
    initialize(ctx: Vitest): Promise<void> | void;
    resolveOptions(): ResolvedCoverageOptions;
    clean(clean?: boolean): void | Promise<void>;
    onAfterSuiteRun(meta: AfterSuiteRunMeta): void | Promise<void>;
    reportCoverage(reportContext?: ReportContext): void | Promise<void>;
    onFileTransform?(sourceCode: string, id: string, pluginCtx: TransformPluginContext): TransformResult | Promise<TransformResult>;
}
interface ReportContext {
    /** Indicates whether all tests were run. False when only specific tests were run. */
    allTestsRun?: boolean;
}
interface CoverageProviderModule {
    /**
     * Factory for creating a new coverage provider
     */
    getProvider(): CoverageProvider | Promise<CoverageProvider>;
    /**
     * Executed before tests are run in the worker thread.
     */
    startCoverage?(): unknown | Promise<unknown>;
    /**
     * Executed on after each run in the worker thread. Possible to return a payload passed to the provider
     */
    takeCoverage?(): unknown | Promise<unknown>;
    /**
     * Executed after all tests have been run in the worker thread.
     */
    stopCoverage?(): unknown | Promise<unknown>;
}
type CoverageReporter = keyof ReportOptions;
type CoverageReporterWithOptions<ReporterName extends CoverageReporter = CoverageReporter> = ReporterName extends CoverageReporter ? ReportOptions[ReporterName] extends never ? [ReporterName, {}] : [ReporterName, Partial<ReportOptions[ReporterName]>] : never;
type Provider = 'c8' | 'istanbul' | 'custom' | undefined;
type CoverageOptions<T extends Provider = Provider> = T extends 'istanbul' ? ({
    provider: T;
} & CoverageIstanbulOptions) : T extends 'c8' ? ({
    provider: T;
} & CoverageC8Options) : T extends 'custom' ? ({
    provider: T;
} & CustomProviderOptions) : ({
    provider?: T;
} & (CoverageC8Options));
/** Fields that have default values. Internally these will always be defined. */
type FieldsWithDefaultValues = 'enabled' | 'clean' | 'cleanOnRerun' | 'reportsDirectory' | 'exclude' | 'extension';
type ResolvedCoverageOptions<T extends Provider = Provider> = CoverageOptions<T> & Required<Pick<CoverageOptions<T>, FieldsWithDefaultValues>> & {
    reporter: CoverageReporterWithOptions[];
};
interface BaseCoverageOptions {
    /**
     * Enables coverage collection. Can be overridden using `--coverage` CLI option.
     *
     * @default false
     */
    enabled?: boolean;
    /**
     * List of files included in coverage as glob patterns
     *
     * @default ['**']
     */
    include?: string[];
    /**
      * Extensions for files to be included in coverage
      *
      * @default ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte']
      */
    extension?: string | string[];
    /**
      * List of files excluded from coverage as glob patterns
      */
    exclude?: string[];
    /**
     * Whether to include all files, including the untested ones into report
     *
     * @default false
     */
    all?: boolean;
    /**
     * Clean coverage results before running tests
     *
     * @default true
     */
    clean?: boolean;
    /**
     * Clean coverage report on watch rerun
     *
     * @default true
     */
    cleanOnRerun?: boolean;
    /**
     * Directory to write coverage report to
     */
    reportsDirectory?: string;
    /**
     * Coverage reporters to use.
     * See [istanbul documentation](https://istanbul.js.org/docs/advanced/alternative-reporters/) for detailed list of all reporters.
     *
     * @default ['text', 'html', 'clover', 'json']
     */
    reporter?: Arrayable<CoverageReporter> | (CoverageReporter | [CoverageReporter] | CoverageReporterWithOptions)[];
    /**
     * Do not show files with 100% statement, branch, and function coverage
     *
     * @default false
     */
    skipFull?: boolean;
    /**
     * Check thresholds per file.
     * See `lines`, `functions`, `branches` and `statements` for the actual thresholds.
     *
     * @default false
     */
    perFile?: boolean;
    /**
     * Threshold for lines
     *
     * @default undefined
     */
    lines?: number;
    /**
     * Threshold for functions
     *
     * @default undefined
     */
    functions?: number;
    /**
     * Threshold for branches
     *
     * @default undefined
     */
    branches?: number;
    /**
     * Threshold for statements
     *
     * @default undefined
     */
    statements?: number;
    /**
     * Update threshold values automatically when current coverage is higher than earlier thresholds
     *
     * @default false
     */
    thresholdAutoUpdate?: boolean;
}
interface CoverageIstanbulOptions extends BaseCoverageOptions {
    /**
     * Set to array of class method names to ignore for coverage
     *
     * @default []
     */
    ignoreClassMethods?: string[];
    /**
     * Watermarks for statements, lines, branches and functions.
     *
     * Default value is `[50,80]` for each property.
     */
    watermarks?: {
        statements?: [number, number];
        functions?: [number, number];
        branches?: [number, number];
        lines?: [number, number];
    };
}
interface CoverageC8Options extends BaseCoverageOptions {
    /**
     * Allow files from outside of your cwd.
     *
     * @default false
     */
    allowExternal?: boolean;
    /**
     * Exclude coverage under `/node_modules/`
     *
     * @default true
     */
    excludeNodeModules?: boolean;
    /**
     * Specifies the directories that are used when `--all` is enabled.
     *
     * @default cwd
    */
    src?: string[];
    /**
     * Shortcut for `--check-coverage --lines 100 --functions 100 --branches 100 --statements 100`
     *
     * @default false
     */
    100?: boolean;
}
interface CustomProviderOptions extends Pick<BaseCoverageOptions, FieldsWithDefaultValues> {
    /** Name of the module or path to a file to load the custom provider from */
    customProviderModule: string;
}

interface JSDOMOptions {
    /**
     * The html content for the test.
     *
     * @default '<!DOCTYPE html>'
     */
    html?: string | Buffer | ArrayBufferLike;
    /**
     * referrer just affects the value read from document.referrer.
     * It defaults to no referrer (which reflects as the empty string).
     */
    referrer?: string;
    /**
     * userAgent affects the value read from navigator.userAgent, as well as the User-Agent header sent while fetching subresources.
     *
     * @default `Mozilla/5.0 (${process.platform}) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/${jsdomVersion}`
     */
    userAgent?: string;
    /**
     * url sets the value returned by window.location, document.URL, and document.documentURI,
     * and affects things like resolution of relative URLs within the document
     * and the same-origin restrictions and referrer used while fetching subresources.
     *
     * @default 'http://localhost:3000'.
     */
    url?: string;
    /**
     * contentType affects the value read from document.contentType, and how the document is parsed: as HTML or as XML.
     * Values that are not "text/html" or an XML mime type will throw.
     *
     * @default 'text/html'.
     */
    contentType?: string;
    /**
     * The maximum size in code units for the separate storage areas used by localStorage and sessionStorage.
     * Attempts to store data larger than this limit will cause a DOMException to be thrown. By default, it is set
     * to 5,000,000 code units per origin, as inspired by the HTML specification.
     *
     * @default 5_000_000
     */
    storageQuota?: number;
    /**
     * Enable console?
     *
     * @default false
     */
    console?: boolean;
    /**
     * jsdom does not have the capability to render visual content, and will act like a headless browser by default.
     * It provides hints to web pages through APIs such as document.hidden that their content is not visible.
     *
     * When the `pretendToBeVisual` option is set to `true`, jsdom will pretend that it is rendering and displaying
     * content.
     *
     * @default true
     */
    pretendToBeVisual?: boolean;
    /**
     * `includeNodeLocations` preserves the location info produced by the HTML parser,
     * allowing you to retrieve it with the nodeLocation() method (described below).
     *
     * It defaults to false to give the best performance,
     * and cannot be used with an XML content type since our XML parser does not support location info.
     *
     * @default false
     */
    includeNodeLocations?: boolean | undefined;
    /**
     * @default 'dangerously'
     */
    runScripts?: 'dangerously' | 'outside-only';
    /**
     * Enable CookieJar
     *
     * @default false
     */
    cookieJar?: boolean;
    resources?: 'usable' | any;
}

interface BenchmarkUserOptions {
    /**
     * Include globs for benchmark test files
     *
     * @default ['**\/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
     */
    include?: string[];
    /**
     * Exclude globs for benchmark test files
     * @default ['node_modules', 'dist', '.idea', '.git', '.cache']
     */
    exclude?: string[];
    /**
     * Include globs for in-source benchmark test files
     *
     * @default []
     */
    includeSource?: string[];
    /**
     * Custom reporter for output. Can contain one or more built-in report names, reporter instances,
     * and/or paths to custom reporters
     */
    reporters?: Arrayable$1<BenchmarkBuiltinReporters | Reporter>;
    /**
     * Write test results to a file when the `--reporter=json` option is also specified.
     * Also definable individually per reporter by using an object instead.
     */
    outputFile?: string | (Partial<Record<BenchmarkBuiltinReporters, string>> & Record<string, string>);
}
interface Benchmark extends TaskCustom {
    meta: {
        benchmark: true;
        task?: Task$2;
        result?: TaskResult;
    };
}
interface BenchmarkResult extends TaskResult {
    name: string;
    rank: number;
}
type BenchFunction = (this: Bench) => Promise<void> | void;
type BenchmarkAPI = ChainableFunction<'skip' | 'only' | 'todo', [
    name: string,
    fn?: BenchFunction,
    options?: Options
], void> & {
    skipIf(condition: any): BenchmarkAPI;
    runIf(condition: any): BenchmarkAPI;
};

type BuiltinEnvironment = 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime';
type VitestEnvironment = BuiltinEnvironment | (string & Record<never, never>);
type VitestPool = 'browser' | 'threads' | 'child_process';
type CSSModuleScopeStrategy = 'stable' | 'scoped' | 'non-scoped';
type ApiConfig = Pick<CommonServerOptions, 'port' | 'strictPort' | 'host'>;

interface EnvironmentOptions {
    /**
     * jsdom options.
     */
    jsdom?: JSDOMOptions;
    [x: string]: unknown;
}
type VitestRunMode = 'test' | 'benchmark' | 'typecheck';
interface SequenceOptions {
    /**
     * Class that handles sorting and sharding algorithm.
     * If you only need to change sorting, you can extend
     * your custom sequencer from `BaseSequencer` from `vitest/node`.
     * @default BaseSequencer
     */
    sequencer?: TestSequencerConstructor;
    /**
     * Should tests run in random order.
     * @default false
     */
    shuffle?: boolean;
    /**
     * Defines how setup files should be ordered
     * - 'parallel' will run all setup files in parallel
     * - 'list' will run all setup files in the order they are defined in the config file
     * @default 'parallel'
     */
    setupFiles?: SequenceSetupFiles;
    /**
     * Seed for the random number generator.
     * @default Date.now()
     */
    seed?: number;
    /**
     * Defines how hooks should be ordered
     * - `stack` will order "after" hooks in reverse order, "before" hooks will run sequentially
     * - `list` will order hooks in the order they are defined
     * - `parallel` will run hooks in a single group in parallel
     * @default 'parallel'
     */
    hooks?: SequenceHooks;
}
interface DepsOptions {
    /**
     * Enable dependency optimization. This can improve the performance of your tests.
     */
    experimentalOptimizer?: Omit<DepOptimizationConfig, 'disabled'> & {
        enabled: boolean;
    };
    /**
     * Externalize means that Vite will bypass the package to native Node.
     *
     * Externalized dependencies will not be applied Vite's transformers and resolvers.
     * And does not support HMR on reload.
     *
     * Typically, packages under `node_modules` are externalized.
     */
    external?: (string | RegExp)[];
    /**
     * Vite will process inlined modules.
     *
     * This could be helpful to handle packages that ship `.js` in ESM format (that Node can't handle).
     *
     * If `true`, every dependency will be inlined
     */
    inline?: (string | RegExp)[] | true;
    /**
     * Interpret CJS module's default as named exports
     *
     * @default true
     */
    interopDefault?: boolean;
    /**
     * When a dependency is a valid ESM package, try to guess the cjs version based on the path.
     * This will significantly improve the performance in huge repo, but might potentially
     * cause some misalignment if a package have different logic in ESM and CJS mode.
     *
     * @default false
     */
    fallbackCJS?: boolean;
    /**
     * Use experimental Node loader to resolve imports inside node_modules using Vite resolve algorithm.
     * @default false
     */
    registerNodeLoader?: boolean;
}
interface InlineConfig {
    /**
     * Name of the project. Will be used to display in the reporter.
     */
    name?: string;
    /**
     * Benchmark options.
     *
     * @default {}
    */
    benchmark?: BenchmarkUserOptions;
    /**
     * Include globs for test files
     *
     * @default ['**\/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
     */
    include?: string[];
    /**
     * Exclude globs for test files
     * @default ['node_modules', 'dist', '.idea', '.git', '.cache']
     */
    exclude?: string[];
    /**
     * Include globs for in-source test files
     *
     * @default []
     */
    includeSource?: string[];
    /**
     * Handling for dependencies inlining or externalizing
     */
    deps?: DepsOptions;
    /**
     * Base directory to scan for the test files
     *
     * @default `config.root`
     */
    dir?: string;
    /**
    * Register apis globally
    *
    * @default false
    */
    globals?: boolean;
    /**
     * Running environment
     *
     * Supports 'node', 'jsdom', 'happy-dom', 'edge-runtime'
     *
     * If used unsupported string, will try to load the package `vitest-environment-${env}`
     *
     * @default 'node'
     */
    environment?: VitestEnvironment;
    /**
     * Environment options.
     */
    environmentOptions?: EnvironmentOptions;
    /**
     * Automatically assign environment based on globs. The first match will be used.
     *
     * Format: [glob, environment-name]
     *
     * @default []
     * @example [
     *   // all tests in tests/dom will run in jsdom
     *   ['tests/dom/**', 'jsdom'],
     *   // all tests in tests/ with .edge.test.ts will run in edge-runtime
     *   ['**\/*.edge.test.ts', 'edge-runtime'],
     *   // ...
     * ]
     */
    environmentMatchGlobs?: [string, VitestEnvironment][];
    /**
     * Automatically assign pool based on globs. The first match will be used.
     *
     * Format: [glob, pool-name]
     *
     * @default []
     * @example [
     *   // all tests in "browser" directory will run in an actual browser
     *   ['tests/browser/**', 'browser'],
     *   // all other tests will run based on "threads" option, if you didn't specify other globs
     *   // ...
     * ]
     */
    poolMatchGlobs?: [string, VitestPool][];
    /**
     * Update snapshot
     *
     * @default false
     */
    update?: boolean;
    /**
     * Watch mode
     *
     * @default true
     */
    watch?: boolean;
    /**
     * Project root
     *
     * @default process.cwd()
     */
    root?: string;
    /**
     * Custom reporter for output. Can contain one or more built-in report names, reporter instances,
     * and/or paths to custom reporters.
     */
    reporters?: Arrayable<BuiltinReporters | 'html' | Reporter | Omit<string, BuiltinReporters>>;
    /**
     * Write test results to a file when the --reporter=json` or `--reporter=junit` option is also specified.
     * Also definable individually per reporter by using an object instead.
     */
    outputFile?: string | (Partial<Record<BuiltinReporters, string>> & Record<string, string>);
    /**
     * Enable multi-threading
     *
     * @default true
     */
    threads?: boolean;
    /**
     * Maximum number of threads
     *
     * @default available CPUs
     */
    maxThreads?: number;
    /**
     * Minimum number of threads
     *
     * @default available CPUs
     */
    minThreads?: number;
    /**
     * Use Atomics to synchronize threads
     *
     * This can improve performance in some cases, but might cause segfault in older Node versions.
     *
     * @default false
     */
    useAtomics?: boolean;
    /**
     * Default timeout of a test in milliseconds
     *
     * @default 5000
     */
    testTimeout?: number;
    /**
     * Default timeout of a hook in milliseconds
     *
     * @default 10000
     */
    hookTimeout?: number;
    /**
     * Default timeout to wait for close when Vitest shuts down, in milliseconds
     *
     * @default 1000
     */
    teardownTimeout?: number;
    /**
     * Silent mode
     *
     * @default false
     */
    silent?: boolean;
    /**
     * Path to setup files
     */
    setupFiles?: string | string[];
    /**
     * Path to global setup files
     */
    globalSetup?: string | string[];
    /**
     * Glob pattern of file paths to be ignore from triggering watch rerun
     */
    watchExclude?: string[];
    /**
     * Glob patter of file paths that will trigger the whole suite rerun
     *
     * Useful if you are testing calling CLI commands
     *
     * @default []
     */
    forceRerunTriggers?: string[];
    /**
     * Isolate environment for each test file
     *
     * @default true
     */
    isolate?: boolean;
    /**
     * Run tests inside a single thread.
     *
     * @default false
     */
    singleThread?: boolean;
    /**
     * Coverage options
     */
    coverage?: CoverageOptions;
    /**
     * run test names with the specified pattern
     */
    testNamePattern?: string | RegExp;
    /**
     * Will call `.mockClear()` on all spies before each test
     * @default false
     */
    clearMocks?: boolean;
    /**
     * Will call `.mockReset()` on all spies before each test
     * @default false
     */
    mockReset?: boolean;
    /**
     * Will call `.mockRestore()` on all spies before each test
     * @default false
     */
    restoreMocks?: boolean;
    /**
     * Will restore all global stubs to their original values before each test
     * @default false
     */
    unstubGlobals?: boolean;
    /**
     * Will restore all env stubs to their original values before each test
     * @default false
     */
    unstubEnvs?: boolean;
    /**
     * Serve API options.
     *
     * When set to true, the default port is 51204.
     *
     * @default false
     */
    api?: boolean | number | ApiConfig;
    /**
     * Enable Vitest UI
     * @internal WIP
     */
    ui?: boolean;
    /**
     * options for test in a browser environment
     * @experimental
     *
     * @default false
     */
    browser?: BrowserConfigOptions;
    /**
     * Open UI automatically.
     *
     * @default true
     */
    open?: boolean;
    /**
     * Base url for the UI
     *
     * @default '/__vitest__/'
     */
    uiBase?: string;
    /**
     * Determine the transform method of modules
     */
    transformMode?: {
        /**
         * Use SSR transform pipeline for the specified files.
         * Vite plugins will receive `ssr: true` flag when processing those files.
         *
         * @default [/\.([cm]?[jt]sx?|json)$/]
         */
        ssr?: RegExp[];
        /**
         * First do a normal transform pipeline (targeting browser),
         * then then do a SSR rewrite to run the code in Node.
         * Vite plugins will receive `ssr: false` flag when processing those files.
         *
         * @default other than `ssr`
         */
        web?: RegExp[];
    };
    /**
     * Format options for snapshot testing.
     */
    snapshotFormat?: PrettyFormatOptions;
    /**
     * Resolve custom snapshot path
     */
    resolveSnapshotPath?: (path: string, extension: string) => string;
    /**
     * Pass with no tests
     */
    passWithNoTests?: boolean;
    /**
     * Allow tests and suites that are marked as only
     */
    allowOnly?: boolean;
    /**
     * Show heap usage after each test. Useful for debugging memory leaks.
     */
    logHeapUsage?: boolean;
    /**
     * Custom environment variables assigned to `process.env` before running tests.
     */
    env?: Record<string, string>;
    /**
     * Options for @sinon/fake-timers
     */
    fakeTimers?: FakeTimerInstallOpts;
    /**
     * Custom handler for console.log in tests.
     *
     * Return `false` to ignore the log.
     */
    onConsoleLog?: (log: string, type: 'stdout' | 'stderr') => false | void;
    /**
     * Indicates if CSS files should be processed.
     *
     * When excluded, the CSS files will be replaced with empty strings to bypass the subsequent processing.
     *
     * @default { include: [], modules: { classNameStrategy: false } }
     */
    css?: boolean | {
        include?: RegExp | RegExp[];
        exclude?: RegExp | RegExp[];
        modules?: {
            classNameStrategy?: CSSModuleScopeStrategy;
        };
    };
    /**
     * A number of tests that are allowed to run at the same time marked with `test.concurrent`.
     * @default 5
     */
    maxConcurrency?: number;
    /**
     * Options for configuring cache policy.
     * @default { dir: 'node_modules/.vitest' }
     */
    cache?: false | {
        dir?: string;
    };
    /**
     * Options for configuring the order of running tests.
     */
    sequence?: SequenceOptions;
    /**
     * Specifies an `Object`, or an `Array` of `Object`,
     * which defines aliases used to replace values in `import` or `require` statements.
     * Will be merged with the default aliases inside `resolve.alias`.
     */
    alias?: AliasOptions;
    /**
     * Ignore any unhandled errors that occur
     */
    dangerouslyIgnoreUnhandledErrors?: boolean;
    /**
     * Options for configuring typechecking test environment.
     */
    typecheck?: Partial<TypecheckConfig>;
    /**
     * The number of milliseconds after which a test is considered slow and reported as such in the results.
     *
     * @default 300
    */
    slowTestThreshold?: number;
    /**
     * Path to a custom test runner.
     */
    runner?: string;
    /**
     * Debug tests by opening `node:inspector` in worker / child process.
     * Provides similar experience as `--inspect` Node CLI argument.
     * Requires `singleThread: true` OR `threads: false`.
     */
    inspect?: boolean;
    /**
     * Debug tests by opening `node:inspector` in worker / child process and wait for debugger to connect.
     * Provides similar experience as `--inspect-brk` Node CLI argument.
     * Requires `singleThread: true` OR `threads: false`.
     */
    inspectBrk?: boolean;
    /**
     * Modify default Chai config. Vitest uses Chai for `expect` and `assert` matches.
     * https://github.com/chaijs/chai/blob/4.x.x/lib/chai/config.js
    */
    chaiConfig?: ChaiConfig;
}
interface TypecheckConfig {
    /**
     * What tools to use for type checking.
     */
    checker: 'tsc' | 'vue-tsc' | (string & Record<never, never>);
    /**
     * Pattern for files that should be treated as test files
     */
    include: string[];
    /**
     * Pattern for files that should not be treated as test files
     */
    exclude: string[];
    /**
     * Check JS files that have `@ts-check` comment.
     * If you have it enabled in tsconfig, this will not overwrite it.
     */
    allowJs?: boolean;
    /**
     * Do not fail, if Vitest found errors outside the test files.
     */
    ignoreSourceErrors?: boolean;
    /**
     * Path to tsconfig, relative to the project root.
     */
    tsconfig?: string;
}
interface UserConfig extends InlineConfig {
    /**
     * Path to the config file.
     *
     * Default resolving to `vitest.config.*`, `vite.config.*`
     *
     * Setting to `false` will disable config resolving.
     */
    config?: string | false | undefined;
    /**
     * Use happy-dom
     */
    dom?: boolean;
    /**
     * Run tests that cover a list of source files
     */
    related?: string[] | string;
    /**
     * Overrides Vite mode
     * @default 'test'
     */
    mode?: string;
    /**
     * Runs tests that are affected by the changes in the repository, or between specified branch or commit hash
     * Requires initialized git repository
     * @default false
     */
    changed?: boolean | string;
    /**
     * Test suite shard to execute in a format of <index>/<count>.
     * Will divide tests into a `count` numbers, and run only the `indexed` part.
     * Cannot be used with enabled watch.
     * @example --shard=2/3
     */
    shard?: string;
}
interface ResolvedConfig extends Omit<Required<UserConfig>, 'config' | 'filters' | 'browser' | 'coverage' | 'testNamePattern' | 'related' | 'api' | 'reporters' | 'resolveSnapshotPath' | 'benchmark' | 'shard' | 'cache' | 'sequence' | 'typecheck' | 'runner'> {
    mode: VitestRunMode;
    base?: string;
    config?: string;
    filters?: string[];
    testNamePattern?: RegExp;
    related?: string[];
    coverage: ResolvedCoverageOptions;
    snapshotOptions: SnapshotStateOptions;
    browser: ResolvedBrowserOptions;
    reporters: (Reporter | BuiltinReporters)[];
    defines: Record<string, any>;
    api?: ApiConfig;
    benchmark?: Required<Omit<BenchmarkUserOptions, 'outputFile'>> & {
        outputFile?: BenchmarkUserOptions['outputFile'];
    };
    shard?: {
        index: number;
        count: number;
    };
    cache: {
        dir: string;
    } | false;
    sequence: {
        sequencer: TestSequencerConstructor;
        hooks: SequenceHooks;
        setupFiles: SequenceSetupFiles;
        shuffle?: boolean;
        seed: number;
    };
    typecheck: TypecheckConfig;
    runner?: string;
}
type ProjectConfig = Omit<UserConfig, 'sequencer' | 'shard' | 'watch' | 'run' | 'cache' | 'update' | 'reporters' | 'outputFile' | 'maxThreads' | 'minThreads' | 'useAtomics' | 'teardownTimeout' | 'silent' | 'watchExclude' | 'forceRerunTriggers' | 'testNamePattern' | 'ui' | 'open' | 'uiBase' | 'snapshotFormat' | 'resolveSnapshotPath' | 'passWithNoTests' | 'onConsoleLog' | 'dangerouslyIgnoreUnhandledErrors' | 'slowTestThreshold' | 'inspect' | 'inspectBrk' | 'deps' | 'coverage'> & {
    sequencer?: Omit<SequenceOptions, 'sequencer' | 'seed'>;
    deps?: Omit<DepsOptions, 'registerNodeLoader'>;
};
type RuntimeConfig = Pick<UserConfig, 'allowOnly' | 'testTimeout' | 'hookTimeout' | 'clearMocks' | 'mockReset' | 'restoreMocks' | 'fakeTimers' | 'maxConcurrency'> & {
    sequence?: {
        hooks?: SequenceHooks;
    };
};

type VitestInlineConfig = InlineConfig;
declare module 'vite' {
    interface UserConfig {
        /**
         * Options for Vitest
         */
        test?: VitestInlineConfig;
    }
}

type Promisify<O> = {
    [K in keyof O]: O[K] extends (...args: infer A) => infer R ? O extends R ? Promisify<O[K]> : (...args: A) => Promise<R> : O[K];
};
declare module '@vitest/expect' {
    interface MatcherState {
        environment: VitestEnvironment;
        snapshotState: SnapshotState;
    }
}
declare module '@vitest/runner' {
    interface TestContext {
        expect: Vi.ExpectStatic;
    }
    interface File {
        prepareDuration?: number;
        environmentLoad?: number;
    }
    interface TaskBase {
        logs?: UserConsoleLog[];
    }
    interface TaskResult {
        benchmark?: BenchmarkResult;
    }
}
declare global {
    namespace jest {
        interface Matchers<R, T = {}> {
        }
    }
    namespace Vi {
        interface ExpectStatic extends Chai.ExpectStatic, AsymmetricMatchersContaining {
            <T>(actual: T, message?: string): Vi.Assertion<T>;
            extend(expects: MatchersObject): void;
            assertions(expected: number): void;
            hasAssertions(): void;
            anything(): any;
            any(constructor: unknown): any;
            addSnapshotSerializer(plugin: Plugin): void;
            getState(): MatcherState;
            setState(state: Partial<MatcherState>): void;
            not: AsymmetricMatchersContaining;
        }
        interface AsymmetricMatchersContaining {
            stringContaining(expected: string): any;
            objectContaining<T = any>(expected: T): any;
            arrayContaining<T = unknown>(expected: Array<T>): any;
            stringMatching(expected: string | RegExp): any;
        }
        interface JestAssertion<T = any> extends jest.Matchers<void, T> {
            matchSnapshot<U extends {
                [P in keyof T]: any;
            }>(snapshot: Partial<U>, message?: string): void;
            matchSnapshot(message?: string): void;
            toMatchSnapshot<U extends {
                [P in keyof T]: any;
            }>(snapshot: Partial<U>, message?: string): void;
            toMatchSnapshot(message?: string): void;
            toMatchInlineSnapshot<U extends {
                [P in keyof T]: any;
            }>(properties: Partial<U>, snapshot?: string, message?: string): void;
            toMatchInlineSnapshot(snapshot?: string, message?: string): void;
            toMatchFileSnapshot(filepath: string, message?: string): Promise<void>;
            toThrowErrorMatchingSnapshot(message?: string): void;
            toThrowErrorMatchingInlineSnapshot(snapshot?: string, message?: string): void;
            toEqual<E>(expected: E): void;
            toStrictEqual<E>(expected: E): void;
            toBe<E>(expected: E): void;
            toMatch(expected: string | RegExp): void;
            toMatchObject<E extends {} | any[]>(expected: E): void;
            toContain<E>(item: E): void;
            toContainEqual<E>(item: E): void;
            toBeTruthy(): void;
            toBeFalsy(): void;
            toBeGreaterThan(num: number | bigint): void;
            toBeGreaterThanOrEqual(num: number | bigint): void;
            toBeLessThan(num: number | bigint): void;
            toBeLessThanOrEqual(num: number | bigint): void;
            toBeNaN(): void;
            toBeUndefined(): void;
            toBeNull(): void;
            toBeDefined(): void;
            toBeTypeOf(expected: 'bigint' | 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined'): void;
            toBeInstanceOf<E>(expected: E): void;
            toBeCalledTimes(times: number): void;
            toHaveLength(length: number): void;
            toHaveProperty<E>(property: string | (string | number)[], value?: E): void;
            toBeCloseTo(number: number, numDigits?: number): void;
            toHaveBeenCalledTimes(times: number): void;
            toHaveBeenCalledOnce(): void;
            toHaveBeenCalled(): void;
            toBeCalled(): void;
            toHaveBeenCalledWith<E extends any[]>(...args: E): void;
            toBeCalledWith<E extends any[]>(...args: E): void;
            toHaveBeenNthCalledWith<E extends any[]>(n: number, ...args: E): void;
            nthCalledWith<E extends any[]>(nthCall: number, ...args: E): void;
            toHaveBeenLastCalledWith<E extends any[]>(...args: E): void;
            lastCalledWith<E extends any[]>(...args: E): void;
            toThrow(expected?: string | Constructable | RegExp | Error): void;
            toThrowError(expected?: string | Constructable | RegExp | Error): void;
            toReturn(): void;
            toHaveReturned(): void;
            toReturnTimes(times: number): void;
            toHaveReturnedTimes(times: number): void;
            toReturnWith<E>(value: E): void;
            toHaveReturnedWith<E>(value: E): void;
            toHaveLastReturnedWith<E>(value: E): void;
            lastReturnedWith<E>(value: E): void;
            toHaveNthReturnedWith<E>(nthCall: number, value: E): void;
            nthReturnedWith<E>(nthCall: number, value: E): void;
            toSatisfy<E>(matcher: (value: E) => boolean, message?: string): void;
        }
        type VitestAssertion<A, T> = {
            [K in keyof A]: A[K] extends Chai.Assertion ? Assertion<T> : A[K] extends (...args: any[]) => any ? A[K] : VitestAssertion<A[K], T>;
        } & ((type: string, message?: string) => Assertion);
        interface Assertion<T = any> extends VitestAssertion<Chai.Assertion, T>, JestAssertion<T> {
            resolves: Promisify<Assertion<T>>;
            rejects: Promisify<Assertion<T>>;
        }
    }
}

type RawErrsMap = Map<string, TscErrorInfo[]>;
interface TscErrorInfo {
    filePath: string;
    errCode: number;
    errMsg: string;
    line: number;
    column: number;
}
interface CollectLineNumbers {
    target: number;
    next: number;
    prev?: number;
}
type CollectLines = {
    [key in keyof CollectLineNumbers]: string;
};
interface RootAndTarget {
    root: string;
    targetAbsPath: string;
}
type Context = RootAndTarget & {
    rawErrsMap: RawErrsMap;
    openedDirs: Set<string>;
    lastActivePath?: string;
};

export { ResolvedCoverageOptions as $, AfterSuiteRunMeta as A, BenchmarkAPI as B, ChaiConfig as C, ArgumentsType$1 as D, EnvironmentOptions as E, FakeTimerInstallOpts as F, MutableArray as G, Constructable as H, InlineConfig as I, JSDOMOptions as J, ModuleCache as K, EnvironmentReturn as L, MockFactoryWithHelper as M, Nullable as N, Environment as O, ProjectConfig as P, OnServerRestartHandler as Q, RuntimeConfig as R, CoverageProvider as S, TscErrorInfo as T, UserConsoleLog as U, VitestEnvironment as V, WorkerContext as W, ReportContext as X, CoverageProviderModule as Y, CoverageReporter as Z, CoverageOptions as _, ResolvedConfig as a, BaseCoverageOptions as a0, CoverageIstanbulOptions as a1, CoverageC8Options as a2, CustomProviderOptions as a3, BenchmarkUserOptions as a4, Benchmark as a5, BenchmarkResult as a6, BenchFunction as a7, MockFactory as a8, MockMap as a9, TestSequencer as aa, WorkspaceSpec as ab, WorkspaceProject as ac, startVitest as ad, TestSequencerConstructor as ae, HtmlOptions as af, FileOptions as ag, CloverOptions as ah, CoberturaOptions as ai, HtmlSpaOptions as aj, LcovOptions as ak, LcovOnlyOptions as al, TeamcityOptions as am, TextOptions as an, ProjectOptions as ao, ModuleGraphData as b, Reporter as c, createExpect as d, RawErrsMap as e, CollectLineNumbers as f, globalExpect as g, CollectLines as h, RootAndTarget as i, Context as j, BuiltinEnvironment as k, VitestPool as l, CSSModuleScopeStrategy as m, ApiConfig as n, VitestRunMode as o, TypecheckConfig as p, UserConfig as q, RuntimeRPC as r, setupChaiConfig as s, ContextTestEnvironment as t, ContextRPC as u, Vitest as v, ResolveIdFunction as w, WorkerGlobalState as x, Awaitable as y, Arrayable as z };
