import type {Path} from '@/utility/path';

/**
 * Interface that determines the index of a path in a data string and vice versa.
 * This is used to determine the cursor position in the code editor for a given path
 * and to determine the path for a given cursor position.
 */
export interface PathIndexLink {
  /**
   * Determines the index of the first character of the data at the given path.
   *
   * @param dataString the unparsed data
   * @param path       the path to determine the cursor position for
   */
  determineIndexOfPath(dataString: string, path: Path): number;

  /**
   * Determines the path for the data that is at the given index of the data string.
   *
   * @param dataString  the unparsed data
   * @param targetIndex the index in the data to determine the path for
   */
  determinePathFromIndex(dataString: string, targetIndex: number): Path;
}

/**
 * Implementation of PathIndexLink that always returns 0 for the index and an empty path.
 */
export const noPathIndexLink: PathIndexLink = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  determineIndexOfPath(dataString: string, path: Path): number {
    return 0;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  determinePathFromIndex(dataString: string, targetIndex: number): Path {
    return [];
  },
};
