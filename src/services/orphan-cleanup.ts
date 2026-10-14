import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { COMPANY_PROFILE_STORAGE_KEY, LOGO_DIR_NAME } from '@/services/company-storage';
import { PDFS_DIR_NAME } from '@/services/pdf-storage';
import { PHOTOS_DIR_NAME } from '@/services/photo-storage';
import { REPORTS_STORAGE_KEY } from '@/services/reports-storage';
import { SIGNATURES_DIR_NAME } from '@/services/signature-storage';
import { isStorageOperationInProgress } from '@/services/storage-operation';

/**
 * Unreferenced photos, signatures, and logos older than this are eligible for
 * deletion. Newer files are kept so an in-progress capture is never removed.
 * Generated PDFs under `report-pdfs` are never part of this sweep.
 */
export const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

const CLEANABLE_DIRECTORIES = [PHOTOS_DIR_NAME, SIGNATURES_DIR_NAME, LOGO_DIR_NAME] as const;

/** Generated PDFs stay on disk for sharing even when no report stores their URI. */
export const RETAINED_DOCUMENT_DIRECTORIES = [PDFS_DIR_NAME] as const;

const NAMED_TIMESTAMP = /^(?:photo|sig|logo)_(\d{10,})/;

export type OrphanCleanupSkipReason = 'storage-read-failed' | 'in-progress';

export type OrphanCleanupResult = {
  deletedUris: string[];
  skippedReason?: OrphanCleanupSkipReason;
};

type StoredReferences = {
  uris: Set<string>;
};

type FileTimestamps = {
  name: string;
  modificationTime: number | null;
  creationTime: number | null;
  lastModified: number | null;
};

function timestampFromName(name: string): number | null {
  const match = NAMED_TIMESTAMP.exec(name);
  if (!match?.[1]) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Milliseconds since the newest known timestamp. Null when the age is unknown. */
export function fileRecencyMs(file: FileTimestamps, now: number): number | null {
  const stamps = [
    file.modificationTime,
    file.creationTime,
    file.lastModified,
    timestampFromName(file.name),
  ].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value) && value > 0,
  );

  if (stamps.length === 0) {
    return null;
  }
  return now - Math.max(...stamps);
}

function isReferenced(uri: string, name: string, referenced: Set<string>): boolean {
  if (referenced.has(uri)) {
    return true;
  }
  if (!name) {
    return false;
  }
  const suffix = `/${name}`;
  for (const candidate of referenced) {
    if (candidate === uri || candidate.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

function addUri(target: Set<string>, value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    target.add(trimmed);
  }
  return true;
}

function collectReportUris(parsed: unknown): Set<string> | null {
  if (!Array.isArray(parsed)) {
    return null;
  }
  const uris = new Set<string>();
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const report = entry as Record<string, unknown>;
    if (report.photos !== undefined && !Array.isArray(report.photos)) {
      return null;
    }
    if (Array.isArray(report.photos)) {
      for (const photo of report.photos) {
        if (typeof photo !== 'object' || photo === null) {
          continue;
        }
        const uri = (photo as Record<string, unknown>).uri;
        if (uri != null && !addUri(uris, uri)) {
          return null;
        }
      }
    }
    if (report.signature != null && typeof report.signature !== 'object') {
      return null;
    }
    if (typeof report.signature === 'object' && report.signature !== null) {
      const uri = (report.signature as Record<string, unknown>).uri;
      if (uri != null && !addUri(uris, uri)) {
        return null;
      }
    }
  }
  return uris;
}

function collectLogoUri(parsed: unknown): { ok: true; uri?: string } | { ok: false } {
  if (parsed === null) {
    return { ok: true };
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false };
  }
  const logoUri = (parsed as Record<string, unknown>).logoUri;
  if (logoUri == null) {
    return { ok: true };
  }
  if (typeof logoUri !== 'string') {
    return { ok: false };
  }
  const trimmed = logoUri.trim();
  return trimmed.length > 0 ? { ok: true, uri: trimmed } : { ok: true };
}

async function readStorageJson(key: string): Promise<{ ok: true; value: unknown } | { ok: false }> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return { ok: false };
  }
  if (raw == null) {
    return { ok: true, value: null };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

async function readReferences(): Promise<StoredReferences | null> {
  const [reportsResult, profileResult] = await Promise.all([
    readStorageJson(REPORTS_STORAGE_KEY),
    readStorageJson(COMPANY_PROFILE_STORAGE_KEY),
  ]);
  if (!reportsResult.ok || !profileResult.ok) {
    return null;
  }
  const reportUris = collectReportUris(reportsResult.value ?? []);
  const logo = collectLogoUri(profileResult.value);
  if (!reportUris || !logo.ok) {
    return null;
  }
  if (logo.uri) {
    reportUris.add(logo.uri);
  }
  return { uris: reportUris };
}

function listedFiles(directoryName: string): File[] {
  let directory: Directory;
  try {
    directory = new Directory(Paths.document, directoryName);
  } catch {
    return [];
  }
  try {
    if (!directory.exists) {
      return [];
    }
  } catch {
    return [];
  }
  try {
    return directory.list().filter((entry): entry is File => entry instanceof File);
  } catch {
    return [];
  }
}

function tryDelete(uri: string): boolean {
  try {
    const file = new File(uri);
    if (!file.exists) {
      return false;
    }
    file.delete();
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete old photos, signatures, and logos that no saved report or company
 * profile references. PDFs are retained. Missing directories and unreadable
 * files are skipped. A failed storage read deletes nothing.
 */
export async function cleanupOrphanDocumentFiles(options?: {
  now?: number;
  minAgeMs?: number;
}): Promise<OrphanCleanupResult> {
  if (Platform.OS === 'web' || isStorageOperationInProgress()) {
    return {
      deletedUris: [],
      ...(isStorageOperationInProgress() ? { skippedReason: 'in-progress' as const } : {}),
    };
  }

  const now = options?.now ?? Date.now();
  const minAgeMs = options?.minAgeMs ?? ORPHAN_MIN_AGE_MS;
  const first = await readReferences();
  const second = first ? await readReferences() : null;
  if (!first || !second || isStorageOperationInProgress()) {
    return {
      deletedUris: [],
      skippedReason: isStorageOperationInProgress() ? 'in-progress' : 'storage-read-failed',
    };
  }

  const referenced = new Set([...first.uris, ...second.uris]);
  const deletedUris: string[] = [];

  for (const directoryName of CLEANABLE_DIRECTORIES) {
    for (const file of listedFiles(directoryName)) {
      if (isStorageOperationInProgress()) {
        return { deletedUris, skippedReason: 'in-progress' };
      }
      let name = '';
      let ageMs: number | null = null;
      try {
        name = file.name;
        ageMs = fileRecencyMs(file, now);
      } catch {
        continue;
      }
      if (isReferenced(file.uri, name, referenced)) {
        continue;
      }
      if (ageMs == null || ageMs <= minAgeMs) {
        continue;
      }
      if (tryDelete(file.uri)) {
        deletedUris.push(file.uri);
      }
    }
  }

  return { deletedUris };
}
