import type {SchemaOption} from '@/packaged-schemas/schemaOption';
import {DEFAULT_SCHEMA} from '@/packaged-schemas/defaultSchema';
import {STRENDA_SCHEMA} from '@/packaged-schemas/strendaSchema';
import {ENZYMEML_SCHEMA} from '@/packaged-schemas/enzymemlSchema';
import {AUTONOMOUS_VEHICLE_SCHEMA} from '@/packaged-schemas/autonomousVehicleSchema';

/**
 * Collection of all available example schemas.
 */
export const schemaCollection: SchemaOption[] = [
  {label: 'Feature testing Schema', key: 'default', schema: DEFAULT_SCHEMA},
  {label: 'Strenda Schema', key: 'strenda', schema: STRENDA_SCHEMA},
  {label: 'Enzymeml Schema', key: 'enzymeml', schema: ENZYMEML_SCHEMA},
  {label: 'Autonomous Vehicle Schema', key: 'autonomousvehical', schema: AUTONOMOUS_VEHICLE_SCHEMA},
];
