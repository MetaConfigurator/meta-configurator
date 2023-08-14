import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';
import {ANIMAL_SCHEMA} from '@/data/AnimalSchema';
import type {SchemaOption} from '@/model/SchemaOption';

export const schemaCollection: SchemaOption[] = [
  {label: 'Default Schema', key: 'default', schema: DEFAULT_SCHEMA},
  {label: 'Animal Schema', key: 'animal', schema: ANIMAL_SCHEMA},
];
