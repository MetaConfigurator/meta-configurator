import type {SettingsInterfaceRoot} from "@/settings/settingsTypes";

export function getColorForMode(mode: string, settings: SettingsInterfaceRoot): string {
    const settingsAsAny: any = settings
  return settingsAsAny.uiColors[mode];
}