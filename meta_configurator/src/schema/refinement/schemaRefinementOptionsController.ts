import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';

export interface SchemaRefinementOptionsController {
  reset: () => void;
  hasSelectedRefinements: () => boolean;
  buildSelection: () => RefineSchemaSelection;
}
