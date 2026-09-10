import {describe, expect, it, vi} from 'vitest';
import {ManagedSession} from '../managedSession';
import {SessionMode} from '../../store/sessionMode';

vi.mock('@/data/useDataLink', () => ({
  getDataForMode: vi.fn(),
  getSchemaForMode: vi.fn(),
}));

describe('ManagedSession.isNodeHighlighted', () => {
  it('highlights the exactly selected node', () => {
    const session = new ManagedSession(SessionMode.DataEditor);
    session.updateCurrentSelectedElement(['parent', 'child']);

    expect(
      session.isNodeHighlighted({
        key: 'parent.child',
        data: {} as any,
        type: 'data' as any,
      })
    ).toBe(true);
  });

  it('highlights search result ancestors', () => {
    const session = new ManagedSession(SessionMode.DataEditor);
    session.currentSearchResults.value = [
      {
        path: ['parent', 'child'],
        description: 'match',
        textSnippet: 'match',
      } as any,
    ];

    expect(
      session.isNodeHighlighted({
        key: 'parent',
        data: {} as any,
        type: 'data' as any,
      })
    ).toBe(true);
  });

  it('does not highlight unrelated nodes', () => {
    const session = new ManagedSession(SessionMode.DataEditor);
    session.updateCurrentSelectedElement(['parent', 'child']);

    expect(
      session.isNodeHighlighted({
        key: 'parent.other',
        data: {} as any,
        type: 'data' as any,
      })
    ).toBe(false);
  });
});
