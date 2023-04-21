import { V as VitestRunner } from './runner-3b8473ea.js';
export { a as VitestRunnerConfig, c as VitestRunnerConstructor, b as VitestRunnerImportSource } from './runner-3b8473ea.js';
import { T as Task, F as File, S as SuiteAPI, a as TestAPI, b as SuiteCollector, c as SuiteHooks, O as OnTestFailedHandler, d as Test } from './tasks-c965d7f6.js';
export { D as DoneCallback, m as HookCleanupCallback, H as HookListener, R as RunMode, o as RuntimeContext, q as SequenceHooks, r as SequenceSetupFiles, j as Suite, n as SuiteFactory, f as TaskBase, g as TaskCustom, h as TaskResult, i as TaskResultPack, e as TaskState, p as TestContext, k as TestFunction, l as TestOptions } from './tasks-c965d7f6.js';
import { Awaitable } from '@vitest/utils';

declare function updateTask(task: Task, runner: VitestRunner): void;
declare function startTests(paths: string[], runner: VitestRunner): Promise<File[]>;

declare const suite: SuiteAPI;
declare const test: TestAPI;
declare const describe: SuiteAPI;
declare const it: TestAPI;
declare function getCurrentSuite<ExtraContext = {}>(): SuiteCollector<ExtraContext>;

declare function beforeAll(fn: SuiteHooks['beforeAll'][0], timeout?: number): void;
declare function afterAll(fn: SuiteHooks['afterAll'][0], timeout?: number): void;
declare function beforeEach<ExtraContext = {}>(fn: SuiteHooks<ExtraContext>['beforeEach'][0], timeout?: number): void;
declare function afterEach<ExtraContext = {}>(fn: SuiteHooks<ExtraContext>['afterEach'][0], timeout?: number): void;
declare const onTestFailed: (fn: OnTestFailedHandler) => void;

declare function setFn(key: Test, fn: (() => Awaitable<void>)): void;
declare function getFn<Task = Test>(key: Task): (() => Awaitable<void>);

declare function getCurrentTest(): Test<{}> | undefined;

export { File, OnTestFailedHandler, SuiteAPI, SuiteCollector, SuiteHooks, Task, Test, TestAPI, VitestRunner, afterAll, afterEach, beforeAll, beforeEach, describe, getCurrentSuite, getCurrentTest, getFn, it, onTestFailed, setFn, startTests, suite, test, updateTask };
