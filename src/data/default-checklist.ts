import type { ChecklistItem } from '@/types/report';

const DEFAULT_LABELS = [
  'Visual condition of equipment',
  'Safety devices and guards',
  'Electrical connections / power',
  'Mechanical operation / noise',
  'Filters, belts, and consumables',
  'Leaks and fluid levels',
  'Controls, sensors, and settings',
  'Nameplate / asset identification',
] as const;

export function createDefaultChecklist(): ChecklistItem[] {
  return DEFAULT_LABELS.map((label, index) => ({
    id: `checklist-${index + 1}`,
    label,
    status: 'pending',
  }));
}
