import AsyncStorage from '@react-native-async-storage/async-storage';

import { COMPANY_PROFILE_STORAGE_KEY, LOGO_DIR_NAME } from '@/services/company-storage';
import {
  cleanupOrphanDocumentFiles,
  ORPHAN_MIN_AGE_MS,
  RETAINED_DOCUMENT_DIRECTORIES,
} from '@/services/orphan-cleanup';
import { PDFS_DIR_NAME } from '@/services/pdf-storage';
import { PHOTOS_DIR_NAME } from '@/services/photo-storage';
import { REPORTS_STORAGE_KEY } from '@/services/reports-storage';
import { SIGNATURES_DIR_NAME } from '@/services/signature-storage';
import { beginStorageOperation, endStorageOperation } from '@/services/storage-operation';
import {
  mockDeletedFileUris,
  setMockDeleteThrows,
  setMockDirectoryFault,
  setMockFileExists,
  setMockFileTimes,
} from '@/test/expo-file-system-mock';

const NOW = Date.parse('2026-10-14T12:00:00.000Z');
const OLD = NOW - ORPHAN_MIN_AGE_MS - 60_000;
const EXACT_THRESHOLD = NOW - ORPHAN_MIN_AGE_MS;
const RECENT = NOW - 60_000;

const PHOTO_DIR = `file:///documents/${PHOTOS_DIR_NAME}`;
const SIGNATURE_DIR = `file:///documents/${SIGNATURES_DIR_NAME}`;
const LOGO_DIR = `file:///documents/${LOGO_DIR_NAME}`;
const PDF_DIR = `file:///documents/${PDFS_DIR_NAME}`;

function track(uri: string, modified: number | null): void {
  setMockFileExists(uri, true);
  setMockFileTimes(uri, { modificationTime: modified, creationTime: modified });
}

async function seedReferences(options: {
  photoUri?: string;
  signatureUri?: string;
  logoUri?: string;
}): Promise<void> {
  await AsyncStorage.setItem(
    REPORTS_STORAGE_KEY,
    JSON.stringify([
      {
        photos: options.photoUri ? [{ uri: options.photoUri }] : [],
        signature: options.signatureUri ? { uri: options.signatureUri } : undefined,
      },
    ]),
  );
  await AsyncStorage.setItem(
    COMPANY_PROFILE_STORAGE_KEY,
    JSON.stringify({
      companyName: 'Acme',
      logoUri: options.logoUri,
      updatedAt: '2026-04-01T00:00:00.000Z',
    }),
  );
}

