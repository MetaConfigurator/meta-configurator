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
  faTrashArrowUp,
  faEye,
  faDiagramProject,
  faGear,
  faCode,
  faWrench,
  faFileImport,
  faTable,
  faCircleNodes,
  faFileExport,
  faTrash,
  faPlus,
  faInfo,
  faRobot,
  faXmark,
  faBug,
  faListUl,
  faFileCode,
  faShare,
  faScissors,
  faBook,
} from '@fortawesome/free-solid-svg-icons';
import {
  faFile,
  faCircleCheck,
  faFloppyDisk as faFloppyDiskRegular,
  faFolderOpen as faFolderOpenRegular,
  faEye as faEyeRegular,
  faFileCode as faFileCodeRegular,
} from '@fortawesome/free-regular-svg-icons';

/**
 * Registers all icons used in the application.
 */
export function registerIcons() {
  library.add(faBars);
  library.add(faFile);
  library.add(faFileExport);
  library.add(faFileCirclePlus);
  library.add(faFloppyDisk);
  library.add(faFloppyDiskRegular);
  library.add(faFolderOpen);
  library.add(faFolderOpenRegular);
  library.add(faFileImport);
  library.add(faRotateLeft);
  library.add(faRotateRight);
  library.add(faShareNodes);
  library.add(faDownload);
  library.add(faGears);
  library.add(faGear);
  library.add(faDatabase);
  library.add(faGlobe);
  library.add(faMagicWandSparkles);
  library.add(faFileCode);
  library.add(faCog);
  library.add(faCircleInfo);
  library.add(faFontAwesome);
  library.add(faSearch);
  library.add(faTriangleExclamation);
  library.add(faTrashArrowUp);
  library.add(faEye);
  library.add(faEyeRegular);
  library.add(faDiagramProject);
  library.add(faCode);
  library.add(faWrench);
  library.add(faCircleCheck);
  library.add(faTable);
  library.add(faCircleNodes);
  library.add(faTrash);
  library.add(faPlus);
  library.add(faInfo);
  library.add(faRobot);
  library.add(faXmark);
  library.add(faBug);
  library.add(faListUl);
  library.add(faFileCode);
  library.add(faFileCodeRegular);
  library.add(faShare);
  library.add(faScissors);
  library.add(faBook);
}
