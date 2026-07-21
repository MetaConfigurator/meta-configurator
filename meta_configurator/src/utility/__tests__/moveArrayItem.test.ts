import {describe, expect, it} from 'vitest';
import {moveArrayItem} from '@/utility/moveArrayItem';

describe('moveArrayItem', () => {
  it('moves an item forward', () => {
    expect(moveArrayItem(['A', 'B', 'C', 'D'], 0, 2)).toEqual(['B', 'C', 'A', 'D']);
  });

  it('moves an item backward', () => {
    expect(moveArrayItem(['A', 'B', 'C', 'D'], 3, 1)).toEqual(['A', 'D', 'B', 'C']);
  });

  it('moves an item by one (up/down button case)', () => {
    expect(moveArrayItem(['A', 'B', 'C'], 1, 0)).toEqual(['B', 'A', 'C']);
    expect(moveArrayItem(['A', 'B', 'C'], 1, 2)).toEqual(['A', 'C', 'B']);
  });

  it('returns an unchanged copy for a no-op or out-of-range move', () => {
    const input = ['A', 'B', 'C'];
    expect(moveArrayItem(input, 1, 1)).toEqual(['A', 'B', 'C']);
    expect(moveArrayItem(input, -1, 0)).toEqual(['A', 'B', 'C']);
    expect(moveArrayItem(input, 0, 5)).toEqual(['A', 'B', 'C']);
  });

  it('does not mutate the input array', () => {
    const input = ['A', 'B', 'C'];
    moveArrayItem(input, 0, 2);
    expect(input).toEqual(['A', 'B', 'C']);
  });
});
