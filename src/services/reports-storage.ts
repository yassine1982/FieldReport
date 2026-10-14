import AsyncStorage from '@react-native-async-storage/async-storage';

import { signatureFileExists } from '@/services/signature-storage';
import { withStorageOperation } from '@/services/storage-operation';
import type {
  ChecklistItem,
  Report,
  ReportPhoto,
  ReportSignature,
  ReportStatus,
} from '@/types/report';
import { computeReportContentDigest, reconcileSignatureWithContent } from '@/utils/report-helpers';

export const REPORTS_STORAGE_KEY = 'fieldreport.reports.v1';

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.label === 'string' &&
    (item.status === 'pass' ||
      item.status === 'fail' ||
      item.status === 'na' ||
      item.status === 'pending')
  );
}

function isReportPhoto(value: unknown): value is ReportPhoto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const photo = value as Record<string, unknown>;
  return (
    typeof photo.id === 'string' &&
    typeof photo.uri === 'string' &&
    (photo.category === 'before' || photo.category === 'after') &&
    typeof photo.createdAt === 'string' &&
    (photo.caption === undefined || typeof photo.caption === 'string')
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isReportSignature(value: unknown): value is ReportSignature {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const signature = value as Record<string, unknown>;
  return (
    nonEmptyString(signature.uri) &&
    nonEmptyString(signature.signedAt) &&
    nonEmptyString(signature.consentLabel) &&
    nonEmptyString(signature.contentDigest) &&
    (signature.signerName === undefined || typeof signature.signerName === 'string') &&
    (signature.needsReconfirmation === undefined ||
      typeof signature.needsReconfirmation === 'boolean')
  );
}

/**
 * Reliable evidence a legacy record was unfinished:
 * - explicit status draft / in_progress
 * Missing or unknown status defaults to completed (Milestone 2.1).
 */
function resolveStatus(rawStatus: unknown): ReportStatus {
  if (rawStatus === 'draft' || rawStatus === 'in_progress') {
    return 'draft';
  }
  return 'completed';
}

function normalizePhotos(value: unknown): { photos: ReportPhoto[]; changed: boolean } {
  if (value === undefined) {
    return { photos: [], changed: true };
  }
  if (!Array.isArray(value)) {
    return { photos: [], changed: true };
  }
  const photos = value.filter(isReportPhoto).map((photo) => ({
    ...photo,
    caption: photo.caption?.trim() ? photo.caption.trim() : undefined,
  }));
  return { photos, changed: photos.length !== value.length };
}

function normalizeSignature(
  value: unknown,
  contentDigest: string,
): { signature?: ReportSignature; changed: boolean } {
  if (value === undefined || value === null) {
    return { signature: undefined, changed: false };
  }
  if (!isReportSignature(value)) {
    return { signature: undefined, changed: true };
  }

  if (!signatureFileExists(value.uri)) {
    return { signature: undefined, changed: true };
  }

  const signerName = value.signerName?.trim();
  const reconciled = reconcileSignatureWithContent(
    {
      uri: value.uri,
      signerName: signerName && signerName.length > 0 ? signerName : undefined,
      signedAt: value.signedAt.trim(),
      consentLabel: value.consentLabel.trim(),
      contentDigest: value.contentDigest.trim(),
      needsReconfirmation: value.needsReconfirmation,
    },
    contentDigest,
  );

  if (!reconciled) {
    return { signature: undefined, changed: true };
  }

  const changed =
    reconciled.uri !== value.uri ||
    reconciled.signerName !== value.signerName ||
    reconciled.signedAt !== value.signedAt ||
    reconciled.consentLabel !== value.consentLabel ||
    reconciled.contentDigest !== value.contentDigest ||
    Boolean(reconciled.needsReconfirmation) !== Boolean(value.needsReconfirmation);

  return { signature: reconciled, changed };
}

function normalizeReport(value: unknown): { report: Report; changed: boolean } | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const report = value as Record<string, unknown>;

  if (
    typeof report.id !== 'string' ||
    typeof report.createdAt !== 'string' ||
    typeof report.updatedAt !== 'string' ||
    typeof report.clientName !== 'string' ||
    typeof report.equipmentName !== 'string' ||
    typeof report.interventionDate !== 'string' ||
    typeof report.problemDescription !== 'string' ||
    !Array.isArray(report.checklist) ||
    !report.checklist.every(isChecklistItem) ||
    typeof report.observations !== 'string' ||
    !Array.isArray(report.identifiedIssues) ||
    !report.identifiedIssues.every((issue) => typeof issue === 'string')
  ) {
    return null;
  }

  const contact =
    typeof report.clientContact === 'string' ? report.clientContact : undefined;
  const status = resolveStatus(report.status);
  const { photos, changed: photosChanged } = normalizePhotos(report.photos);
  const statusChanged = report.status !== status;

  const contentDigest = computeReportContentDigest({
    clientName: report.clientName,
    clientContact: contact,
    equipmentName: report.equipmentName,
    interventionDate: report.interventionDate,
    problemDescription: report.problemDescription,
    checklist: report.checklist,
    observations: report.observations,
    identifiedIssues: report.identifiedIssues,
    photos,
  });

  const { signature, changed: signatureChanged } = normalizeSignature(
    report.signature,
    contentDigest,
  );

  return {
    report: {
      id: report.id,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      status,
      clientName: report.clientName,
      clientContact: contact,
      equipmentName: report.equipmentName,
      interventionDate: report.interventionDate,
      problemDescription: report.problemDescription,
      checklist: report.checklist.map((item) => ({ ...item })),
      observations: report.observations,
      identifiedIssues: [...report.identifiedIssues],
      photos: photos.map((photo) => ({ ...photo })),
      signature,
    },
    changed:
      statusChanged ||
      photosChanged ||
      signatureChanged ||
      !('photos' in report) ||
      ('signature' in report && signature === undefined && report.signature != null),
  };
}

function migrateReports(parsed: unknown[]): { reports: Report[]; dirty: boolean } {
  const reports: Report[] = [];
  let dirty = false;

  for (const entry of parsed) {
    const normalized = normalizeReport(entry);
    if (!normalized) {
      dirty = true;
      continue;
    }
    reports.push(normalized.report);
    if (normalized.changed) {
      dirty = true;
    }
  }

  return { reports, dirty };
}

export async function loadReports(): Promise<Report[]> {
  const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const { reports, dirty } = migrateReports(parsed);
    if (dirty) {
      await saveReports(reports);
    }

    return reports;
  } catch {
    return [];
  }
}

export async function saveReports(reports: Report[]): Promise<void> {
  await withStorageOperation(async () => {
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  });
}

export async function upsertReport(report: Report): Promise<Report[]> {
  return withStorageOperation(async () => {
    const existing = await loadReports();
    const index = existing.findIndex((item) => item.id === report.id);
    const next =
      index >= 0
        ? existing.map((item, i) => (i === index ? report : item))
        : [report, ...existing];
    await saveReports(next);
    return next;
  });
}

export async function getReportById(id: string): Promise<Report | null> {
  const reports = await loadReports();
  return reports.find((report) => report.id === id) ?? null;
}
