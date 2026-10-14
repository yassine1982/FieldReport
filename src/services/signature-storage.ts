import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { withStorageOperation } from '@/services/storage-operation';
import { DEFAULT_SIGNATURE_CONSENT_LABEL } from '@/types/company';
import type { Report, ReportSignature } from '@/types/report';

export const SIGNATURES_DIR_NAME = 'report-signatures';

export function createSignatureId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `sig_${Date.now()}_${random}`;
}

function signaturesDirectory(): Directory {
  return new Directory(Paths.document, SIGNATURES_DIR_NAME);
}

export function ensureSignaturesDirectory(): Directory {
  const dir = signaturesDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function signatureFileExists(uri: string | undefined): boolean {
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

/**
 * Copy a captured signature image (e.g. view-shot tmpfile) into persistent storage.
 */
export async function persistSignatureFromUri(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  return withStorageOperation(async () => {
    const dir = ensureSignaturesDirectory();
    const filename = `${createSignatureId()}.png`;
    const destination = new File(dir, filename);
    const source = new File(sourceUri);

    if (!source.exists) {
      throw new Error('Signature image is no longer available.');
    }

    await source.copy(destination);

    if (!destination.exists) {
      throw new Error('Could not store the signature on this device.');
    }

    return destination.uri;
  });
}

/**
 * Write a PNG from a Base64 payload (without data-URL prefix) into document storage.
 */
export async function persistSignatureFromBase64(base64: string): Promise<string> {
  if (Platform.OS === 'web') {
    return `data:image/png;base64,${base64}`;
  }

  return withStorageOperation(async () => {
    const cleaned = base64.includes(',') ? (base64.split(',').pop() ?? base64) : base64;
    if (!cleaned.trim()) {
      throw new Error('Signature image data was empty.');
    }

    const dir = ensureSignaturesDirectory();
    const destination = new File(dir, `${createSignatureId()}.png`);
    destination.create({ intermediates: true, overwrite: true });
    destination.write(cleaned, { encoding: 'base64' });

    if (!destination.exists) {
      throw new Error('Could not store the signature on this device.');
    }

    return destination.uri;
  });
}

export async function deleteSignatureFile(uri: string | undefined): Promise<void> {
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

export async function deleteSignatureFiles(uris: string[]): Promise<void> {
  const unique = [...new Set(uris.filter(Boolean))];
  await Promise.all(unique.map((uri) => deleteSignatureFile(uri)));
}

export function collectReferencedSignatureUris(reports: Report[]): Set<string> {
  const uris = new Set<string>();
  for (const report of reports) {
    if (report.signature?.uri) {
      uris.add(report.signature.uri);
    }
  }
  return uris;
}

/**
 * Delete signature files only when no remaining report still references them.
 */
export async function deleteUnreferencedSignatureFiles(
  candidateUris: string[],
  reports: Report[],
): Promise<void> {
  if (candidateUris.length === 0) {
    return;
  }
  const referenced = collectReferencedSignatureUris(reports);
  const orphans = [...new Set(candidateUris)].filter((uri) => uri && !referenced.has(uri));
  await deleteSignatureFiles(orphans);
}

export function buildReportSignature(options: {
  uri: string;
  contentDigest: string;
  signerName?: string;
  consentLabel?: string;
  signedAt?: string;
}): ReportSignature {
  const signerName = options.signerName?.trim();
  return {
    uri: options.uri,
    signerName: signerName && signerName.length > 0 ? signerName : undefined,
    signedAt: options.signedAt ?? new Date().toISOString(),
    consentLabel: (options.consentLabel ?? DEFAULT_SIGNATURE_CONSENT_LABEL).trim(),
    contentDigest: options.contentDigest,
    needsReconfirmation: false,
  };
}

/**
 * URI of a newly captured signature that should be deleted because it was
 * never committed onto the report. The committed file is left in place.
 */
export function signatureUriToDiscard(
  candidateUri: string | undefined,
  committedUri: string | undefined,
): string | undefined {
  if (!candidateUri || candidateUri === committedUri) {
    return undefined;
  }
  return candidateUri;
}

export function isSignatureCurrent(signature: ReportSignature | undefined): boolean {
  if (!signature?.uri) {
    return false;
  }
  if (signature.needsReconfirmation) {
    return false;
  }
  return signatureFileExists(signature.uri);
}

export function cloneSignature(
  signature: ReportSignature | undefined,
): ReportSignature | undefined {
  if (!signature) {
    return undefined;
  }
  return { ...signature };
}
