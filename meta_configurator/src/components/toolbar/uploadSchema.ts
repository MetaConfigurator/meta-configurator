import {SessionMode} from '@/store/sessionStore';
import {openUploadFileDialog} from '@/components/toolbar/uploadFile';
import {getDataLinkForMode} from '@/data/useDataLink';

/**
 * Opens a file dialog to select a file to upload.
 */
export function openUploadSchemaDialog(): void {
  return openUploadFileDialog(getDataLinkForMode(SessionMode.SchemaEditor));
}
