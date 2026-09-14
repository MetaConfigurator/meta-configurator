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
    case 'boolean':
      return value;
    case 'number':
      return Number.isFinite(value) ? value : null;
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
    const serializedError: Record<string, string> = {
      name: value.name,
      message: value.message,
    };
    if (value.stack !== undefined) {
      serializedError.stack = value.stack;
    }
    return serializedError;
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

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return Array.from(value, item => {
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
      const convertedEntries: Record<string, unknown> = {};
      for (const [key, entryValue] of value.entries()) {
        const convertedValue = convertToJsonCompatible(entryValue, seen, false);
        if (convertedValue !== undefined) {
          convertedEntries[String(key)] = convertedValue;
        }
      }
      return convertedEntries;
    }

    const convertedProperties: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      const convertedValue = convertToJsonCompatible(entryValue, seen, false);
      if (convertedValue !== undefined) {
        convertedProperties[key] = convertedValue;
      }
    }
    return convertedProperties;
  } finally {
    seen.delete(value);
  }
}

export function makeJsonCompatible(value: unknown): unknown {
  const converted = convertToJsonCompatible(value, new WeakSet(), false);
  return converted === undefined ? null : converted;
}
