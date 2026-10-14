import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const PDFS_DIR_NAME = 'report-pdfs';

function pdfsDirectory(): Directory {
  return new Directory(Paths.document, PDFS_DIR_NAME);
}

export function ensurePdfsDirectory(): Directory {
  const dir = pdfsDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copy a PDF produced by expo-print (usually in cache) into app document storage
 * with a stable, share-friendly filename. Does not touch AsyncStorage.
 */
export async function persistPdfFile(
  sourceUri: string,
  filename: string,
): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  const dir = ensurePdfsDirectory();
  const safeName = sanitizePdfFilename(filename);
  const destination = new File(dir, safeName);
  const source = new File(sourceUri);

  if (!source.exists) {
    throw new Error('Generated PDF file was not found.');
  }

  if (destination.exists) {
    destination.delete();
  }

  await source.copy(destination);

  if (!destination.exists) {
    throw new Error('Could not store the PDF on this device.');
  }

  return destination.uri;
}

export function sanitizePdfFilename(filename: string): string {
  const trimmed = filename.trim() || 'FieldReport.pdf';
  const withExt = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  return withExt.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
}

export async function deletePdfFile(uri: string): Promise<void> {
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
