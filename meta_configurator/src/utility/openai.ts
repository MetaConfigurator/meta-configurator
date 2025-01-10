import axios from 'axios';

const BASE_URL = 'https://api.openai.com/v1';

export const queryOpenAI = async (apiKey: string, messages: { role: 'system'|'user', content: string}[], model: string = 'gpt-4o-mini', max_tokens: number = 5000, temperature: number = 0.3, endpoint: string = '/chat/completions') => {
    try {
        const response = await axios.post(
            `${BASE_URL}/${endpoint}`,
            {
                model,
                messages,
                max_tokens: max_tokens,
                temperature: temperature,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        const resultSchema = response.data.choices[0].message.content;
        console.log("Result schema from AI prompt:", resultSchema, "based on messages:", messages);
        return resultSchema;
    } catch (error) {
        console.error('Error querying OpenAI:', error);
        throw error;
    }
};


export const querySchemaCreation = async (apiKey: string, schemaDescriptionNaturalLanguage: string, model: string = 'gpt-4o-mini', max_tokens: number = 5000, temperature: number = 0.3, endpoint: string = '/chat/completions') => {
    const systemMessage = `Create a JSON schema based on the schema description by the user. Return no other text than a fully valid JSON schema document.`;
    return queryOpenAI(apiKey, [{role: 'system', content: systemMessage}, {role: 'user', content: schemaDescriptionNaturalLanguage}], model, max_tokens, temperature, endpoint);
}

export const querySchemaModification = async (apiKey: string, schemaChangeDescriptionNaturalLanguage: string, fullSchema: string, model: string = 'gpt-4o-mini', max_tokens: number = 5000, temperature: number = 0.3, endpoint: string = '/chat/completions') => {
    const systemMessage = `Modify the provided JSON schema based on the schema change description by the user. Return no other text than a fully valid JSON schema document. The schema to modify is: ${fullSchema}`;
    return queryOpenAI(apiKey, [{role: 'system', content: systemMessage}, {role: 'user', content: schemaChangeDescriptionNaturalLanguage}], model, max_tokens, temperature, endpoint);
}