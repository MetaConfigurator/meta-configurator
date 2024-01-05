import type {Ref} from 'vue';

export interface UndoManager {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
}
