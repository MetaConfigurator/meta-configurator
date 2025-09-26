// validation.worker.ts
// This file should be placed in your public folder or configured to be built as a separate worker

import {getMatchingAjvVersion, getTopLevelSchemaId} from '@/schema/validationUtils';

interface ValidationWorkerMessage {
  type: 'VALIDATE';
  data: any;
  schema: any;
  taskId: string;
}

interface ValidationWorkerResponse {
  type: 'VALIDATION_COMPLETE' | 'VALIDATION_ERROR';
  result?: any;
  error?: string;
  taskId: string;
}

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {ValidationResult} from '@/schema/validationUtils';

self.onmessage = function (e: MessageEvent<ValidationWorkerMessage>) {
  const {type, data, schema, taskId} = e.data;

  if (type === 'VALIDATE') {
    try {
      const ajv = getMatchingAjvVersion(schema);
      addFormats(ajv);
      const topLevelSchemaId = getTopLevelSchemaId(schema);
      ajv.addSchema(schema, topLevelSchemaId);
      const validationFunction = ajv.getSchema(topLevelSchemaId);

      if (!validationFunction) {
        const response: ValidationWorkerResponse = {
          type: 'VALIDATION_ERROR',
          error: 'Invalid schema provided',
          taskId: taskId,
        };

        self.postMessage(response);
        return;
      }
      validationFunction(data);
      const errors = validationFunction.errors || [];
      if (errors.length > 0) {
        console.debug('Validation errors:', errors);
      }
      const result = new ValidationResult(errors);

      const response: ValidationWorkerResponse = {
        type: 'VALIDATION_COMPLETE',
        result: result,
        taskId: taskId,
      };

      self.postMessage(response);
    } catch (error) {
      const response: ValidationWorkerResponse = {
        type: 'VALIDATION_ERROR',
        error: error instanceof Error ? error.message : 'Unknown validation error',
        taskId: taskId,
      };

      self.postMessage(response);
    }
  }
};

// Handle worker errors
self.onerror = function (error) {
  console.error('Worker error:', error);
};
