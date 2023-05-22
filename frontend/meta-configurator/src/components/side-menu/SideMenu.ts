import IconSettings from '@/components/icons/IconSettings.vue';
import IconSchemaFile from '@/components/icons/IconSchemaFile.vue';
import IconEditor from '@/components/icons/IconEditor.vue';
import { markRaw } from 'vue';

export class MenuItem {
  public name: string;
  public icon: typeof IconSchemaFile; // vue component, not sure how to type this
  public path: string;

  constructor(name: string, icon: typeof IconSchemaFile, path: string) {
    this.name = name;
    this.icon = icon;
    this.path = path;
  }
}

/**
 * Controller for the side menu component.
 */
export class SideMenuController {
  public selectedIndex = 0;
  public open = false;

  public menuItems: MenuItem[] = [
    {
      name: 'File',
      icon: markRaw(IconEditor),
      path: '/',
    },
    {
      name: 'Schema',
      icon: markRaw(IconSchemaFile),
      path: '/schema',
    },
    {
      name: 'Settings',
      icon: markRaw(IconSettings),
      path: '/settings',
    },
  ];

  public isSelectedItem(index: number): boolean {
    return index === this.selectedIndex;
  }

  public get selectedItem(): MenuItem {
    return this.menuItems[this.selectedIndex];
  }

  public selectItem(index: number): void {
    this.selectedIndex = index;
  }

  public toggle(): void {
    this.open = !this.open;
  }

  public get closed(): boolean {
    return !this.open;
  }
}
