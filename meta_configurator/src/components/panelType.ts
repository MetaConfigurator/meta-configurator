import CodeEditorPanel from '@/components/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/gui-editor/GuiEditorPanel.vue';

export enum PanelType {
  GuiEditor = 'gui_editor',
  TextEditor = 'text_editor',
}

export function getComponentByPanelType(panelType: PanelType) {
  switch (panelType) {
    case PanelType.GuiEditor:
      return GuiEditorPanel;
    case PanelType.TextEditor:
      return CodeEditorPanel;
  }
  throw new Error(`Unknown panel type: ${panelType}`);
}
