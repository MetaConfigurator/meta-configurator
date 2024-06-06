import CodeEditorPanel from '@/components/panels/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/panels/gui-editor/GuiEditorPanel.vue';
import SchemaDiagramPanel from '@/components/panels/schema-diagram/SchemaDiagramPanel.vue';
import DebugPanel from '@/components/panels/debug-panel/DebugPanel.vue';
import {errorService} from "@/main";

export enum PanelType {
  GuiEditor = 'guiEditor',
  TextEditor = 'textEditor',
  SchemaDiagram = 'schemaDiagram',
  Debug = 'debug',
}

export function getComponentByPanelType(panelType: PanelType) {
  switch (panelType) {
    case PanelType.GuiEditor:
      return GuiEditorPanel;
    case PanelType.TextEditor:
      return CodeEditorPanel;
    case PanelType.SchemaDiagram:
      return SchemaDiagramPanel;
    case PanelType.Debug:
      return DebugPanel;
  }
  errorService.onError(new Error(`Unknown panel type: ${panelType}`));
  return CodeEditorPanel;
}
