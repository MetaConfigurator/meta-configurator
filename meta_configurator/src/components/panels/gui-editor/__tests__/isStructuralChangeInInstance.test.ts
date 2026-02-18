import {beforeEach, describe, expect, it, vi} from 'vitest';
import {isStructuralChangeInInstance} from '@/components/panels/gui-editor/isStructuralChangeInInstance.ts';

describe('isStructuralChangeInInstance', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('two identical arrays', async () => {
    const oldIns = [1, 2, 3, { a: 1 }];
    const newIns = [1, 2, 3, { a: 1 }];
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(false);
  });

  it('two identical objects', async () => {
    const oldIns = { a: 1, b: 2, c: { d: 3 } };
    const newIns = { a: 1, b: 2, c: { d: 3 } };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(false);
  });

  it('two identical primitives of each type', async () => {
    expect(isStructuralChangeInInstance(1, 1)).toBe(false);
    expect(isStructuralChangeInInstance('string', 'string')).toBe(false);
    expect(isStructuralChangeInInstance(true, true)).toBe(false);
    expect(isStructuralChangeInInstance(null, null)).toBe(false);
  });

  it('two different primitives of each type', async () => {
    expect(isStructuralChangeInInstance(1, 2)).toBe(false);
    expect(isStructuralChangeInInstance('string', 'different string')).toBe(false);
    expect(isStructuralChangeInInstance(true, false)).toBe(false);

    expect(isStructuralChangeInInstance(null, undefined)).toBe(true);
  });

  it('intermixed primitive types', async () => {
    expect(isStructuralChangeInInstance(1, 'string')).toBe(false);
    expect(isStructuralChangeInInstance(true, null)).toBe(false);

    expect(isStructuralChangeInInstance(undefined, 1)).toBe(true);
  });

  it('primitive to object', async () => {
    const oldIns = 1;
    const newIns = { a: 1 };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(true);
  });

  it('primitive to array', async () => {
    const oldIns = 1;
    const newIns = [1];
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(true);
  });

  it('object where only values changed but not keys', async () => {
    const oldIns = { a: 1, b: 2 };
    const newIns = { a: 2, b: 3 };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(false);
  });

  it('array where only values changed but not keys', async () => {
    const oldIns = [1, 2, 3];
    const newIns = [2, 3, 4];
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(false);
  });

  it('object where keys have changed', async () => {
    const oldIns = { a: 1, b: 2 };
    const newIns = { a: 1, c: 2 };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(true);
  });

  it('object where new key was added', async () => {
    const oldIns = { a: 1 };
    const newIns = { a: 1, b: 2 };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(true);
  });

  it('object where a key was removed', async () => {
    const oldIns = { a: 1, b: 2 };
    const newIns = { a: 1 };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(true);
  });

  it('array where count has changed', async () => {
    const oldIns = [1, 2, 3];
    const newIns = [1, 2, 3, 4];
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(true);
  });

  it('array where nested object has changed', async () => {
    // only value in object changed -> no structural change
    const oldIns = [1, 2, { a: 1 }];
    const newIns = [1, 2, { a: 2 }];
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(false);

    // key in object changed -> structural change
    const oldIns2 = [1, 2, { a: 1 }];
    const newIns2 = [1, 2, { b: 1 }];
    expect(isStructuralChangeInInstance(oldIns2, newIns2)).toBe(true);
  });

  it('nested object which changed', async () => {
    // only value in nested object changed -> no structural change
    const oldIns = { a: 1, b: { c: 1 } };
    const newIns = { a: 1, b: { c: 2 } };
    expect(isStructuralChangeInInstance(oldIns, newIns)).toBe(false);

    // key in nested object changed -> structural change
    const oldIns2 = { a: 1, b: { c: 1 } };
    const newIns2 = { a: 1, b: { d: 1 } };
    expect(isStructuralChangeInInstance(oldIns2, newIns2)).toBe(true);
  });


});
