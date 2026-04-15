import {generateSparqlSuggestion} from '@/utility/ai/aiEndpoint';
import {trimDataToMaxSize} from '@/utility/trimData';
import {getDataForMode} from '@/data/useDataLink';
import {useErrorService} from '@/utility/errorServiceInstance';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {SessionMode} from '@/store/sessionMode';
import {rdfStoreManager} from '@/components/panels/rdf/rdfStoreManager';
import type {Ref} from 'vue';

export const USER_COMMENTS_PLACEHOLDER = `Describe the query you want. For example:
What is the average age of all people?`;

function buildPrefixBlock(namespaces: Record<string, string>): string {
  return Object.entries(namespaces)
    .filter(([prefix]) => prefix !== '@vocab')
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join('\n');
}

async function suggestSparql(
  userComments: string,
  enableVisualization: boolean
): Promise<{config: string; success: boolean; message: string}> {
  const inputDataSubset = trimDataToMaxSize(getDataForMode(SessionMode.DataEditor).data.value);
  const apiKey = getApiKey();
  const inputDataSubsetStr = JSON.stringify(inputDataSubset);

  const responseStr = await generateSparqlSuggestion(
    apiKey,
    inputDataSubsetStr,
    userComments,
    buildPrefixBlock(rdfStoreManager.namespaces.value),
    enableVisualization
  );

  try {
    const fixedExpression = fixGeneratedExpression(responseStr, ['sparql']);
    return {
      config: fixedExpression,
      success: true,
      message: 'Data mapping suggestion generated successfully.',
    };
  } catch {
    return {
      config: responseStr,
      success: false,
      message:
        'Failed to generate data mapping suggestion. Please check the console for more details.',
    };
  }
}

export function useSparqlAiAssistant(options: {
  isLoading: Ref<boolean>;
  userComments: Ref<string>;
  enableVisualization: Ref<boolean>;
  setEditorText: (text: string, applyPrefixes?: boolean) => void;
  closeAiAccordion: () => void;
}) {
  const suggestSparqlQuery = async () => {
    options.isLoading.value = true;
    try {
      const res = await suggestSparql(
        options.userComments.value,
        options.enableVisualization.value
      );
      options.setEditorText(res.config.trimStart(), false);
      options.closeAiAccordion();
    } catch (error) {
      useErrorService().onError(error);
    } finally {
      options.isLoading.value = false;
    }
  };

  return {
    suggestSparqlQuery,
  };
}
