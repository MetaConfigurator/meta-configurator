function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value);
}

function convertToJsonCompatible(
  value: unknown,
  seen: WeakSet<object>,
  insideArray: boolean
): unknown {
  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return value;
    case 'bigint':
      return value.toString();
    case 'undefined':
    case 'function':
    case 'symbol':
      return insideArray ? null : undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (isArrayBufferView(value)) {
    if (value instanceof DataView) {
      return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    }
    return Array.from(value as unknown as ArrayLike<number>);
  }

  if (value instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(value));
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      const converted = convertToJsonCompatible(item, seen, true);
      return converted === undefined ? null : converted;
    });
  }

  if (value instanceof Set) {
    return Array.from(value, item => {
      const converted = convertToJsonCompatible(item, seen, true);
      return converted === undefined ? null : converted;
    });
  }

  if (value instanceof Map) {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of value.entries()) {
      const converted = convertToJsonCompatible(entryValue, seen, false);
      if (converted !== undefined) {
        result[String(key)] = converted;
      }
    }
    return result;
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      const converted = convertToJsonCompatible(entryValue, seen, false);
      if (converted !== undefined) {
        result[key] = converted;
      }
    }
    seen.delete(value);
    return result;
  }

  return insideArray ? null : undefined;
}

export function makeJsonCompatible<T>(value: T): T {
  const converted = convertToJsonCompatible(value, new WeakSet(), false);
  return (converted === undefined ? null : converted) as T;
}
