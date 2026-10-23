import {useSettings} from '@/settings/useSettings';
import {getApiKey} from '@/utility/ai/apiKey';

export const AI_ACCESS_UNAVAILABLE_MESSAGE =
  'AI access is not configured. Please configure an API endpoint or relay first.';

/**
 * Returns whether the configured AI backend can be queried with the current
 * browser-side credential. The Uni Stuttgart relay may hold the provider key
 * server-side, so an empty browser API key is valid for relay configurations.
 */
export function canQueryAi(apiKey: string = getApiKey()): boolean {
  const backend = useSettings().value.aiIntegration.backend;
  return 'relay' in backend || apiKey.trim().length > 0;
}
