import { j as Suite, T as Task, d as Test, g as TaskCustom } from './tasks-c965d7f6.js';
export { C as ChainableFunction, s as createChainable } from './tasks-c965d7f6.js';
import { Arrayable } from '@vitest/utils';
export { ErrorWithDiff, ParsedStack } from '@vitest/utils';
import { DiffOptions } from '@vitest/utils/diff';

declare function serializeError(val: any, seen?: WeakMap<object, any>): any;
declare function processError(err: any, options?: DiffOptions): any;
declare function replaceAsymmetricMatcher(actual: any, expected: any, actualReplaced?: WeakSet<object>, expectedReplaced?: WeakSet<object>): {
    replacedActual: any;
    replacedExpected: any;
};

/**
 * If any tasks been marked as `only`, mark all other tasks as `skip`.
 */
declare function interpretTaskModes(suite: Suite, namePattern?: string | RegExp, onlyMode?: boolean, parentIsOnly?: boolean, allowOnly?: boolean): void;
declare function someTasksAreOnly(suite: Suite): boolean;
declare function generateHash(str: string): string;
declare function calculateSuiteHash(parent: Suite): void;

/**
 * Partition in tasks groups by consecutive concurrent
 */
declare function partitionSuiteChildren(suite: Suite): Task[][];

declare function getTests(suite: Arrayable<Task>): (Test | TaskCustom)[];
declare function getTasks(tasks?: Arrayable<Task>): Task[];
declare function getSuites(suite: Arrayable<Task>): Suite[];
declare function hasTests(suite: Arrayable<Suite>): boolean;
declare function hasFailed(suite: Arrayable<Task>): boolean;
declare function getNames(task: Task): string[];

export { calculateSuiteHash, generateHash, getNames, getSuites, getTasks, getTests, hasFailed, hasTests, interpretTaskModes, partitionSuiteChildren, processError, replaceAsymmetricMatcher, serializeError, someTasksAreOnly };
