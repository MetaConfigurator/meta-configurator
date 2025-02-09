import {vi} from 'vitest';

global.window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false, // Change to true if you want dark mode by default
  media: query,
  onchange: null,
  addListener: vi.fn(), // Deprecated
  removeListener: vi.fn(), // Deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
