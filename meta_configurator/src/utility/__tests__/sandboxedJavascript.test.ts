import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  assertSafeJavascriptTransformSource,
  executeSandboxedJavascriptTransform,
} from '@/utility/sandboxedJavascript';

describe('sandboxed JavaScript source validation', () => {
  it('accepts a regular transform function', () => {
    expect(() =>
      assertSafeJavascriptTransformSource(`function transform(input) {
        return {name: input.name, values: input.values?.map(value => value * 2) ?? []};
      }`)
    ).not.toThrow();
  });

  it.each([
    [
      'module imports',
      `async function transform(input) { return import('https://example.com/x.js'); }`,
    ],
    [
      'module imports separated by comments',
      `async function transform(input) { return import/**/('https://example.com/x.js'); }`,
    ],
    ['CommonJS imports', `function transform(input) { return require('package')(input); }`],
    ['dynamic code evaluation', `function transform(input) { return eval(input); }`],
    [
      'constructor-based code evaluation',
      `function transform(input) { return (() => {}).constructor(input)(); }`,
    ],
  ])('rejects %s', (_description, source) => {
    expect(() => assertSafeJavascriptTransformSource(source)).toThrow(
      'It is meant to transform the given input only.'
    );
  });

  it('rejects an empty transform', () => {
    expect(() => assertSafeJavascriptTransformSource('   ')).toThrow(
      'JavaScript mapping must not be empty.'
    );
  });
});

class WorkerStub {
  static instances: WorkerStub[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postedMessage?: {requestId: string; source: string; input: unknown};
  terminate = vi.fn();

  constructor() {
    WorkerStub.instances.push(this);
  }

  postMessage(message: {requestId: string; source: string; input: unknown}) {
    this.postedMessage = message;
  }
}

describe('sandboxed JavaScript worker lifecycle', () => {
  beforeEach(() => {
    WorkerStub.instances = [];
    vi.stubGlobal('Worker', WorkerStub);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => 'blob:test-worker');
        static revokeObjectURL = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves a successful response and terminates the worker', async () => {
    const execution = executeSandboxedJavascriptTransform(
      'function transform(input) { return input; }',
      {name: 'Ada'}
    );
    const worker = WorkerStub.instances[0]!;

    worker.onmessage?.({
      data: {
        requestId: worker.postedMessage?.requestId,
        success: true,
        result: {name: 'Ada'},
      },
    } as MessageEvent);

    await expect(execution).resolves.toEqual({name: 'Ada'});
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-worker');
  });

  it('rejects a failed worker response with its error message', async () => {
    const execution = executeSandboxedJavascriptTransform(
      'function transform(input) { return input; }',
      {}
    );
    const worker = WorkerStub.instances[0]!;

    worker.onmessage?.({
      data: {
        requestId: worker.postedMessage?.requestId,
        success: false,
        error: 'transform failed',
      },
    } as MessageEvent);

    await expect(execution).rejects.toThrow('transform failed');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates an execution that exceeds its timeout', async () => {
    vi.useFakeTimers();
    const execution = executeSandboxedJavascriptTransform(
      'function transform() { while (true) {} }',
      {},
      25
    );
    const worker = WorkerStub.instances[0]!;
    const rejectionExpectation = expect(execution).rejects.toThrow('exceeded 25 ms');

    await vi.advanceTimersByTimeAsync(25);

    await rejectionExpectation;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
