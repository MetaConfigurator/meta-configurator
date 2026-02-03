import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';

export const CURRENT_NEWS_HEADER = 'Get in touch with us.';

// the current news for MetaConfigurator as a long html string
export const CURRENT_NEWS = `
<p>You are using MetaConfigurator? Please take 3 minutes for a <a href="https://forms.gle/MHKvrkMfdymH8TDs5" target="_blank" rel="noopener noreferrer">short survey to give us feedback or get in touch with us</a>!</p>
<p>We are interested in your ideas, your experiences, and feature requests.</p>
`;

function getCurrentNewsHash(): number {
  return simpleHash(CURRENT_NEWS);
}

export function hasCurrentNewsChanged(latestSeenNewsHash: number): boolean {
  return latestSeenNewsHash !== getCurrentNewsHash() && latestSeenNewsHash !== -1;
}

export function setCurrentNewsHash(settings: SettingsInterfaceRoot) {
  settings.latestNewsHash = getCurrentNewsHash();
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
