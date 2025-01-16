import type {SessionMode} from '@/store/sessionMode';

/**
 * Definition of a panel type.
 */
export interface PanelTypeDefinition {
  getComponent(): any;

  supportedModes: SessionMode[];
  label: string;
  icon: string;
  name: string;
}
