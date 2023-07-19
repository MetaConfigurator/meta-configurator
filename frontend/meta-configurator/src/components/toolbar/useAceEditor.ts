// useAceEditor.ts
import {ref} from 'vue';
import type {Ref} from 'vue';

export const editor: Ref<any> = ref(null);

export function useAceEditor() {
  return {
    editor,
  };
}
