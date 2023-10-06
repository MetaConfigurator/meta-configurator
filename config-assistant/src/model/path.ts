/**
 * Represents an element of a path.
 * This is a string for object keys and a number for array indices.
 */
export type PathElement = string | number;
/**
 * Represents a path to a value in a JSON object.
 */
export type Path = Array<PathElement>;
