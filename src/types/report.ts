export type ReportStatus = 'draft' | 'completed';

export type ChecklistItemStatus = 'pass' | 'fail' | 'na' | 'pending';

export type PhotoCategory = 'before' | 'after';

export type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistItemStatus;
};

export type ReportPhoto = {
  id: string;
  /** Persistent local file URI under the app document directory */
  uri: string;
  category: PhotoCategory;
  caption?: string;
  createdAt: string;
};

/**
 * Client acknowledgement captured for an intervention report.
 * Image bytes live on disk; AsyncStorage only stores this metadata.
 */
export type ReportSignature = {
  /** Persistent local PNG URI under the app document directory */
  uri: string;
  signerName?: string;
  signedAt: string;
  /** Plain-language acknowledgement shown at capture time */
  consentLabel: string;
  /** Digest of report content at the time of signing / last confirmation */
  contentDigest: string;
  /** True when report content changed after the signature was last confirmed */
  needsReconfirmation?: boolean;
};

export type Report = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ReportStatus;
  clientName: string;
  clientContact?: string;
  equipmentName: string;
  /** Intervention date as YYYY-MM-DD */
  interventionDate: string;
  problemDescription: string;
  checklist: ChecklistItem[];
  observations: string;
  identifiedIssues: string[];
  photos: ReportPhoto[];
  signature?: ReportSignature;
};

/** Lightweight list row derived from a full Report */
export type ReportSummary = {
  id: string;
  clientName: string;
  equipmentName: string;
  status: ReportStatus;
  /** YYYY-MM-DD used for list display (intervention date) */
  interventionDate: string;
  updatedAt: string;
  problemPreview: string;
  photoCount: number;
  isSigned: boolean;
};

export type ReportStats = {
  total: number;
  drafts: number;
  completed: number;
};

export type NewReportDraft = {
  clientName: string;
  clientContact: string;
  equipmentName: string;
  interventionDate: string;
  problemDescription: string;
  checklist: ChecklistItem[];
  observations: string;
  identifiedIssues: string[];
  photos: ReportPhoto[];
  signature?: ReportSignature;
};
