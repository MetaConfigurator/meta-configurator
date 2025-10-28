import {useSettings} from '@/settings/useSettings';
import {useErrorService} from '@/utility/errorServiceInstance';

const settings = useSettings();

export async function findSuggestionsForSearchTerm(
  searchTerm: string,
  prefix?: string,
  mustBeClassOrProperty: boolean = true
) {
  const endpointUrl = settings.value.rdf.sparqlEndpointUrl;

  try {
    let results = await performSparqlQueryForSearchTerm(
      endpointUrl,
      searchTerm,
      prefix,
      mustBeClassOrProperty
    );
    if (prefix) {
      results = results.map((result: string) => {
        return result.replace(prefix, '');
      });
    }
    return results;
  } catch (error) {
    useErrorService().onError(error);
    return [];
  }
}

async function performSparqlQueryForSearchTerm(
  endpointUrl: string,
  searchTerm: string,
  prefix: string | undefined,
  mustBeClassOrProperty: boolean = true
) {
  const prefixFilter = prefix ? `STRSTARTS(STR(?subject), "${prefix}") &&` : '';
  const classOrPropertyFilter = mustBeClassOrProperty
    ? `(?type = <http://www.w3.org/2002/07/owl#Class> || ?type = <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property>) &&`
    : '';
  const query = `
    SELECT DISTINCT ?subject
    WHERE {
      ?subject a ?type .
      FILTER (
        ${prefixFilter}
        ${classOrPropertyFilter}
        regex(str(?subject), "${searchTerm}", "i")
      )
    }
    ORDER BY STRLEN(REPLACE(STR(?subject), "${searchTerm}", ""))
    LIMIT 20
  `;

  const url = `${endpointUrl}?query=${encodeURIComponent(query)}&format=json`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.bindings.map((binding: any) => {
    return binding.subject.value;
  });
}
