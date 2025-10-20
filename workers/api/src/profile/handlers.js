/**
 * Profile Business Logic Handlers
 */

import { binaryResponse, errorResponse } from '../utils/response.js';

function validateProfileData(data) {
  const errors = [];

  if (data.display_name !== undefined) {
    if (typeof data.display_name !== 'string') {
      errors.push('display_name must be a string');
    } else if (data.display_name.length < 1 || data.display_name.length > 100) {
      errors.push('display_name must be 1-100 characters');
    }
  }

  if (data.bio !== undefined) {
    if (typeof data.bio !== 'string') {
      errors.push('bio must be a string');
    } else if (data.bio.length > 500) {
      errors.push('bio must be 500 characters or less');
    }
  }

  if (data.location !== undefined) {
    if (typeof data.location !== 'string') {
      errors.push('location must be a string');
    } else if (data.location.length > 100) {
      errors.push('location must be 100 characters or less');
    }
  }

  if (data.website !== undefined) {
    if (typeof data.website !== 'string') {
      errors.push('website must be a string');
    } else if (data.website.length > 200) {
      errors.push('website must be 200 characters or less');
    } else if (data.website && !data.website.match(/^https?:\/\/.+/)) {
      errors.push('website must be a valid URL');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return {
    display_name: data.display_name?.trim(),
    bio: data.bio?.trim() || null,
    location: data.location?.trim() || null,
    website: data.website?.trim() || null,
  };
}

export async function getProfile(userId, env) {
  const user = await env.DB
    .prepare(`
      SELECT id, email, display_name, avatar_url, bio, location, website, 
             role, email_verified, created_at, updated_at
      FROM users 
      WHERE id = ?
    `)
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function updateProfile(userId, data, env) {
  const validated = validateProfileData(data);

  const updates = [];
  const params = [];

  if (validated.display_name !== undefined) {
    updates.push('display_name = ?');
    params.push(validated.display_name);
  }

  if (validated.bio !== undefined) {
    updates.push('bio = ?');
    params.push(validated.bio);
  }

  if (validated.location !== undefined) {
    updates.push('location = ?');
    params.push(validated.location);
  }

  if (validated.website !== undefined) {
    updates.push('website = ?');
    params.push(validated.website);
  }

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  updates.push('updated_at = ?');
  params.push(Math.floor(Date.now() / 1000));
  params.push(userId);

  await env.DB
    .prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `)
    .bind(...params)
    .run();

  return await getProfile(userId, env);
}

export async function uploadProfilePhoto(userId, photo, env) {
  if (!photo || !photo.type) {
    throw new Error('Invalid file upload');
  }

  const allowedTypes = env.ALLOWED_PHOTO_TYPES.split(',');
  if (!allowedTypes.includes(photo.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  const maxSize = env.MAX_PHOTO_SIZE;
  if (photo.size > maxSize) {
    throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }

  const formData = new FormData();
  formData.append('file', photo);
  
  const metadata = JSON.stringify({
    userId: userId,
    uploadedAt: new Date().toISOString(),
  });
  formData.append('metadata', metadata);
  
  const imageId = `profile-${userId}-${Date.now()}`;
  formData.append('id', imageId);

  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_IMAGES_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Cloudflare Images upload error:', error);
    throw new Error('Failed to upload photo');
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error('Failed to upload photo to Cloudflare Images');
  }

  const imageUrl = result.result.variants[0];

  await env.DB
    .prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?')
    .bind(imageUrl, Math.floor(Date.now() / 1000), userId)
    .run();

  return {
    message: 'Photo uploaded successfully',
    url: imageUrl,
    imageId: result.result.id,
    variants: result.result.variants,
  };
}

export async function getProfilePhoto(userId, env) {
  const user = await env.DB
    .prepare('SELECT avatar_url FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user || !user.avatar_url) {
    return errorResponse('Photo not found', 404);
  }

  return Response.redirect(user.avatar_url, 302);
}
