import {DEFAULT_SCHEMA} from '@/example-schemas/defaultSchema';
import {STRENDA_SCHEMA} from '@/example-schemas/strendaSchema';
import {ENZYMEML_SCHEMA} from '@/example-schemas/enzymemlSchema';
import {AUTONOMOUS_VEHICLE_SCHEMA} from '@/example-schemas/autonomousVehicleSchema';
import type {SchemaOption} from '@/model/schemaOption';

/**
 * Collection of all available example schemas.
 */
export const schemaCollection: SchemaOption[] = [
  {label: 'Feature testing Schema', key: 'default', schema: DEFAULT_SCHEMA},
  {label: 'Strenda Schema', key: 'strenda', schema: STRENDA_SCHEMA},
  {label: 'Enzymeml Schema', key: 'enzymeml', schema: ENZYMEML_SCHEMA},
  {label: 'Autonomous Vehicle Schema', key: 'autonomousvehical', schema: AUTONOMOUS_VEHICLE_SCHEMA},
];
