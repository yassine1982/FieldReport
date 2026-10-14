import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { PhotoCategory, Report, ReportPhoto } from '@/types/report';

export const MAX_PHOTOS_PER_REPORT = 10;

const PHOTOS_DIR_NAME = 'report-photos';

export function createPhotoId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `photo_${Date.now()}_${random}`;
}

function extensionFromUri(uri: string): string {
  const cleaned = uri.split('?')[0] ?? uri;
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleaned);
  if (!match?.[1]) {
    return 'jpg';
  }
  const ext = match[1].toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg' || ext === 'png' || ext === 'heic' || ext === 'webp') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

function photosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR_NAME);
}

export function ensurePhotosDirectory(): Directory {
  const dir = photosDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copy a picker/camera URI into persistent document storage.
 * On web (no durable document FS), returns the source URI unchanged.
 */
export async function persistPhotoFromUri(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  const dir = ensurePhotosDirectory();
  const filename = `${createPhotoId()}.${extensionFromUri(sourceUri)}`;
  const destination = new File(dir, filename);
  const source = new File(sourceUri);

  if (!source.exists) {
    throw new Error('Selected photo is no longer available.');
  }

  await source.copy(destination);

  if (!destination.exists) {
    throw new Error('Could not store the photo on this device.');
  }

  return destination.uri;
}

export async function deletePhotoFile(uri: string): Promise<void> {
  if (Platform.OS === 'web' || !uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Missing or unreadable files are non-fatal during cleanup.
  }
}

export async function deletePhotoFiles(uris: string[]): Promise<void> {
  const unique = [...new Set(uris.filter(Boolean))];
  await Promise.all(unique.map((uri) => deletePhotoFile(uri)));
}

export function collectReferencedPhotoUris(reports: Report[]): Set<string> {
  const uris = new Set<string>();
  for (const report of reports) {
    for (const photo of report.photos) {
      if (photo.uri) {
        uris.add(photo.uri);
      }
    }
  }
  return uris;
}

/**
 * Delete photo files only when no remaining report still references them.
 */
export async function deleteUnreferencedPhotoFiles(
  candidateUris: string[],
  reports: Report[],
): Promise<void> {
  if (candidateUris.length === 0) {
    return;
  }
  const referenced = collectReferencedPhotoUris(reports);
  const orphans = [...new Set(candidateUris)].filter((uri) => uri && !referenced.has(uri));
  await deletePhotoFiles(orphans);
}

export function buildReportPhoto(
  uri: string,
  category: PhotoCategory,
  caption?: string,
): ReportPhoto {
  const trimmedCaption = caption?.trim();
  return {
    id: createPhotoId(),
    uri,
    category,
    caption: trimmedCaption && trimmedCaption.length > 0 ? trimmedCaption : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function photoFileExists(uri: string): boolean {
  if (!uri) {
    return false;
  }
  if (Platform.OS === 'web') {
    return true;
  }
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
