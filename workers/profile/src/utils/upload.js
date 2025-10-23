/**
 * File Upload Utilities
 * Handles file validation, image processing, and R2 storage
 */

/**
 * Allowed file types for uploads
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Validate file upload
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = ALLOWED_IMAGE_TYPES,
  } = options;

  // Check file exists
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return true;
}

/**
 * Generate unique filename
 */
export function generateFilename(userId, originalName, prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = originalName.split('.').pop();

  return `${prefix}${userId}/${timestamp}-${random}.${extension}`;
}

/**
 * Upload file to R2
 */
export async function uploadToR2(bucket, key, file, metadata = {}) {
  try {
    await bucket.put(key, file, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    });

    return {
      key,
      url: `/uploads/${key}`,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(bucket, key) {
  try {
    await bucket.delete(key);
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * Get file from R2
 */
export async function getFromR2(bucket, key) {
  try {
    const object = await bucket.get(key);

    if (!object) {
      return null;
    }

    return {
      body: object.body,
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
    };
  } catch (error) {
    console.error('Failed to get file:', error);
    return null;
  }
}

/**
 * Parse multipart form data
 * Extracts files and fields from FormData
 */
export async function parseFormData(request) {
  try {
    const formData = await request.formData();
    const files = [];
    const fields = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push({
          name: key,
          file: value,
        });
      } else {
        fields[key] = value;
      }
    }

    return { files, fields };
  } catch (error) {
    throw new Error(`Failed to parse form data: ${error.message}`);
  }
}

/**
 * Validate image dimensions (optional, for future use)
 * Would require image processing library
 */
export function validateImageDimensions(width, height, options = {}) {
  const {
    minWidth = 100,
    minHeight = 100,
    maxWidth = 4096,
    maxHeight = 4096,
  } = options;

  if (width < minWidth || height < minHeight) {
    throw new Error(`Image too small. Minimum dimensions: ${minWidth}x${minHeight}px`);
  }

  if (width > maxWidth || height > maxHeight) {
    throw new Error(`Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}px`);
  }

  return true;
}

/**
 * Generate CDN URL for uploaded file
 */
export function getCDNUrl(key, env) {
  // For now, return the direct R2 URL
  // In production, this could use a CDN domain
  return `https://profile.cybersmrt.org/uploads/${key}`;
}

/**
 * Clean up old avatar when uploading new one
 */
export async function cleanupOldAvatar(bucket, userId, currentAvatarUrl) {
  if (!currentAvatarUrl) return;

  try {
    // Extract key from URL
    const urlParts = currentAvatarUrl.split('/uploads/');
    if (urlParts.length === 2) {
      const key = urlParts[1];
      await deleteFromR2(bucket, key);
    }
  } catch (error) {
    console.error('Failed to cleanup old avatar:', error);
  }
}
