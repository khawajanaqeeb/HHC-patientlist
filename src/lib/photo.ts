// Photo utility functions for staff and patient photo management
// Bucket: 'staff-photos' or 'patient-photos'
// All storage operations use the service-role Supabase client from db context

import { createClient } from '@supabase/supabase-js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 60 minutes

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Returns an error message string if invalid, or null if valid. */
export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, or WebP images are allowed.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Image must be 2 MB or smaller.';
  }
  return null;
}

/** Uploads a photo to the given bucket. Returns the storage path. */
export async function uploadPhoto(
  bucket: string,
  entityId: string,
  file: File
): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${entityId}.${ext}`;
  const db = getSupabase();
  const { error } = await db.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/** Generates a signed URL for a photo path. Valid for 60 minutes. */
export async function getSignedPhotoUrl(
  bucket: string,
  path: string
): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data?.signedUrl) throw new Error(`Failed to generate signed URL: ${error?.message || 'unknown error'}`);
  return data.signedUrl;
}

/** Deletes a photo from storage. */
export async function deletePhoto(bucket: string, path: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Failed to delete photo: ${error.message}`);
}

/** Returns a map of path -> signed URL for a list of paths. Skips nulls/empties. */
export async function getBatchSignedPhotoUrls(
  bucket: string,
  paths: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const validPaths = [...new Set(paths.filter((p): p is string => !!p))];
  if (!validPaths.length) return {};

  const db = getSupabase();
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrls(validPaths, SIGNED_URL_EXPIRY_SECONDS);
  if (error) throw new Error(`Failed to generate signed URLs: ${error.message}`);

  const result: Record<string, string> = {};
  for (const item of data || []) {
    if (item.path && item.signedUrl) {
      result[item.path] = item.signedUrl;
    }
  }
  return result;
}
