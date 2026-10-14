import type { ChecklistItem, NewReportDraft, Report, ReportSignature } from '@/types/report';

export const SIGNATURE_URI = 'file:///documents/report-signatures/sig_test.png';
export const LOGO_URI = 'file:///documents/company-assets/logo_test.png';
export const REPLACEMENT_LOGO_URI = 'file:///documents/company-assets/logo_next.png';

export function sampleChecklist(): ChecklistItem[] {
  return [{ id: 'check_power', label: 'Power', status: 'pass' }];
}

export function sampleReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'report_test',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    status: 'completed',
    clientName: 'Northwind',
    clientContact: 'Ada',
    equipmentName: 'Boiler',
    interventionDate: '2026-04-01',
    problemDescription: 'No heat',
    checklist: sampleChecklist(),
    observations: 'Replaced valve',
    identifiedIssues: ['Worn seal'],
    photos: [],
    ...overrides,
  };
}

export function sampleDraft(overrides: Partial<NewReportDraft> = {}): NewReportDraft {
  const report = sampleReport();
  return {
    clientName: report.clientName,
    clientContact: report.clientContact ?? '',
    equipmentName: report.equipmentName,
    interventionDate: report.interventionDate,
    problemDescription: report.problemDescription,
    checklist: report.checklist.map((item) => ({ ...item })),
    observations: report.observations,
    identifiedIssues: [...report.identifiedIssues],
    photos: [],
    ...overrides,
  };
}

export function sampleSignature(overrides: Partial<ReportSignature> = {}): ReportSignature {
  return {
    uri: SIGNATURE_URI,
    signerName: 'Ada',
    signedAt: '2026-04-02T15:30:00.000Z',
    consentLabel: 'I agree',
    contentDigest: 'fnv1a_placeholder',
    needsReconfirmation: false,
    ...overrides,
  };
}
