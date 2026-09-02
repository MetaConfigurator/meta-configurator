import {describe, expect, it} from 'vitest';
import {hasJsonContent, makeJsonCompatible} from '@/utility/jsonCompatible';

describe('makeJsonCompatible', () => {
  it('normalizes values that JSON cannot represent', () => {
    const sparseArray = new Array(2);
    sparseArray[1] = Number.POSITIVE_INFINITY;

    expect(
      makeJsonCompatible({
        bigint: 42n,
        missing: undefined,
        notANumber: Number.NaN,
        sparseArray,
      })
    ).toEqual({
      bigint: '42',
      notANumber: null,
      sparseArray: [null, null],
    });
  });

  it('handles cycles in every supported collection type', () => {
    const circularArray: unknown[] = [];
    circularArray.push(circularArray);

    const circularMap = new Map<string, unknown>();
    circularMap.set('self', circularMap);

    const circularSet = new Set<unknown>();
    circularSet.add(circularSet);

    expect(makeJsonCompatible({circularArray, circularMap, circularSet})).toEqual({
      circularArray: ['[Circular]'],
      circularMap: {self: '[Circular]'},
      circularSet: ['[Circular]'],
    });
  });

  it('converts repeated non-circular references independently', () => {
    const sharedValue = {name: 'Ada'};

    expect(makeJsonCompatible([sharedValue, sharedValue])).toEqual([{name: 'Ada'}, {name: 'Ada'}]);
  });

  it('converts built-in objects to stable JSON values', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const error = new Error('failed');
    error.stack = undefined;

    expect(
      makeJsonCompatible({
        date: new Date('2026-09-02T12:00:00.000Z'),
        invalidDate: new Date(Number.NaN),
        expression: /schema/gi,
        error,
        bytes,
        map: new Map<unknown, unknown>([[42, 'answer']]),
        set: new Set([1, 2]),
      })
    ).toEqual({
      date: '2026-09-02T12:00:00.000Z',
      invalidDate: null,
      expression: '/schema/gi',
      error: {name: 'Error', message: 'failed'},
      bytes: [1, 2, 3],
      map: {'42': 'answer'},
      set: [1, 2],
    });
  });
});

describe('hasJsonContent', () => {
  it.each([null, undefined, [], {}])('returns false for empty content %#', value => {
    expect(hasJsonContent(value)).toBe(false);
  });

  it.each([false, 0, '', [null], {value: null}])(
    'returns true for loaded JSON content %#',
    value => {
      expect(hasJsonContent(value)).toBe(true);
    }
  );
});
