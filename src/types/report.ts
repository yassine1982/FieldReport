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
};
