import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './client';

export const uploadImageToR2 = async (
  fileUri: string,
  folder: string = 'general',
): Promise<string> => {
  const filename = fileUri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  const contentType = mimeMap[ext] || 'image/jpeg';

  const presignRes = await apiClient.get('/upload/presign', {
    params: { folder, filename, contentType },
  });

  const { uploadUrl, publicUrl } = presignRes.data;

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error('File does not exist at URI: ' + fileUri);

  const uploadRes = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
  });

  if (uploadRes.status !== 200) {
    throw new Error(`R2 upload failed with status ${uploadRes.status}`);
  }

  return publicUrl;
};