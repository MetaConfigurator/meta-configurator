import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export const ENZYMEML_SCHEMA: TopLevelSchema = {
  title: 'EnzymeMLDocument',
  description:
    'This is the root object that composes all objects found in an EnzymeML document. It also includes general metadata such as the name of the document, when it was created/modified and references to publications, databases and arbitrary links to the web.',
  type: 'object',
  properties: {
    id: {
      title: 'Id',
      description: 'Unique identifier of the given object.',
      xml: '@id',
      type: 'string',
    },
    name: {
      title: 'Name',
      description: 'Title of the EnzymeML Document.',
      type: 'string',
    },
    pubmedid: {
      title: 'Pubmedid',
      description: 'Pubmed ID reference.',
      type: 'string',
    },
    url: {
      title: 'Url',
      description: 'Arbitrary type of URL that is related to the EnzymeML document.',
      type: 'string',
    },
    doi: {
      title: 'Doi',
      description:
        'Digital Object Identifier of the referenced publication or the EnzymeML document.',
      type: 'string',
    },
    created: {
      title: 'Created',
      description: 'Date the EnzymeML document was created.',
      type: 'string',
      format: 'date-time',
    },
    modified: {
      title: 'Modified',
      description: 'Date the EnzymeML document was modified.',
      type: 'string',
      format: 'date-time',
    },
    creators: {
      title: 'Creators',
      description: 'Contains all authors that are part of the experiment.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Creator',
      },
    },
    vessels: {
      title: 'Vessels',
      description: 'Contains all vessels that are part of the experiment.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Vessel',
      },
    },
    proteins: {
      title: 'Proteins',
      description: 'Contains all proteins that are part of the experiment.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Protein',
      },
    },
    complexes: {
      title: 'Complexes',
      description: 'Contains all complexes that are part of the experiment.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Complex',
      },
    },
    reactants: {
      title: 'Reactants',
      description: 'Contains all reactants that are part of the experiment.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Reactant',
      },
    },
    reactions: {
      title: 'Reactions',
      description: 'Dictionary mapping from reaction IDs to reaction describing objects.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Reaction',
      },
    },
    measurements: {
      title: 'Measurements',
      description: 'Contains measurements that describe outcomes of an experiment.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Measurement',
      },
    },
    files: {
      title: 'Files',
      description: 'Contains files attached to the data model.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/File',
      },
    },
    global_parameters: {
      title: 'Global Parameters',
      description:
        'Dictionary mapping from parameter IDs to global kinetic parameter describing objects.',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/KineticParameter',
      },
    },
  },
  required: ['name'],
  definitions: {
    Creator: {
      title: 'Creator',
      description:
        'The creator object contains all information about authors that contributed to the resulting document.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        given_name: {
          title: 'Given Name',
          description: 'Given name of the author or contributor.',
          type: 'string',
        },
        family_name: {
          title: 'Family Name',
          description: 'Family name of the author or contributor.',
          type: 'string',
        },
        mail: {
          title: 'Mail',
          description: 'Email address of the author or contributor.',
          type: 'string',
        },
      },
      required: ['given_name', 'family_name', 'mail'],
    },
    Vessel: {
      title: 'Vessel',
      description:
        'This object describes vessels in which the experiment has been carried out. These can include any type of vessel used in biocatalytic experiments.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'Name of the used vessel.',
          template_alias: 'Name',
          type: 'string',
        },
        volume: {
          title: 'Volume',
          description: 'Volumetric value of the vessel.',
          template_alias: 'Volume value',
          exclusiveMinimum: 0,
          type: 'number',
        },
        unit: {
          title: 'Unit',
          description: 'Volumetric unit of the vessel.',
          template_alias: 'Volume unit',
          type: 'string',
        },
        constant: {
          title: 'Constant',
          description: 'Whether the volume of the vessel is constant or not.',
          default: true,
          type: 'boolean',
        },
        uri: {
          title: 'Uri',
          description: 'URI of the vessel.',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'Unique identifier of the author.',
          type: 'string',
        },
      },
      required: ['name', 'volume', 'unit'],
    },
    SBOTerm: {
      title: 'SBOTerm',
      description: 'An enumeration.',
      enum: [
        'SBO:0000176',
        'SBO:0000208',
        'SBO:0000181',
        'SBO:0000182',
        'SBO:0000179',
        'SBO:0000180',
        'SBO:0000209',
        'SBO:0000377',
        'SBO:0000177',
        'SBO:0000200',
        'SBO:0000672',
        'SBO:0000252',
        'SBO:0000251',
        'SBO:0000247',
        'SBO:0000327',
        'SBO:0000328',
        'SBO:0000336',
        'SBO:0000015',
        'SBO:0000011',
        'SBO:0000013',
        'SBO:0000020',
        'SBO:0000461',
        'SBO:0000462',
        'SBO:0000021',
        'SBO:0000296',
        'SBO:0000297',
        'SBO:0000607',
        'SBO:0000028',
        'SBO:0000025',
        'SBO:0000027',
        'SBO:0000186',
      ],
    },
    Protein: {
      title: 'Protein',
      description:
        'This objects describes the proteins that were used or produced in the course of the experiment.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'None',
          type: 'string',
        },
        vessel_id: {
          title: 'Vessel Id',
          description: 'None',
          type: 'string',
        },
        init_conc: {
          title: 'Init Conc',
          description: 'None',
          type: 'number',
        },
        constant: {
          title: 'Constant',
          description: 'None',
          type: 'boolean',
        },
        unit: {
          title: 'Unit',
          description: 'None',
          type: 'string',
        },
        uri: {
          title: 'Uri',
          description: 'None',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'None',
          type: 'string',
        },
        sequence: {
          title: 'Sequence',
          description: 'Amino acid sequence of the protein',
          template_alias: 'Sequence',
          type: 'string',
        },
        ecnumber: {
          title: 'Ecnumber',
          description: 'EC number of the protein.',
          pattern: '(\\d+.)(\\d+.)(\\d+.)(\\d+)',
          template_alias: 'EC Number',
          type: 'string',
        },
        organism: {
          title: 'Organism',
          description: 'Organism the protein was expressed in.',
          template_alias: 'Source organism',
          type: 'string',
        },
        organism_tax_id: {
          title: 'Organism Tax Id',
          description: 'Taxonomy identifier of the expression host.',
          type: 'string',
        },
        uniprotid: {
          title: 'Uniprotid',
          description:
            'Unique identifier referencing a protein entry at UniProt. Use this identifier to initialize the object from the UniProt database.',
          template_alias: 'UniProt ID',
          type: 'string',
        },
        ontology: {
          description: 'None',
          default: 'SBO:0000013',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
      },
      required: ['name', 'vessel_id', 'constant', 'sequence'],
    },
    Complex: {
      title: 'Complex',
      description:
        'This object describes complexes made of reactants and/or proteins that were used or produced in the course of the experiment.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'None',
          type: 'string',
        },
        vessel_id: {
          title: 'Vessel Id',
          description: 'None',
          type: 'string',
        },
        init_conc: {
          title: 'Init Conc',
          description: 'None',
          type: 'number',
        },
        constant: {
          title: 'Constant',
          description: 'None',
          type: 'boolean',
        },
        unit: {
          title: 'Unit',
          description: 'None',
          type: 'string',
        },
        uri: {
          title: 'Uri',
          description: 'None',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'None',
          type: 'string',
        },
        participants: {
          title: 'Participants',
          description: 'Array of IDs the complex contains',
          pattern: '[s|p][\\d]+',
          multiple: true,
          type: 'array',
          items: {
            type: 'string',
            pattern: '[s|p][\\d]+',
          },
        },
        ontology: {
          description: 'None',
          default: 'SBO:0000296',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
      },
      required: ['name', 'vessel_id', 'constant'],
    },
    Reactant: {
      title: 'Reactant',
      description:
        'This objects describes the reactants that were used or produced in the course of the experiment.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'None',
          type: 'string',
        },
        vessel_id: {
          title: 'Vessel Id',
          description: 'None',
          type: 'string',
        },
        init_conc: {
          title: 'Init Conc',
          description: 'None',
          type: 'number',
        },
        constant: {
          title: 'Constant',
          description: 'None',
          type: 'boolean',
        },
        unit: {
          title: 'Unit',
          description: 'None',
          type: 'string',
        },
        uri: {
          title: 'Uri',
          description: 'None',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'None',
          type: 'string',
        },
        smiles: {
          title: 'Smiles',
          description:
            'Simplified Molecular Input Line Entry System (SMILES) encoding of the reactant.',
          template_alias: 'SMILES',
          type: 'string',
        },
        inchi: {
          title: 'Inchi',
          description: 'International Chemical Identifier (InChI) encoding of the reactant.',
          template_alias: 'InCHI',
          type: 'string',
        },
        chebi_id: {
          title: 'Chebi Id',
          description:
            'Unique identifier of the CHEBI database. Use this identifier to initialize the object from the CHEBI database.',
          type: 'string',
        },
        ontology: {
          description: 'None',
          default: 'SBO:0000247',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
      },
      required: ['name', 'vessel_id', 'constant'],
    },
    KineticParameter: {
      title: 'KineticParameter',
      description:
        'This object describes the parameters of the kinetic model and can include all estimated values.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'Name of the estimated parameter.',
          type: 'string',
        },
        value: {
          title: 'Value',
          description: 'Numerical value of the estimated parameter.',
          type: 'number',
        },
        unit: {
          title: 'Unit',
          description: 'Unit of the estimated parameter.',
          type: 'string',
        },
        initial_value: {
          title: 'Initial Value',
          description: 'Initial value that was used for the parameter estimation.',
          type: 'number',
        },
        upper: {
          title: 'Upper',
          description: 'Upper bound of the estimated parameter.',
          type: 'number',
        },
        lower: {
          title: 'Lower',
          description: 'Lower bound of the estimated parameter.',
          type: 'number',
        },
        is_global: {
          title: 'Is Global',
          description: 'Specifies if this parameter is a global parameter.',
          default: false,
          type: 'boolean',
        },
        stdev: {
          title: 'Stdev',
          description: 'Standard deviation of the estimated parameter.',
          type: 'number',
        },
        constant: {
          title: 'Constant',
          description: 'Specifies if this parameter is constant',
          default: false,
          type: 'boolean',
        },
        ontology: {
          description: 'Type of the estimated parameter.',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
      },
      required: ['name', 'value', 'unit'],
    },
    KineticModel: {
      title: 'KineticModel',
      description: 'This object describes a kinetic model that was derived from the experiment.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'Name of the kinetic law.',
          type: 'string',
        },
        equation: {
          title: 'Equation',
          description: 'Equation for the kinetic law.',
          type: 'string',
        },
        parameters: {
          title: 'Parameters',
          description: 'List of estimated parameters.',
          multiple: true,
          type: 'array',
          items: {
            $ref: '#/definitions/KineticParameter',
          },
        },
        ontology: {
          description: 'Type of the estimated parameter.',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
      },
      required: ['name', 'equation'],
    },
    ReactionElement: {
      title: 'ReactionElement',
      description:
        'This object is part of the Reaction object and describes either an educt, product or modifier. The latter includes buffers, counter-ions as well as proteins/enzymes.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        species_id: {
          title: 'Species Id',
          description:
            'Internal identifier to either a protein or reactant defined in the EnzymeMLDocument.',
          type: 'string',
        },
        stoichiometry: {
          title: 'Stoichiometry',
          description: 'Positive float number representing the associated stoichiometry.',
          default: 1.0,
          exclusiveMinimum: 0,
          type: 'number',
        },
        constant: {
          title: 'Constant',
          description: 'Whether or not the concentration of this species remains constant.',
          default: false,
          type: 'boolean',
        },
        ontology: {
          description: 'Ontology defining the role of the given species.',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
      },
      required: ['species_id'],
    },
    Reaction: {
      title: 'Reaction',
      description:
        'This object describes a chemical or enzymatic reaction that was investigated in the course of the experiment. All species used within this object need to be part of the data model.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'Name of the reaction.',
          template_alias: 'Name',
          type: 'string',
        },
        reversible: {
          title: 'Reversible',
          description: 'Whether the reaction is reversible or irreversible',
          default: false,
          template_alias: 'Reversible',
          type: 'boolean',
        },
        temperature: {
          title: 'Temperature',
          description: 'Numeric value of the temperature of the reaction.',
          template_alias: 'Temperature value',
          type: 'number',
        },
        temperature_unit: {
          title: 'Temperature Unit',
          description: 'Unit of the temperature of the reaction.',
          pattern: 'kelvin|Kelvin|k|K|celsius|Celsius|C|c',
          template_alias: 'Temperature unit',
          type: 'string',
        },
        ph: {
          title: 'Ph',
          description: 'PH value of the reaction.',
          template_alias: 'pH value',
          inclusiveminimum: 0,
          inclusivemaximum: 14,
          type: 'number',
        },
        ontology: {
          description: 'Ontology defining the role of the given species.',
          default: 'SBO:0000176',
          allOf: [
            {
              $ref: '#/definitions/SBOTerm',
            },
          ],
        },
        uri: {
          title: 'Uri',
          description: 'URI of the reaction.',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'Unique identifier of the author.',
          type: 'string',
        },
        model: {
          title: 'Model',
          description: 'Kinetic model decribing the reaction.',
          allOf: [
            {
              $ref: '#/definitions/KineticModel',
            },
          ],
        },
        educts: {
          title: 'Educts',
          description: 'List of educts containing ReactionElement objects.',
          multiple: true,
          template_alias: 'Educts',
          type: 'array',
          items: {
            $ref: '#/definitions/ReactionElement',
          },
        },
        products: {
          title: 'Products',
          description: 'List of products containing ReactionElement objects.',
          multiple: true,
          template_alias: 'Products',
          type: 'array',
          items: {
            $ref: '#/definitions/ReactionElement',
          },
        },
        modifiers: {
          title: 'Modifiers',
          description:
            'List of modifiers (Proteins, snhibitors, stimulators) containing ReactionElement objects.',
          multiple: true,
          template_alias: 'Modifiers',
          type: 'array',
          items: {
            $ref: '#/definitions/ReactionElement',
          },
        },
      },
      required: ['name'],
    },
    DataTypes: {
      title: 'DataTypes',
      description: 'An enumeration.',
      enum: ['conc', 'abs', 'feed', 'biomass', 'conversion', 'peak-area'],
    },
    Replicate: {
      title: 'Replicate',
      description:
        'This object contains the measured time course data as well as metadata to the replicate itself.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        species_id: {
          title: 'Species Id',
          description: 'Unique identifier of the species that has been measured.',
          type: 'string',
        },
        measurement_id: {
          title: 'Measurement Id',
          description: 'Unique identifier of the measurement that the replicate is part of.',
          type: 'string',
        },
        data_type: {
          description: 'Type of data that was measured (e.g. concentration)',
          default: 'conc',
          allOf: [
            {
              $ref: '#/definitions/DataTypes',
            },
          ],
        },
        data_unit: {
          title: 'Data Unit',
          description: 'SI unit of the data that was measured.',
          type: 'string',
        },
        time_unit: {
          title: 'Time Unit',
          description: 'Time unit of the replicate.',
          type: 'string',
        },
        time: {
          title: 'Time',
          description: 'Time steps of the replicate.',
          multiple: true,
          type: 'array',
          items: {
            type: 'number',
          },
        },
        data: {
          title: 'Data',
          description: 'Data that was measured.',
          multiple: true,
          type: 'array',
          items: {
            type: 'number',
          },
        },
        is_calculated: {
          title: 'Is Calculated',
          description: 'Whether or not the data has been generated by simulation.',
          default: false,
          type: 'boolean',
        },
        uri: {
          title: 'Uri',
          description: 'URI of the protein.',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'Unique identifier of the author.',
          type: 'string',
        },
      },
      required: ['species_id', 'measurement_id', 'data_unit', 'time_unit'],
    },
    MeasurementData: {
      title: 'MeasurementData',
      description:
        'This object describes a single entity of a measurement, which corresponds to one species. It also holds replicates which contain time course data.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        init_conc: {
          title: 'Init Conc',
          description: 'Initial concentration of the measurement data.',
          type: 'number',
        },
        unit: {
          title: 'Unit',
          description: 'The unit of the measurement data.',
          type: 'string',
        },
        measurement_id: {
          title: 'Measurement Id',
          description: 'Unique measurement identifier this dataset belongs to.',
          type: 'string',
        },
        species_id: {
          title: 'Species Id',
          description: 'The identifier for the described reactant.',
          type: 'string',
        },
        replicates: {
          title: 'Replicates',
          description: 'A list of replicate objects holding raw data of the measurement.',
          multiple: true,
          type: 'array',
          items: {
            $ref: '#/definitions/Replicate',
          },
        },
      },
      required: ['init_conc', 'unit', 'measurement_id'],
    },
    Measurement: {
      title: 'Measurement',
      description:
        'This object describes the result of a measurement, which includes time course data of any type defined in DataTypes. It includes initial concentrations of all species used in a single measurement.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'Name of the measurement',
          type: 'string',
        },
        temperature: {
          title: 'Temperature',
          description: 'Numeric value of the temperature of the reaction.',
          template_alias: 'Temperature value',
          type: 'number',
        },
        temperature_unit: {
          title: 'Temperature Unit',
          description: 'Unit of the temperature of the reaction.',
          pattern: 'kelvin|Kelvin|k|K|celsius|Celsius|C|c',
          type: 'string',
        },
        ph: {
          title: 'Ph',
          description: 'PH value of the reaction.',
          inclusiveminimum: 0,
          inclusivemaximum: 14,
          type: 'number',
        },
        species: {
          title: 'Species',
          description: 'Species of the measurement.',
          multiple: true,
          type: 'array',
          items: {
            $ref: '#/definitions/MeasurementData',
          },
        },
        global_time: {
          title: 'Global Time',
          description: 'Global time of the measurement all replicates agree on.',
          multiple: true,
          type: 'array',
          items: {
            type: 'number',
          },
        },
        global_time_unit: {
          title: 'Global Time Unit',
          description: 'Unit of the global time.',
          type: 'string',
        },
        uri: {
          title: 'Uri',
          description: 'URI of the reaction.',
          type: 'string',
        },
        creator_id: {
          title: 'Creator Id',
          description: 'Unique identifier of the author.',
          type: 'string',
        },
      },
      required: ['name', 'temperature', 'temperature_unit', 'ph', 'global_time_unit'],
    },
    File: {
      title: 'File',
      description: 'This objects contains a files that has been attached to the document.',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        name: {
          title: 'Name',
          description: 'Name of the file',
          type: 'string',
        },
        content: {
          title: 'Content',
          description: 'Contents of the file',
          type: 'string',
          format: 'binary',
        },
        filetype: {
          title: 'Filetype',
          description: 'Type of the file such as .xml, .json and so on',
          type: 'string',
        },
      },
      required: ['name', 'content', 'filetype'],
    },
  },
};
