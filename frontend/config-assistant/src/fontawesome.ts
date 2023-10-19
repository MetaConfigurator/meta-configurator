/* import the fontawesome core */
import {library} from '@fortawesome/fontawesome-svg-core';

/* import specific icons */
import {
  faBars,
  faCircleInfo,
  faCog,
  faDatabase,
  faDownload,
  faFileCirclePlus,
  faFloppyDisk,
  faFolderOpen,
  faFontAwesome,
  faGears,
  faGlobe,
  faMagicWandSparkles,
  faRotateLeft,
  faRotateRight,
  faSearch,
  faShareNodes,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import {
  faFile,
  faFileCode,
  faFloppyDisk as faFloppyDiskRegular,
  faFolderOpen as faFolderOpenRegular,
} from '@fortawesome/free-regular-svg-icons';

/**
 * Registers all icons used in the application.
 */
export function registerIcons() {
  library.add(faBars);
  library.add(faFile);
  library.add(faFileCirclePlus);
  library.add(faFloppyDisk);
  library.add(faFloppyDiskRegular);
  library.add(faFolderOpen);
  library.add(faFolderOpenRegular);
  library.add(faRotateLeft);
  library.add(faRotateRight);
  library.add(faShareNodes);
  library.add(faDownload);
  library.add(faGears);
  library.add(faDatabase);
  library.add(faGlobe);
  library.add(faMagicWandSparkles);
  library.add(faFileCode);
  library.add(faCog);
  library.add(faCircleInfo);
  library.add(faFontAwesome);
  library.add(faSearch);
  library.add(faTriangleExclamation);
}
