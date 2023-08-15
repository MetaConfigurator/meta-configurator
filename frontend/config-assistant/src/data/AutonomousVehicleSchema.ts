import type {TopLevelSchema} from '@/model/JsonSchemaType';

export const AUTONOMOUS_VEHICLE_SCHEMA: TopLevelSchema = {
  $schema: 'http://json-schema.org/draft/2020-12/schema',
  title: 'Self-Driving Vehicle',
  description: 'A JSON schema for configuration of autonomous vehicles',
  type: 'object',
  properties: {
    SelfDrivingVehicle: {
      type: 'object',
      properties: {
        StartLocation: {
          type: 'object',
          description: 'The starting location of the self-driving vehicle.',
          properties: {
            x: {
              type: 'number',
              description: 'X-coordinate of the starting location.',
            },
            y: {
              type: 'number',
              description: 'Y-coordinate of the starting location.',
            },
          },
          required: ['x', 'y'],
          additionalProperties: false,
        },
        PlanningAlgorithm: {
          type: 'string',
          description: 'The algorithms used for route planning.',
          enum: ['A* search', 'Dijkstra', 'Rapidly Random Tree (RRT)'],
        },
        SensorSet: {
          type: 'object',
          description: 'Set of sensors installed on the self-driving vehicle.',
          properties: {
            Radar: {
              type: 'array',
              description: 'Array of radar sensor properties.',
              items: {
                type: 'object',
                properties: {
                  SensorName: {
                    type: 'string',
                    description: 'Name of the radar sensor.',
                    pattern: '^Radar_Sensor(0[1-9]|1[0-9]|20)$',
                  },
                  SensorRange: {
                    type: 'number',
                    description: 'Maximum range of the sensor. Unit in mm',
                    examples: ['400'],
                  },
                  SensorPosition: {
                    type: 'object',
                    description: "Position of the radar sensor relative to the vehicle's center.",
                    properties: {
                      x: {
                        type: 'number',
                        description: 'X-coordinate position.',
                      },
                      y: {
                        type: 'number',
                        description: 'Y-coordinate position.',
                      },
                    },
                    required: ['x', 'y'],
                  },
                },
                required: ['name', 'range', 'position'],
                additionalProperties: false,
              },
            },
            Lidar: {
              type: 'array',
              description: 'Array of lidar sensor properties.',
              items: {
                $ref: '#/properties/SelfDrivingVehicle/properties/SensorSet/properties/Radar/items',
              },
            },
            Ultrasonic: {
              type: 'array',
              description: 'Array of ultrasonic sensor properties.',
              items: {
                $ref: '#/properties/SelfDrivingVehicle/properties/SensorSet/properties/Radar/items',
              },
            },
          },
          additionalProperties: false,
        },
        VehicleType: {
          type: 'string',
          description: 'Levels of the Self-driving vehicle.',
          enum: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'],
        },
        PassengerCapacity: {
          type: 'integer',
          description: 'Maximum number of passengers the vehicle can carry.',
          minimum: 1,
          maximum: 10,
          exclusiveMaximum: true,
        },
        MaxSpeed: {
          type: 'integer',
          description: 'Maximum speed of the vehicle.',
          minimum: 0,
          maximum: 480,
        },
        'is4-Wheel-Drive': {
          type: 'boolean',
          description: 'if the car is a 4 wheel driven model',
        },
        ProducedIn: {
          type: 'string',
          const: 'Germany',
        },
      },
      required: ['StartingLocation', 'PlanningAlgorithm', 'SensorSet', 'VehicleType'],
    },
    Environment: {
      type: 'object',
      properties: {
        Weather: {
          type: 'string',
          description: 'Current weather conditions',
          enum: ['sunny', 'rainy', 'cloudy'],
        },
        Temperature: {
          type: 'number',
          description: 'Current temperature in Celsius.',
        },
        Humidity: {
          type: 'integer',
          description: 'Relative humidity as a percentage.',
          minimum: 0,
          maximum: 100,
        },
      },
      required: ['Weather'],
      additionalProperties: true,
    },
    Vehicles: {
      type: 'object',
      properties: {
        VehicleType: {
          $ref: '#/properties/SelfDrivingVehicle/properties/VehicleType',
        },
        PathToDrive: {
          type: 'array',
          description: "List of coordinates representing the vehicle's path.",
          items: {
            type: 'object',
            properties: {
              x: {
                type: 'number',
                description: 'X-coordinate of the point.',
                minimum: 0,
              },
              y: {
                type: 'number',
                description: 'Y-coordinate of the point.',
                minimum: 0,
              },
            },
            required: ['x', 'y'],
          },
          additionalProperties: false,
        },
        DrivingSpeed: {
          type: 'number',
          description: 'Average driving speed of the vehicle.',
          minimum: 0,
          maximum: 480,
        },
        FuelType: {
          type: 'string',
          description: 'Type of fuel used by the vehicle.',
          enum: ['Gasoline', 'Diesel', 'Electric', 'Gas'],
        },
      },
      required: ['VehicleType', 'PathToDrive', 'DrivingSpeed'],
    },
    Pedestrians: {
      type: 'array',
      description: 'Array of pedestrian objects.',
      items: {
        type: 'object',
        properties: {
          Distribution: {
            type: 'string',
            description: 'Distribution of pedestrians in the area.',
            enum: ['even', 'sparse', 'dense'],
          },
          Count: {
            type: 'integer',
            description: 'Number of pedestrians.',
          },
          AgeGroup: {
            type: 'string',
            description: 'Age group of pedestrians.',
            enum: ['child', 'adult', 'elderly'],
          },
        },
        required: ['Distribution', 'Count'],
      },
    },
    SimulationSettings: {
      type: 'object',
      properties: {
        TimeUnit: {
          type: 'string',
          description: 'Time unit for simulation duration.',
          enum: ['seconds', 'minutes', 'hours'],
        },
        Duration: {
          type: 'number',
          description: 'Duration of the simulation in the specified time unit.',
          minimum: 0,
        },
        SimulationName: {
          type: 'string',
          description: 'Name of the simulation.',
          pattern: '^Sim_.',
        },
      },
      required: ['TimeUnit', 'Duration'],
      additionalProperties: false,
    },
  },
};
