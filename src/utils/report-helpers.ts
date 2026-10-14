import type { NewReportDraft, Report, ReportStats, ReportStatus, ReportSummary } from '@/types/report';

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
  };
}

export type BuildReportOptions = {
  status: ReportStatus;
  existing?: Pick<Report, 'id' | 'createdAt'>;
};

export function buildReport(draft: NewReportDraft, options: BuildReportOptions): Report {
  const now = new Date().toISOString();
  const contact = draft.clientContact.trim();

  return {
    id: options.existing?.id ?? createReportId(),
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
    status: options.status,
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
  });
}

export function isDraftDirty(current: NewReportDraft, baseline: string): boolean {
  return serializeDraft(current) !== baseline;
}
