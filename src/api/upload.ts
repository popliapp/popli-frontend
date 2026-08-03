import * as FileSystem from 'expo-file-system/legacy';
import { apiClient, BASE_URL } from './client';
import { useAuthStore } from '../store/authStore';

export const uploadImageToCloudinary = async (
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

  const token = useAuthStore.getState().token;

  const uploadRes = await FileSystem.uploadAsync(
    `${BASE_URL}/upload/image?folder=${folder}`,
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: contentType,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    throw new Error(`Image upload failed with status ${uploadRes.status}`);
  }

  const data = JSON.parse(uploadRes.body);

  if (!data.url) {
    throw new Error('Upload response missing url field');
  }

  return data.url;
};