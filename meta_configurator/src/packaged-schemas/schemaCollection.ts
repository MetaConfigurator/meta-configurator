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
  {label: 'Autonomous Vehicle Schema', key: 'autonomousvehicle', schema: AUTONOMOUS_VEHICLE_SCHEMA},
  {
    label: 'preCICE Adapter Config Schema',
    key: 'precice-adapter',
    url: 'https://github.com/precice/preeco-orga/blob/main/adapter-config-schema/precice_adapter_config_schema.json',
  },
];
