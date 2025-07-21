import type {PanelTypeDefinition} from '@/components/panels/panelTypeDefinition';

/**
 * The panel type registry serves as a central place to register and retrieve panel types,
 * which contain the required information to load a panel type and which modes can use a certain panel type.
 *
 * @see DataFormatDefinition
 */
export class PanelTypeRegistry {
  private readonly types: Map<string, PanelTypeDefinition> = new Map();

  public registerPanelType(name: string, definition: PanelTypeDefinition): void {
    this.types.set(name, definition);
  }

  /**
   * Returns the panel type definition for the given panel type name.
   * @param name the name of the panel type
   * @return the panel type definition. If the panel type is not registered, the text editor definition is returned.
   */
  public getPanelTypeDefinition(name: string): PanelTypeDefinition {
    const type = this.types.get(name);
    if (type === undefined) {
      return this.types.get('textEditor')!; // we use textEditor as fallback to avoid errors
    }
    return type;
  }

  public getPanelTypeNames(): string[] {
    return Array.from(this.types.keys());
  }
}

/**
 * The global panel type definition registry.
 * This is used to register and retrieve data formats.
 */
export const panelTypeRegistry = new PanelTypeRegistry();
