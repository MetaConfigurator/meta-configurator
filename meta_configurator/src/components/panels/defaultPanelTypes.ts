import type {PanelTypeDefinition} from '@/components/panels/panelTypeDefinition';
import {SessionMode} from '@/store/sessionMode';
import {panelTypeRegistry} from '@/components/panels/panelTypeRegistry';
import CodeEditorPanel from '@/components/panels/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/panels/gui-editor/GuiEditorPanel.vue';
import SchemaDiagramPanel from '@/components/panels/schema-diagram/SchemaDiagramPanel.vue';
import DebugPanel from '@/components/panels/debug-panel/DebugPanel.vue';
import AiPromptsPanel from '@/components/panels/ai-prompts/AiPromptsPanel.vue';
import ListAnalysisPanel from './list-analysis/ListAnalysisPanel.vue';
import TestPanel from '@/components/panels/test-panel/TestPanel.vue';
import DocumentationPanel from '@/components/panels/documentation/DocumentationPanel.vue';

export const panelTypeTextEditor: PanelTypeDefinition = {
  getComponent: () => CodeEditorPanel,
  supportedModes: [SessionMode.DataEditor, SessionMode.SchemaEditor, SessionMode.Settings],
  label: 'Text Editor',
  icon: 'fa-solid fa-code',
  name: 'textEditor',
};

export const panelTypeGuiEditor: PanelTypeDefinition = {
  getComponent: () => GuiEditorPanel,
  supportedModes: [SessionMode.DataEditor, SessionMode.SchemaEditor, SessionMode.Settings],
  label: 'GUI Editor',
  icon: 'fa-solid fa-list-ul',
  name: 'guiEditor',
};

export const panelTypeSchemaDiagram: PanelTypeDefinition = {
  getComponent: () => SchemaDiagramPanel,
  supportedModes: [SessionMode.SchemaEditor],
  label: 'Schema Diagram',
  icon: 'fa-solid fa-project-diagram',
  name: 'schemaDiagram',
};

export const panelTypeAiPrompts: PanelTypeDefinition = {
  getComponent: () => AiPromptsPanel,
  supportedModes: [SessionMode.DataEditor, SessionMode.SchemaEditor, SessionMode.Settings],
  label: 'AI Prompts',
  icon: 'fa-solid fa-robot',
  name: 'aiPrompts',
};

export const panelTypeListAnalysis: PanelTypeDefinition = {
  getComponent: () => ListAnalysisPanel,
  supportedModes: [SessionMode.DataEditor],
  label: 'Table View',
  icon: 'fa-solid fa-table',
  name: 'tableView',
};

export const panelTypeDebug: PanelTypeDefinition = {
  getComponent: () => DebugPanel,
  supportedModes: [SessionMode.DataEditor, SessionMode.SchemaEditor, SessionMode.Settings],
  label: 'Debug',
  icon: 'fa-solid fa-bug',
  name: 'debug',
};

export const panelTypeTest: PanelTypeDefinition = {
  getComponent: () => TestPanel,
  supportedModes: [SessionMode.DataEditor, SessionMode.SchemaEditor, SessionMode.Settings],
  label: 'Test (for automated E2E Testing, not for human use)',
  icon: 'fa-solid fa-bug',
  name: 'test',
};

export const panelTypeDocementation: PanelTypeDefinition = {
  getComponent: () => DocumentationPanel,
  supportedModes: [SessionMode.SchemaEditor],
  label: 'Markdown documentation of the schema',
  icon: 'fa-solid fa-book',
  name: 'documentation',
};

/**
 * Registers the default panel types, which are GuiEditor, TextEditor, Schema Diagram, Ai Prompts and Debug.
 */
export function registerDefaultPanelTypes() {
  panelTypeRegistry.registerPanelType('textEditor', panelTypeTextEditor);
  panelTypeRegistry.registerPanelType('guiEditor', panelTypeGuiEditor);
  panelTypeRegistry.registerPanelType('schemaDiagram', panelTypeSchemaDiagram);
  panelTypeRegistry.registerPanelType('aiPrompts', panelTypeAiPrompts);
  panelTypeRegistry.registerPanelType('tableView', panelTypeListAnalysis);
  panelTypeRegistry.registerPanelType('debug', panelTypeDebug);
  panelTypeRegistry.registerPanelType('test', panelTypeTest);
  panelTypeRegistry.registerPanelType('documentation', panelTypeDocementation);
}
