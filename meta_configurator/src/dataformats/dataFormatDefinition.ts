import type {DataConverter} from '@/dataformats/dataConverter';
import type {PathIndexLink} from '@/dataformats/pathIndexLink';

/**
 * Definition of a data format.
 * Contains the data converter and the path index link, while the latter is optional.
 */
export interface DataFormatDefinition {
  /**
   * The file name extensions of this data format, each with a leading dot.
   * They identify the format of an uploaded file and build file dialog filters.
   */
  fileExtensions: string[];

  /**
   * The data converter for this data format.
   */
  dataConverter: DataConverter;

  /**
   * The path index link for this data format.
   * Implementations of this interface can choose to return null if they do not support this feature.
   * This will result in the editor not linking the position of the cursor in the code editor
   * to the path in the tree view and vice versa.
   */
  pathIndexLink: PathIndexLink | null;
}
