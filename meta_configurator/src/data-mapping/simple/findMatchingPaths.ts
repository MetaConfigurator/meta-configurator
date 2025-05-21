import _ from 'lodash';
import type {Path} from '@/utility/path';

export function findMatchingPaths(inputData: any, sourcePathDef: string): Path[] {
  const allPaths: Path[] = [];

  // Recursively collect all paths to leaf nodes
  function collectPaths(obj: any, currentPath: (string | number)[] = []) {
    if (_.isPlainObject(obj)) {
      for (const key of Object.keys(obj)) {
        collectPaths(obj[key], [...currentPath, key]);
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        collectPaths(obj[i], [...currentPath, i]);
      }
    } else {
      allPaths.push(currentPath);
    }
  }

  collectPaths(inputData);

  // Normalize the source path definition
  const normalizedDef = normalizePathPattern(sourcePathDef);

  // Filter paths that match the pattern
  const matchingPointers = allPaths.filter(p => normalizePathArray(p) === normalizedDef);

  // returns a list of Paths instead of JSON pointers
  return matchingPointers;
}

// Replace all array indices (numbers) with "%INDEX%" in the actual path
function normalizePathArray(path: (string | number)[]): string {
  return path.map(seg => (typeof seg === 'number' ? '%INDEX%' : seg)).join('/');
}

// Replace all $INDEX_X$ with "%INDEX%" in the pattern
function normalizePathPattern(jsonPointer: string): string {
  return jsonPointer
    .split('/')
    .filter(Boolean)
    .map(seg => (seg.match(/^%INDEX_[A-Z]%$/) ? '%INDEX%' : seg))
    .join('/');
}
