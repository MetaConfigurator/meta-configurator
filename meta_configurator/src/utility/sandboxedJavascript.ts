const DEFAULT_EXECUTION_TIMEOUT_MS = 10_000;

const FORBIDDEN_SOURCE_PATTERNS: {pattern: RegExp; description: string}[] = [
  {
    pattern: /\bimport(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*(?:\(|[{'"*\w])/,
    description: 'module imports',
  },
  {
    pattern: /\brequire\s*\(/,
    description: 'CommonJS imports',
  },
  {
    pattern: /\b(?:eval|Function)\s*\(/,
    description: 'dynamic code evaluation',
  },
  {
    pattern: /(?:\.|\[['"]?)constructor\b/,
    description: 'constructor-based code evaluation',
  },
];

const WORKER_SOURCE = `
"use strict";

const sendResult = self.postMessage.bind(self);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const blockedGlobals = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
  "indexedDB",
  "caches",
  "postMessage",
  "Function",
];

for (const name of blockedGlobals) {
  try {
    Object.defineProperty(self, name, {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch (_error) {
    // Some browser-provided globals are already non-configurable.
  }
}

self.onmessage = async event => {
  const {requestId, source, input} = event.data;
  try {
    const factory = new AsyncFunction(
      '"use strict";\\n' +
        source +
        '\\nif (typeof transform !== "function") {' +
        '\\n  throw new Error("JavaScript must define transform(input).");' +
        '\\n}' +
        '\\nreturn transform;'
    );
    const transform = await factory();
    const result = await transform(input);
    sendResult({requestId, success: true, result});
  } catch (error) {
    sendResult({
      requestId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
`;

type WorkerResponse = {
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: string;
};

export function assertSafeJavascriptTransformSource(source: string): void {
  if (source.trim().length === 0) {
    throw new Error('JavaScript mapping must not be empty.');
  }

  for (const forbidden of FORBIDDEN_SOURCE_PATTERNS) {
    if (forbidden.pattern.test(source)) {
      throw new Error(
        `JavaScript mapping cannot use ${forbidden.description}. External access and dynamic code are disabled.`
      );
    }
  }
}

/**
 * Executes a generated transform in a dedicated worker. The worker has no DOM
 * or Web Storage access, network-related globals are disabled, imports and
 * dynamic code construction are rejected, and runaway code is terminated.
 */
export function executeSandboxedJavascriptTransform(
  source: string,
  input: unknown,
  timeoutMs: number = DEFAULT_EXECUTION_TIMEOUT_MS
): Promise<unknown> {
  assertSafeJavascriptTransformSource(source);

  if (typeof Worker === 'undefined') {
    throw new Error('Sandboxed JavaScript execution is not supported by this browser.');
  }

  const workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], {type: 'text/javascript'}));
  const worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);
  const requestId = `mc-transform-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`JavaScript execution exceeded ${timeoutMs} ms and was terminated.`));
    }, timeoutMs);

    worker.onerror = event => {
      cleanup();
      reject(new Error(event.message || 'Sandboxed JavaScript execution failed.'));
    };

    worker.onmessage = event => {
      const response = event.data as WorkerResponse;
      if (response.requestId !== requestId) {
        return;
      }

      cleanup();
      if (response.success) {
        resolve(response.result);
      } else {
        reject(new Error(response.error || 'Sandboxed JavaScript execution failed.'));
      }
    };

    try {
      worker.postMessage({requestId, source, input});
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
