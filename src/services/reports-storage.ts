import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChecklistItem, Report, ReportPhoto, ReportStatus } from '@/types/report';

const STORAGE_KEY = 'fieldreport.reports.v1';

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
    },
    changed: statusChanged || photosChanged || !('photos' in report),
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
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export async function upsertReport(report: Report): Promise<Report[]> {
  const existing = await loadReports();
  const index = existing.findIndex((item) => item.id === report.id);
  const next =
    index >= 0
      ? existing.map((item, i) => (i === index ? report : item))
      : [report, ...existing];
  await saveReports(next);
  return next;
}

export async function getReportById(id: string): Promise<Report | null> {
  const reports = await loadReports();
  return reports.find((report) => report.id === id) ?? null;
}
