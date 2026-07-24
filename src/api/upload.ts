import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './client';

export const uploadToCloudinary = async (fileUri: string, mediaType: 'image' | 'video' | 'raw', folder: string = 'general'): Promise<string> => {
  try {
    // 1. Get signature from backend
    const sigRes = await apiClient.get(`/upload/signature?folder=${folder}`);
    const { timestamp, signature, cloudName, apiKey } = sigRes.data;

    // 3. Upload directly to Cloudinary using FileSystem
    const resourceType = mediaType === 'raw' ? 'raw' : mediaType === 'video' ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      fileUri,
      {
        httpMethod: 'POST',
        // @ts-ignore
        uploadType: 1, // FileSystemUploadType.MULTIPART
        fieldName: 'file',
        parameters: {
          api_key: String(apiKey || ''),
          timestamp: String(timestamp || ''),
          signature: String(signature || ''),
          folder: String(folder || '')
        }
      }
    );

    const uploadRes = await uploadTask.uploadAsync();

    if (!uploadRes || uploadRes.status !== 200) {
      console.error('[UPLOAD] Cloudinary response:', uploadRes?.body);
      throw new Error(`Cloudinary error: ${uploadRes?.status}`);
    }

    const data = JSON.parse(uploadRes.body);
    if (!data || !data.secure_url) {
      throw new Error('Cloudinary upload failed: Missing secure_url in response');
    }

    console.log(`[UPLOAD] Success! URL: ${data.secure_url}`);
    return data.secure_url;
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error?.response?.data || error.message || error);
    throw new Error(error?.response?.data?.error?.message || error.message || 'Failed to upload file');
  }
};
