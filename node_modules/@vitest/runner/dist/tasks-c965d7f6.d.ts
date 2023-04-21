import { ErrorWithDiff, Awaitable } from '@vitest/utils';

type ChainableFunction<T extends string, Args extends any[], R = any, E = {}> = {
    (...args: Args): R;
} & {
    [x in T]: ChainableFunction<T, Args, R, E>;
} & {
    fn: (this: Record<T, boolean | undefined>, ...args: Args) => R;
} & E;
declare function createChainable<T extends string, Args extends any[], R = any, E = {}>(keys: T[], fn: (this: Record<T, boolean | undefined>, ...args: Args) => R): ChainableFunction<T, Args, R, E>;

type RunMode = 'run' | 'skip' | 'only' | 'todo';
type TaskState = RunMode | 'pass' | 'fail';
interface TaskBase {
    id: string;
    name: string;
    mode: RunMode;
    concurrent?: boolean;
    shuffle?: boolean;
    suite?: Suite;
    file?: File;
    result?: TaskResult;
    retry?: number;
    meta?: any;
}
interface TaskCustom extends TaskBase {
    type: 'custom';
}
interface TaskResult {
    state: TaskState;
    duration?: number;
    startTime?: number;
    heap?: number;
    /**
     * @deprecated Use "errors" instead
     */
    error?: ErrorWithDiff;
    errors?: ErrorWithDiff[];
    htmlError?: string;
    hooks?: Partial<Record<keyof SuiteHooks, TaskState>>;
    retryCount?: number;
}
type TaskResultPack = [id: string, result: TaskResult | undefined];
interface Suite extends TaskBase {
    type: 'suite';
    tasks: Task[];
    filepath?: string;
    projectName?: string;
}
interface File extends Suite {
    filepath: string;
    collectDuration?: number;
    setupDuration?: number;
}
interface Test<ExtraContext = {}> extends TaskBase {
    type: 'test';
    suite: Suite;
    result?: TaskResult;
    fails?: boolean;
    context: TestContext & ExtraContext;
    onFailed?: OnTestFailedHandler[];
    /**
     * Store promises (from async expects) to wait for them before finishing the test
     */
    promises?: Promise<any>[];
}
type Task = Test | Suite | TaskCustom | File;
type DoneCallback = (error?: any) => void;
type TestFunction<ExtraContext = {}> = (context: TestContext & ExtraContext) => Awaitable<any> | void;
type ExtractEachCallbackArgs<T extends ReadonlyArray<any>> = {
    1: [T[0]];
    2: [T[0], T[1]];
    3: [T[0], T[1], T[2]];
    4: [T[0], T[1], T[2], T[3]];
    5: [T[0], T[1], T[2], T[3], T[4]];
    6: [T[0], T[1], T[2], T[3], T[4], T[5]];
    7: [T[0], T[1], T[2], T[3], T[4], T[5], T[6]];
    8: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7]];
    9: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8]];
    10: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], T[9]];
    fallback: Array<T extends ReadonlyArray<infer U> ? U : any>;
}[T extends Readonly<[any]> ? 1 : T extends Readonly<[any, any]> ? 2 : T extends Readonly<[any, any, any]> ? 3 : T extends Readonly<[any, any, any, any]> ? 4 : T extends Readonly<[any, any, any, any, any]> ? 5 : T extends Readonly<[any, any, any, any, any, any]> ? 6 : T extends Readonly<[any, any, any, any, any, any, any]> ? 7 : T extends Readonly<[any, any, any, any, any, any, any, any]> ? 8 : T extends Readonly<[any, any, any, any, any, any, any, any, any]> ? 9 : T extends Readonly<[any, any, any, any, any, any, any, any, any, any]> ? 10 : 'fallback'];
interface SuiteEachFunction {
    <T extends any[] | [any]>(cases: ReadonlyArray<T>): (name: string, fn: (...args: T) => Awaitable<void>) => void;
    <T extends ReadonlyArray<any>>(cases: ReadonlyArray<T>): (name: string, fn: (...args: ExtractEachCallbackArgs<T>) => Awaitable<void>) => void;
    <T>(cases: ReadonlyArray<T>): (name: string, fn: (...args: T[]) => Awaitable<void>) => void;
}
interface TestEachFunction {
    <T extends any[] | [any]>(cases: ReadonlyArray<T>): (name: string, fn: (...args: T) => Awaitable<void>, options?: number | TestOptions) => void;
    <T extends ReadonlyArray<any>>(cases: ReadonlyArray<T>): (name: string, fn: (...args: ExtractEachCallbackArgs<T>) => Awaitable<void>, options?: number | TestOptions) => void;
    <T>(cases: ReadonlyArray<T>): (name: string, fn: (...args: T[]) => Awaitable<void>, options?: number | TestOptions) => void;
    (...args: [TemplateStringsArray, ...any]): (name: string, fn: (...args: any[]) => Awaitable<void>, options?: number | TestOptions) => void;
}
type ChainableTestAPI<ExtraContext = {}> = ChainableFunction<'concurrent' | 'only' | 'skip' | 'todo' | 'fails', [
    name: string,
    fn?: TestFunction<ExtraContext>,
    options?: number | TestOptions
], void, {
    each: TestEachFunction;
    <T extends ExtraContext>(name: string, fn?: TestFunction<T>, options?: number | TestOptions): void;
}>;
interface TestOptions {
    /**
     * Test timeout.
     */
    timeout?: number;
    /**
     * Times to retry the test if fails. Useful for making flaky tests more stable.
     * When retries is up, the last test error will be thrown.
     *
     * @default 1
     */
    retry?: number;
}
type TestAPI<ExtraContext = {}> = ChainableTestAPI<ExtraContext> & {
    each: TestEachFunction;
    skipIf(condition: any): ChainableTestAPI<ExtraContext>;
    runIf(condition: any): ChainableTestAPI<ExtraContext>;
};
type ChainableSuiteAPI<ExtraContext = {}> = ChainableFunction<'concurrent' | 'only' | 'skip' | 'todo' | 'shuffle', [
    name: string,
    factory?: SuiteFactory<ExtraContext>,
    options?: number | TestOptions
], SuiteCollector<ExtraContext>, {
    each: TestEachFunction;
    <T extends ExtraContext>(name: string, factory?: SuiteFactory<T>): SuiteCollector<T>;
}>;
type SuiteAPI<ExtraContext = {}> = ChainableSuiteAPI<ExtraContext> & {
    each: SuiteEachFunction;
    skipIf(condition: any): ChainableSuiteAPI<ExtraContext>;
    runIf(condition: any): ChainableSuiteAPI<ExtraContext>;
};
type HookListener<T extends any[], Return = void> = (...args: T) => Awaitable<Return>;
type HookCleanupCallback = (() => Awaitable<unknown>) | void;
interface SuiteHooks<ExtraContext = {}> {
    beforeAll: HookListener<[Suite | File], HookCleanupCallback>[];
    afterAll: HookListener<[Suite | File]>[];
    beforeEach: HookListener<[TestContext & ExtraContext, Suite], HookCleanupCallback>[];
    afterEach: HookListener<[TestContext & ExtraContext, Suite]>[];
}
interface SuiteCollector<ExtraContext = {}> {
    readonly name: string;
    readonly mode: RunMode;
    type: 'collector';
    test: TestAPI<ExtraContext>;
    tasks: (Suite | TaskCustom | Test | SuiteCollector<ExtraContext>)[];
    custom: (name: string) => TaskCustom;
    collect: (file?: File) => Promise<Suite>;
    clear: () => void;
    on: <T extends keyof SuiteHooks<ExtraContext>>(name: T, ...fn: SuiteHooks<ExtraContext>[T]) => void;
}
type SuiteFactory<ExtraContext = {}> = (test: (name: string, fn: TestFunction<ExtraContext>) => void) => Awaitable<void>;
interface RuntimeContext {
    tasks: (SuiteCollector | Test)[];
    currentSuite: SuiteCollector | null;
}
interface TestContext {
    /**
     * Metadata of the current test
     */
    meta: Readonly<Test>;
    /**
     * Extract hooks on test failed
     */
    onTestFailed: (fn: OnTestFailedHandler) => void;
}
type OnTestFailedHandler = (result: TaskResult) => Awaitable<void>;
type SequenceHooks = 'stack' | 'list' | 'parallel';
type SequenceSetupFiles = 'list' | 'parallel';

export { ChainableFunction as C, DoneCallback as D, File as F, HookListener as H, OnTestFailedHandler as O, RunMode as R, SuiteAPI as S, Task as T, TestAPI as a, SuiteCollector as b, SuiteHooks as c, Test as d, TaskState as e, TaskBase as f, TaskCustom as g, TaskResult as h, TaskResultPack as i, Suite as j, TestFunction as k, TestOptions as l, HookCleanupCallback as m, SuiteFactory as n, RuntimeContext as o, TestContext as p, SequenceHooks as q, SequenceSetupFiles as r, createChainable as s };