describe('cleanupOrphanDocumentFiles', () => {
  it('deletes only old unreferenced photos, signatures, and logos', async () => {
    const referencedPhoto = `${PHOTO_DIR}/photo_kept.jpg`;
    const orphanPhoto = `${PHOTO_DIR}/photo_orphan.jpg`;
    const recentPhoto = `${PHOTO_DIR}/photo_recent.jpg`;
    const thresholdPhoto = `${PHOTO_DIR}/photo_threshold.jpg`;
    const unknownAgePhoto = `${PHOTO_DIR}/photo_unknown.jpg`;
    const referencedSignature = `${SIGNATURE_DIR}/sig_kept.png`;
    const orphanSignature = `${SIGNATURE_DIR}/sig_orphan.png`;
    const referencedLogo = `${LOGO_DIR}/logo_kept.png`;
    const orphanLogo = `${LOGO_DIR}/logo_orphan.png`;
    const retainedPdf = `${PDF_DIR}/FieldReport_old.pdf`;

    track(referencedPhoto, OLD);
    track(orphanPhoto, OLD);
    track(recentPhoto, RECENT);
    track(thresholdPhoto, EXACT_THRESHOLD);
    track(unknownAgePhoto, null);
    track(referencedSignature, OLD);
    track(orphanSignature, OLD);
    track(referencedLogo, OLD);
    track(orphanLogo, OLD);
    track(retainedPdf, OLD);

    await seedReferences({
      photoUri: referencedPhoto,
      signatureUri: referencedSignature,
      logoUri: referencedLogo,
    });

    const result = await cleanupOrphanDocumentFiles({ now: NOW });

    expect(result.skippedReason).toBeUndefined();
    expect(result.deletedUris.sort()).toEqual([orphanLogo, orphanPhoto, orphanSignature].sort());
    expect(mockDeletedFileUris().sort()).toEqual([orphanLogo, orphanPhoto, orphanSignature].sort());
    expect(RETAINED_DOCUMENT_DIRECTORIES).toEqual([PDFS_DIR_NAME]);
    expect(mockDeletedFileUris()).not.toContain(retainedPdf);
    expect(mockDeletedFileUris()).not.toContain(recentPhoto);
    expect(mockDeletedFileUris()).not.toContain(thresholdPhoto);
    expect(mockDeletedFileUris()).not.toContain(unknownAgePhoto);
  });

  it('keeps a file whose saved uri uses a different directory prefix', async () => {
    const listed = `${PHOTO_DIR}/photo_1600000000000_ab.jpg`;
    track(listed, null);
    await seedReferences({
      photoUri: `file:///var/mobile/Containers/Data/Application/abc/Documents/${PHOTOS_DIR_NAME}/photo_1600000000000_ab.jpg`,
    });

    const result = await cleanupOrphanDocumentFiles({ now: NOW });

    expect(result.deletedUris).toEqual([]);
  });

  it('does not delete anything when saved reports cannot be read', async () => {
    const orphanPhoto = `${PHOTO_DIR}/photo_orphan.jpg`;
    track(orphanPhoto, OLD);
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, '{');
    await AsyncStorage.setItem(
      COMPANY_PROFILE_STORAGE_KEY,
      JSON.stringify({ companyName: 'Acme', updatedAt: '2026-04-01T00:00:00.000Z' }),
    );

    const invalidJson = await cleanupOrphanDocumentFiles({ now: NOW });
    expect(invalidJson).toEqual({ deletedUris: [], skippedReason: 'storage-read-failed' });
    expect(mockDeletedFileUris()).toEqual([]);

    const getItem = AsyncStorage.getItem as jest.Mock;
    const originalGetItem = getItem.getMockImplementation();
    getItem.mockRejectedValue(new Error('storage unavailable'));
    try {
      const rejected = await cleanupOrphanDocumentFiles({ now: NOW });
      expect(rejected).toEqual({ deletedUris: [], skippedReason: 'storage-read-failed' });
      expect(mockDeletedFileUris()).toEqual([]);
    } finally {
      if (originalGetItem) {
        getItem.mockImplementation(originalGetItem);
      }
    }
  });

  it('does not delete anything when the company profile cannot be read', async () => {
    const orphanLogo = `${LOGO_DIR}/logo_orphan.png`;
    track(orphanLogo, OLD);
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, '[]');
    await AsyncStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, '{');

    const result = await cleanupOrphanDocumentFiles({ now: NOW });

    expect(result).toEqual({ deletedUris: [], skippedReason: 'storage-read-failed' });
    expect(mockDeletedFileUris()).toEqual([]);
  });

  it('does not delete anything while a save or file copy is in progress', async () => {
    const orphanPhoto = `${PHOTO_DIR}/photo_orphan.jpg`;
    track(orphanPhoto, OLD);
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, '[]');
    beginStorageOperation();

    const result = await cleanupOrphanDocumentFiles({ now: NOW });

    expect(result).toEqual({ deletedUris: [], skippedReason: 'in-progress' });
    expect(mockDeletedFileUris()).toEqual([]);
    endStorageOperation();
  });

  it('skips missing or unreadable directories and continues after a delete error', async () => {
    const orphanPhoto = `${PHOTO_DIR}/photo_orphan.jpg`;
    const blockedPhoto = `${PHOTO_DIR}/photo_blocked.jpg`;
    const orphanSignature = `${SIGNATURE_DIR}/sig_orphan.png`;
    track(orphanPhoto, OLD);
    track(blockedPhoto, OLD);
    track(orphanSignature, OLD);
    setMockDirectoryFault(SIGNATURE_DIR, 'list-throws');
    setMockDirectoryFault(LOGO_DIR, 'missing');
    setMockDeleteThrows(blockedPhoto);
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, '[]');

    const result = await cleanupOrphanDocumentFiles({ now: NOW });

    expect(result.deletedUris).toEqual([orphanPhoto]);
    expect(mockDeletedFileUris()).toEqual([orphanPhoto]);
    expect(mockDeletedFileUris()).not.toContain(orphanSignature);
    expect(mockDeletedFileUris()).not.toContain(blockedPhoto);
  });
});
