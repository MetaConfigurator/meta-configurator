import _ from 'lodash';
import type {Path} from '@/utility/path';

export function findMatchingPaths(inputData: any, sourcePathDef: string): Path[] {
  const allPaths: Path[] = [];

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

  const normalizedDef = normalizePathPattern(sourcePathDef);
  return allPaths.filter(path => normalizePathArray(path) === normalizedDef);
}

function normalizePathArray(path: (string | number)[]): string {
  return path.map(seg => (typeof seg === 'number' ? '%INDEX%' : seg)).join('/');
}

function normalizePathPattern(jsonPointer: string): string {
  return jsonPointer
    .split('/')
    .filter(Boolean)
    .map(seg => (seg.match(/^%INDEX_[A-Z]%$/) ? '%INDEX%' : seg))
    .join('/');
}
