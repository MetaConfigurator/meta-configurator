import CodeEditorPanel from '@/components/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/gui-editor/GuiEditorPanel.vue';
import SchemaDiagramPanel from '@/components/schema-diagram/SchemaDiagramPanel.vue';

export enum PanelType {
  GuiEditor = 'gui_editor',
  TextEditor = 'text_editor',
  SchemaDiagram = 'schema_diagram',
}

export function getComponentByPanelType(panelType: PanelType) {
  switch (panelType) {
    case PanelType.GuiEditor:
      return GuiEditorPanel;
    case PanelType.TextEditor:
      return CodeEditorPanel;
    case PanelType.SchemaDiagram:
      return SchemaDiagramPanel;
  }
  throw new Error(`Unknown panel type: ${panelType}`);
}
