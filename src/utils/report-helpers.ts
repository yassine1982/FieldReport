import { cloneSignature } from '@/services/signature-storage';
import type {
  NewReportDraft,
  Report,
  ReportPhoto,
  ReportSignature,
  ReportStats,
  ReportStatus,
  ReportSummary,
} from '@/types/report';

export function createReportId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `report_${Date.now()}_${random}`;
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function displayClientName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled draft';
}

export function toReportSummary(report: Report): ReportSummary {
  const preview = report.problemDescription.trim();
  return {
    id: report.id,
    clientName: displayClientName(report.clientName),
    equipmentName: report.equipmentName.trim() || 'No equipment listed',
    status: report.status,
    interventionDate: report.interventionDate,
    updatedAt: report.updatedAt,
    problemPreview: preview.length > 80 ? `${preview.slice(0, 77)}…` : preview,
    photoCount: report.photos.length,
    isSigned: Boolean(report.signature?.uri) && !report.signature?.needsReconfirmation,
  };
}

export function getReportStats(reports: Report[]): ReportStats {
  return {
    total: reports.length,
    drafts: reports.filter((report) => report.status === 'draft').length,
    completed: reports.filter((report) => report.status === 'completed').length,
  };
}

export function sortReportsNewestFirst(reports: Report[]): Report[] {
  return [...reports].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function formatDisplayDate(isoDate: string): string {
  const normalized = isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function clonePhotos(photos: ReportPhoto[]): ReportPhoto[] {
  return photos.map((photo) => ({
    ...photo,
    caption: photo.caption,
  }));
}

/** Stable digest of report fields that affect signature validity (excludes signature + timestamps). */
export function computeReportContentDigest(
  data: Pick<
    Report,
    | 'clientName'
    | 'clientContact'
    | 'equipmentName'
    | 'interventionDate'
    | 'problemDescription'
    | 'checklist'
    | 'observations'
    | 'identifiedIssues'
    | 'photos'
  >,
): string {
  const payload = {
    clientName: data.clientName.trim(),
    clientContact: data.clientContact?.trim() ?? '',
    equipmentName: data.equipmentName.trim(),
    interventionDate: data.interventionDate.trim(),
    problemDescription: data.problemDescription.trim(),
    checklist: data.checklist.map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
    })),
    observations: data.observations.trim(),
    identifiedIssues: data.identifiedIssues.map((issue) => issue.trim()).filter(Boolean),
    photos: data.photos.map((photo) => ({
      id: photo.id,
      uri: photo.uri,
      category: photo.category,
      caption: photo.caption?.trim() ?? '',
    })),
  };

  const json = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`;
}

export function computeDraftContentDigest(draft: NewReportDraft): string {
  return computeReportContentDigest({
    clientName: draft.clientName,
    clientContact: draft.clientContact,
    equipmentName: draft.equipmentName,
    interventionDate: draft.interventionDate,
    problemDescription: draft.problemDescription,
    checklist: draft.checklist,
    observations: draft.observations,
    identifiedIssues: draft.identifiedIssues,
    photos: draft.photos,
  });
}

/**
 * Align signature integrity with current content:
 * matching digest → current; mismatch → needs reconfirmation.
 */
export function reconcileSignatureWithContent(
  signature: ReportSignature | undefined,
  contentDigest: string,
): ReportSignature | undefined {
  if (!signature) {
    return undefined;
  }
  if (signature.contentDigest === contentDigest) {
    return {
      ...signature,
      needsReconfirmation: false,
    };
  }
  return {
    ...signature,
    needsReconfirmation: true,
  };
}

export function reportToDraft(report: Report): NewReportDraft {
  return {
    clientName: report.clientName,
    clientContact: report.clientContact ?? '',
    equipmentName: report.equipmentName,
    interventionDate: report.interventionDate,
    problemDescription: report.problemDescription,
    checklist: report.checklist.map((item) => ({ ...item })),
    observations: report.observations,
    identifiedIssues: [...report.identifiedIssues],
    photos: clonePhotos(report.photos ?? []),
    signature: cloneSignature(report.signature),
  };
}

export type BuildReportOptions = {
  status: ReportStatus;
  existing?: Pick<Report, 'id' | 'createdAt'>;
  /** When set, overrides draft.signature after content reconciliation */
  signature?: ReportSignature | null;
};

export function buildReport(draft: NewReportDraft, options: BuildReportOptions): Report {
  const now = new Date().toISOString();
  const contact = draft.clientContact.trim();
  const photos = draft.photos.map((photo) => ({
    ...photo,
    caption: photo.caption?.trim() ? photo.caption.trim() : undefined,
  }));

  const contentBase = {
    clientName: draft.clientName.trim(),
    clientContact: contact.length > 0 ? contact : undefined,
    equipmentName: draft.equipmentName.trim(),
    interventionDate: draft.interventionDate.trim(),
    problemDescription: draft.problemDescription.trim(),
    checklist: draft.checklist.map((item) => ({ ...item })),
    observations: draft.observations.trim(),
    identifiedIssues: draft.identifiedIssues
      .map((issue) => issue.trim())
      .filter((issue) => issue.length > 0),
    photos,
  };

  const digest = computeReportContentDigest(contentBase);
  const incoming =
    options.signature === null
      ? undefined
      : options.signature !== undefined
        ? options.signature
        : draft.signature;
  const signature = reconcileSignatureWithContent(incoming, digest);

  return {
    id: options.existing?.id ?? createReportId(),
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
    status: options.status,
    ...contentBase,
    signature,
  };
}

/** @deprecated Prefer buildReport — kept for any residual call sites */
export function draftToReport(
  draft: NewReportDraft,
  status: ReportStatus = 'completed',
): Report {
  return buildReport(draft, { status });
}

export function serializeDraft(draft: NewReportDraft): string {
  return JSON.stringify({
    clientName: draft.clientName,
    clientContact: draft.clientContact,
    equipmentName: draft.equipmentName,
    interventionDate: draft.interventionDate,
    problemDescription: draft.problemDescription,
    checklist: draft.checklist,
    observations: draft.observations,
    identifiedIssues: draft.identifiedIssues,
    photos: draft.photos.map((photo) => ({
      id: photo.id,
      uri: photo.uri,
      category: photo.category,
      caption: photo.caption ?? '',
      createdAt: photo.createdAt,
    })),
    signature: draft.signature
      ? {
          uri: draft.signature.uri,
          signerName: draft.signature.signerName ?? '',
          signedAt: draft.signature.signedAt,
          consentLabel: draft.signature.consentLabel,
          contentDigest: draft.signature.contentDigest,
          needsReconfirmation: Boolean(draft.signature.needsReconfirmation),
        }
      : null,
  });
}

export function isDraftDirty(current: NewReportDraft, baseline: string): boolean {
  return serializeDraft(current) !== baseline;
}

export function photoUris(photos: ReportPhoto[]): string[] {
  return photos.map((photo) => photo.uri).filter(Boolean);
}

export function signatureUri(signature: ReportSignature | undefined): string | undefined {
  return signature?.uri || undefined;
}
