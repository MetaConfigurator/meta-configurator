import {describe, expect, it} from 'vitest';
import {noPathIndexLink} from '../pathIndexLink';

describe('noPathIndexLink', () => {
  it('should always return 0 as index', () => {
    expect(noPathIndexLink.determineIndexOfPath('', [])).toBe(0);
    expect(noPathIndexLink.determineIndexOfPath('test', [])).toBe(0);
    expect(noPathIndexLink.determineIndexOfPath('test', [0])).toBe(0);
    expect(noPathIndexLink.determineIndexOfPath('{ "test": "value" }', ['test'])).toBe(0);
  });
  it('should always return an empty path', () => {
    expect(noPathIndexLink.determinePathFromIndex('', 0)).toEqual([]);
    expect(noPathIndexLink.determinePathFromIndex('test', 0)).toEqual([]);
    expect(noPathIndexLink.determinePathFromIndex('test', 1)).toEqual([]);
    expect(noPathIndexLink.determinePathFromIndex('{ "test": "value" }', 10)).toEqual([]);
  });
});
