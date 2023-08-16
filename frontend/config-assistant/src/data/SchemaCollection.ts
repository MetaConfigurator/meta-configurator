import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';
import {ANIMAL_SCHEMA} from '@/data/AnimalSchema';
import {STRENDA_SCHEMA} from '@/data/StrendaSchema';
import {ENZYMEML_SCHEMA} from '@/data/EnzymemlSchema';
import {AUTONOMOUS_VEHICLE_SCHEMA} from '@/data/AutonomousVehicleSchema';

export const schemaCollection = [
  {label: 'Default Schema', key: 'default', schema: DEFAULT_SCHEMA},
  {label: 'Animal Schema', key: 'animal', schema: ANIMAL_SCHEMA},
  {label: 'Strenda Schema', key: 'strenda', schema: STRENDA_SCHEMA},
  {label: 'Enzymeml Schema', key: 'enzymeml', schema: ENZYMEML_SCHEMA},
  {label: 'Autonomous Vehicle Schema', key: 'autonomousvehical', schema: AUTONOMOUS_VEHICLE_SCHEMA},
];
