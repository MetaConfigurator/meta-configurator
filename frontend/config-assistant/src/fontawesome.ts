/* import the fontawesome core */
import {library} from '@fortawesome/fontawesome-svg-core';

/* import specific icons */
import {
  faBars,
  faCircleInfo,
  faCog,
  faDatabase,
  faFileCirclePlus,
  faFloppyDisk,
  faFolderOpen,
  faFontAwesome,
  faGears,
  faGlobe,
  faMagicWandSparkles,
  faRotateLeft,
  faRotateRight,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons';
import {
  faFile,
  faFileCode,
  faFloppyDisk as faFloppyDiskRegular,
  faFolderOpen as faFolderOpenRegular,
} from '@fortawesome/free-regular-svg-icons';

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
  library.add(faGears);
  library.add(faDatabase);
  library.add(faGlobe);
  library.add(faMagicWandSparkles);
  library.add(faFileCode);
  library.add(faCog);
  library.add(faCircleInfo);
  library.add(faFontAwesome);
}
