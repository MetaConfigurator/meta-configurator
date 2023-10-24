import type {TopLevelSchema} from '@/model/jsonSchemaType';

export const STRENDA_SCHEMA: TopLevelSchema = {
  title: 'Dataset',
  type: 'object',
  properties: {
    id: {
      title: 'Id',
      description: 'Unique identifier of the given object.',
      xml: '@id',
      type: 'string',
    },
    manuscript: {
      title: 'Manuscript',
      description: 'Manuscript details',
      allOf: [
        {
          $ref: '#/definitions/Manuscript',
        },
      ],
    },
    experiments: {
      title: 'Experiments',
      description: 'Experiments that are part of this Dataset',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Experiment',
      },
    },
    results: {
      title: 'Results',
      description: 'Results of this dataset',
      multiple: true,
      type: 'array',
      items: {
        $ref: '#/definitions/Result',
      },
    },
  },
  definitions: {
    Manuscript: {
      title: 'Manuscript',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        author_names: {
          title: 'Author Names',
          description: 'Names of the authors (last name, first name)',
          multiple: true,
          type: 'array',
          items: {
            type: 'string',
          },
        },
        DOI: {
          title: 'Doi',
          description: 'Digital Object Identifier of the given manuscript',
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'integer',
            },
          ],
        },
        PMID: {
          title: 'Pmid',
          description: 'PubMed identifier of the manuscript',
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'integer',
            },
          ],
        },
      },
    },
    Protein: {
      title: 'Protein',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        protein_id: {
          title: 'Protein Id',
          description: 'Unique identifier of the given protein',
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'integer',
            },
          ],
        },
        name: {
          title: 'Name',
          description: 'The name of the protein',
          type: 'string',
        },
        sequence: {
          title: 'Sequence',
          description: "Amino acid of the protein's primary structure",
          type: 'string',
        },
        ec_number: {
          title: 'Ec Number',
          description: "EC number of the protein e.g. '3.4.11.4'",
          type: 'string',
        },
        reaction: {
          title: 'Reaction',
          description: 'Catalyzed reaction of the given protein (from the EC number)',
          type: 'string',
        },
        assayed_reaction: {
          title: 'Assayed Reaction',
          description: 'Reaction that the proteins catalyzes within this manuscript',
          type: 'string',
        },
      },
    },
    CompoundRoles: {
      title: 'CompoundRoles',
      description: 'An enumeration.',
      enum: ['substrate', 'product', 'salt', 'buffer', 'inhibitor', 'activator'],
    },
    AssayConditions: {
      title: 'AssayConditions',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        assay_components: {
          title: 'Assay Components',
          description: 'Components of this assay',
          multiple: true,
          type: 'array',
          items: {
            type: 'string',
          },
        },
        compound_name: {
          title: 'Compound Name',
          description: 'Name of the compound that has been used within this assay',
          type: 'string',
        },
        inchi: {
          title: 'Inchi',
          description: 'International Chemical Identifier of the compound',
          type: 'string',
        },
        iupac_name: {
          title: 'Iupac Name',
          description: 'IUPAC name of the compound',
          type: 'string',
        },
        database_id: {
          title: 'Database Id',
          description: 'Unique identifier of the database this compound can be found',
          type: 'string',
        },
        concentration: {
          title: 'Concentration',
          description: 'Initial concentration of the given compound',
          exclusiveMinimum: 0,
          type: 'number',
        },
        protein_concentration: {
          title: 'Protein Concentration',
          description: 'Initial concentration of the protein used in this assay',
          exclusiveMinimum: 0,
          type: 'number',
        },
        ph: {
          title: 'Ph',
          description: 'pH value of the assay',
          exclusiveMinimum: 0.0,
          exclusiveMaximum: 14.0,
          type: 'number',
        },
        role: {
          description: 'Role of this compound. Find the list if roles [here](#compoundroles).',
          allOf: [
            {
              $ref: '#/definitions/CompoundRoles',
            },
          ],
        },
      },
    },
    Experiment: {
      title: 'Experiment',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        methodology: {
          title: 'Methodology',
          description: 'Free text describing the methodology of the experiment',
          type: 'string',
        },
        proteins: {
          title: 'Proteins',
          description: 'Proteins that have been used within this assay',
          multiple: true,
          type: 'array',
          items: {
            $ref: '#/definitions/Protein',
          },
        },
        assay_conditions: {
          title: 'Assay Conditions',
          description: 'Conditions of the assay',
          allOf: [
            {
              $ref: '#/definitions/AssayConditions',
            },
          ],
        },
      },
    },
    KineticParameters: {
      title: 'KineticParameters',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        Km: {
          title: 'Km',
          description: 'Estimated Michaelis-Menten constant',
          type: 'number',
        },
        kcat: {
          title: 'Kcat',
          description: 'Estimated catalytic rate',
          type: 'number',
        },
        V: {
          title: 'V',
          description: 'Reaction velocity',
          type: 'number',
        },
        kcat_over_km: {
          title: 'Kcat Over Km',
          description: 'Ratio of the catalytic rate over Michaelis-Menten constant',
          type: 'number',
        },
        V_over_km: {
          title: 'V Over Km',
          description: 'Ration of reaction velocity over Michaelis-Menten constant',
          type: 'number',
        },
      },
    },
    InhibitionType: {
      title: 'InhibitionType',
      description: 'An enumeration.',
      enum: ['competitive', 'uncompetitive', 'mixed'],
    },
    InhibitionParameters: {
      title: 'InhibitionParameters',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        reversible: {
          title: 'Reversible',
          description: 'Whether or not this reaction is reversible',
          type: 'boolean',
        },
        inhibition_type: {
          description: 'Type of inhibition that occured within this reaction',
          allOf: [
            {
              $ref: '#/definitions/InhibitionType',
            },
          ],
        },
        Kic: {
          title: 'Kic',
          description: 'Inhibition constant of the reaction (Case: (un-)competivtive, mixed)',
          type: 'number',
        },
        Kiu: {
          title: 'Kiu',
          description: 'Second inhibition constant of the reaction (Case: mixed)',
          type: 'number',
        },
        Ki: {
          title: 'Ki',
          description: 'Inhibition constant of the reaction (Case: irreversible reaction)',
          type: 'number',
        },
      },
    },
    ActivationParameters: {
      title: 'ActivationParameters',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        activation_affinity_constant: {
          title: 'Activation Affinity Constant',
          description: 'Activation affinity constant of the reaction',
          type: 'number',
        },
        velocity_at_no_activator: {
          title: 'Velocity At No Activator',
          description: 'Velocity of the reaction at zero concentration of the activator',
          type: 'number',
        },
        velocity_at_max_activator: {
          title: 'Velocity At Max Activator',
          description: 'Velocity of the reaction at maximum concentration of the activator',
          type: 'number',
        },
      },
    },
    Result: {
      title: 'Result',
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          description: 'Unique identifier of the given object.',
          xml: '@id',
          type: 'string',
        },
        kinetic_parameters: {
          title: 'Kinetic Parameters',
          description: 'Estimated kinetic parameters',
          allOf: [
            {
              $ref: '#/definitions/KineticParameters',
            },
          ],
        },
        inhibition_parameters: {
          title: 'Inhibition Parameters',
          description: 'Estimated inhibition parameters',
          allOf: [
            {
              $ref: '#/definitions/InhibitionParameters',
            },
          ],
        },
        activation_parameters: {
          title: 'Activation Parameters',
          description: 'Estimated activation parameters',
          allOf: [
            {
              $ref: '#/definitions/ActivationParameters',
            },
          ],
        },
      },
    },
  },
};
