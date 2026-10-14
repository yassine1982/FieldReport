import type { ChecklistItem, NewReportDraft } from '@/types/report';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type Step1Errors = Partial<{
  clientName: string;
  equipmentName: string;
  interventionDate: string;
  problemDescription: string;
}>;

export type Step2Errors = {
  checklist?: string;
};

export type Step3Errors = Partial<{
  observations: string;
  identifiedIssues: string;
}>;

export function validateStep1(draft: NewReportDraft): Step1Errors {
  const errors: Step1Errors = {};

  if (!draft.clientName.trim()) {
    errors.clientName = 'Client name is required.';
  }
  if (!draft.equipmentName.trim()) {
    errors.equipmentName = 'Equipment name or ID is required.';
  }
  if (!draft.interventionDate.trim()) {
    errors.interventionDate = 'Intervention date is required.';
  } else if (!DATE_PATTERN.test(draft.interventionDate.trim())) {
    errors.interventionDate = 'Use YYYY-MM-DD format.';
  } else {
    const parsed = new Date(`${draft.interventionDate.trim()}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      errors.interventionDate = 'Enter a valid calendar date.';
    }
  }
  if (!draft.problemDescription.trim()) {
    errors.problemDescription = 'Problem description is required.';
  }

  return errors;
}

export function validateStep2(checklist: ChecklistItem[]): Step2Errors {
  const incomplete = checklist.some((item) => item.status === 'pending');
  if (incomplete) {
    return { checklist: 'Set Pass, Fail, or N/A for every checklist item.' };
  }
  return {};
}

export function validateStep3(draft: NewReportDraft): Step3Errors {
  const errors: Step3Errors = {};
  if (!draft.observations.trim()) {
    errors.observations = 'Add technician observations before continuing.';
  }
  const blankIssue = draft.identifiedIssues.some((issue) => issue.trim().length === 0);
  if (blankIssue) {
    errors.identifiedIssues = 'Remove empty issue rows or fill them in.';
  }
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Infer the first incomplete wizard step so drafts resume in a sensible place.
 * Fully valid drafts land on the review step.
 */
export function inferWizardStep(draft: NewReportDraft): number {
  if (hasErrors(validateStep1(draft))) {
    return 1;
  }
  if (hasErrors(validateStep2(draft.checklist))) {
    return 2;
  }
  if (hasErrors(validateStep3(draft))) {
    return 3;
  }
  return 4;
}
