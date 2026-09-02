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
