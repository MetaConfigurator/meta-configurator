import type {Path, PathElement} from '@/utility/path';

// Encode data edges and composition steps separately. A property name can contain
// any delimiter, and branch ancestry must survive subsequent property/item edges.
export function schemaSelectionKey(path: Path): string {
  return JSON.stringify(path.map(element => ['data', element]));
}

export function childSchemaSelectionKey(parentKey: string, element: PathElement): string {
  return JSON.stringify([...JSON.parse(parentKey), ['data', element]]);
}
