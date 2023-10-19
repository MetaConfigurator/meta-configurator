import {DEFAULT_SCHEMA} from '@/example-schemas/DefaultSchema';
import {STRENDA_SCHEMA} from '@/example-schemas/StrendaSchema';
import {ENZYMEML_SCHEMA} from '@/example-schemas/EnzymemlSchema';
import {AUTONOMOUS_VEHICLE_SCHEMA} from '@/example-schemas/AutonomousVehicleSchema';
import type {SchemaOption} from '@/model/SchemaOption';

/**
 * Collection of all available example schemas.
 */
export const schemaCollection: SchemaOption[] = [
  {label: 'Feature testing Schema', key: 'default', schema: DEFAULT_SCHEMA},
  {label: 'Strenda Schema', key: 'strenda', schema: STRENDA_SCHEMA},
  {label: 'Enzymeml Schema', key: 'enzymeml', schema: ENZYMEML_SCHEMA},
  {label: 'Autonomous Vehicle Schema', key: 'autonomousvehical', schema: AUTONOMOUS_VEHICLE_SCHEMA},
];
