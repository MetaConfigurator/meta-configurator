import {describe, expect, it} from 'vitest';
import {hasJsonContent} from '@/utility/hasJsonContent';

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
