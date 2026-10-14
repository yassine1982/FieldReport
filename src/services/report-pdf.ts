import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { Palette } from '@/constants/theme';
import { persistPdfFile, sanitizePdfFilename } from '@/services/pdf-storage';
import { photoFileExists } from '@/services/photo-storage';
import type { ChecklistItem, ChecklistItemStatus, Report, ReportPhoto } from '@/types/report';
import { displayClientName, formatDisplayDate } from '@/utils/report-helpers';

/** A4 at 72 PPI — expo-print uses points as pixels here. */
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

export type GeneratedReportPdf = {
  /** Stable document-directory URI used for sharing/export. */
  uri: string;
  /** Original expo-print cache URI; more reliable for native print preview. */
  printUri: string;
  numberOfPages: number;
  filename: string;
};

export class ReportPdfError extends Error {
  constructor(
    message: string,
    readonly code: 'draft' | 'generate' | 'share' | 'preview' | 'unavailable',
  ) {
    super(message);
    this.name = 'ReportPdfError';
  }
}

export function canExportReportPdf(report: Report): boolean {
  return report.status === 'completed';
}

export function assertCanExportReportPdf(report: Report): void {
  if (!canExportReportPdf(report)) {
    throw new ReportPdfError(
      'Complete this report before exporting a PDF.',
      'draft',
    );
  }
}

type ResolvedPhoto = {
  photo: ReportPhoto;
  dataUri: string | null;
  unavailableReason?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMultiline(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '—';
  }
  return escapeHtml(trimmed).replace(/\r\n|\r|\n/g, '<br />');
}

function displayOrDash(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? escapeHtml(trimmed) : '—';
}

function checklistStatusLabel(status: ChecklistItemStatus): string {
  switch (status) {
    case 'pass':
      return 'Pass';
    case 'fail':
      return 'Fail';
    case 'na':
      return 'N/A';
    default:
      return 'Pending';
  }
}

function checklistStatusClass(status: ChecklistItemStatus): string {
  switch (status) {
    case 'pass':
      return 'status-pass';
    case 'fail':
      return 'status-fail';
    case 'na':
      return 'status-na';
    default:
      return 'status-pending';
  }
}

function extensionFromUri(uri: string): string {
  const cleaned = uri.split('?')[0] ?? uri;
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleaned);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

function mimeFromExtension(ext: string): string | null {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}

function reportReference(report: Report): string {
  const raw = report.id.replace(/^report_/, '');
  return raw.length > 0 ? raw : report.id;
}

function slugSegment(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug.length > 0 ? slug : fallback;
}

export function buildReportPdfFilename(report: Report): string {
  const client = slugSegment(report.clientName, 'client');
  const date = report.interventionDate.trim() || 'undated';
  const ref = slugSegment(reportReference(report), 'report').slice(0, 16);
  return sanitizePdfFilename(`FieldReport_${client}_${date}_${ref}.pdf`);
}

async function resolvePhotoForPdf(photo: ReportPhoto): Promise<ResolvedPhoto> {
  if (!photo.uri) {
    return { photo, dataUri: null, unavailableReason: 'Missing file' };
  }

  const ext = extensionFromUri(photo.uri);
  const mime = mimeFromExtension(ext);
  if (!mime) {
    return {
      photo,
      dataUri: null,
      unavailableReason: 'Image format not supported in PDF',
    };
  }

  if (Platform.OS !== 'web' && !photoFileExists(photo.uri)) {
    return { photo, dataUri: null, unavailableReason: 'Photo file unavailable' };
  }

  try {
    const file = new File(photo.uri);
    if (Platform.OS !== 'web' && !file.exists) {
      return { photo, dataUri: null, unavailableReason: 'Photo file unavailable' };
    }
    const base64 = await file.base64();
    if (!base64) {
      return { photo, dataUri: null, unavailableReason: 'Photo could not be read' };
    }
    return { photo, dataUri: `data:${mime};base64,${base64}` };
  } catch {
    return { photo, dataUri: null, unavailableReason: 'Photo could not be read' };
  }
}

function renderChecklistRows(checklist: ChecklistItem[]): string {
  if (checklist.length === 0) {
    return `<tr><td colspan="2" class="muted">No checklist items</td></tr>`;
  }

  return checklist
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td class="status ${checklistStatusClass(item.status)}">${checklistStatusLabel(item.status)}</td>
      </tr>`,
    )
    .join('');
}

function renderIssues(issues: string[]): string {
  const cleaned = issues.map((issue) => issue.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return `<p class="muted">None listed</p>`;
  }
  return `<ul class="issues">${cleaned.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>`;
}

function renderPhotoBlock(resolved: ResolvedPhoto, index: number): string {
  const caption = resolved.photo.caption?.trim();
  const captionHtml = caption
    ? `<p class="photo-caption">${escapeHtml(caption)}</p>`
    : `<p class="photo-caption muted">No caption</p>`;

  if (resolved.dataUri) {
    return `
      <figure class="photo-block keep-together">
        <img src="${resolved.dataUri}" alt="Evidence photo ${index + 1}" />
        ${captionHtml}
      </figure>`;
  }

  return `
    <figure class="photo-block keep-together photo-missing">
      <div class="photo-placeholder">${escapeHtml(resolved.unavailableReason ?? 'Photo unavailable')}</div>
      ${captionHtml}
    </figure>`;
}

function renderPhotoSection(title: string, photos: ResolvedPhoto[]): string {
  if (photos.length === 0) {
    return `
      <section class="section keep-together">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">None attached</p>
      </section>`;
  }

  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <div class="photo-grid">
        ${photos.map((photo, index) => renderPhotoBlock(photo, index)).join('')}
      </div>
    </section>`;
}

export function buildReportPdfHtml(
  report: Report,
  beforePhotos: ResolvedPhoto[],
  afterPhotos: ResolvedPhoto[],
): string {
  const client = escapeHtml(displayClientName(report.clientName));
  const contact = report.clientContact?.trim();
  const generatedAt = formatDisplayDate(new Date().toISOString().slice(0, 10));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FieldReport — ${client}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 18mm 14mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: ${Palette.text};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      background: #fff;
    }
    .sheet { padding: 0; }
    .header {
      border-bottom: 3px solid ${Palette.primary};
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .brand {
      color: ${Palette.primary};
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 4px;
    }
    h1 {
      margin: 0;
      font-size: 20pt;
      line-height: 1.2;
      color: ${Palette.text};
    }
    .subtitle {
      margin: 6px 0 0;
      color: ${Palette.textSecondary};
      font-size: 10.5pt;
    }
    .meta {
      margin-top: 14px;
      width: 100%;
      border-collapse: collapse;
    }
    .meta td {
      vertical-align: top;
      padding: 4px 8px 4px 0;
    }
    .meta .label {
      width: 34%;
      color: ${Palette.textMuted};
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .section {
      margin: 0 0 16px;
      padding-top: 4px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 12pt;
      color: ${Palette.primaryDark};
      border-bottom: 1px solid ${Palette.border};
      padding-bottom: 4px;
    }
    p { margin: 0 0 8px; }
    .muted { color: ${Palette.textMuted}; }
    table.checklist {
      width: 100%;
      border-collapse: collapse;
    }
    table.checklist th,
    table.checklist td {
      text-align: left;
      padding: 7px 8px;
      border-bottom: 1px solid ${Palette.border};
      vertical-align: top;
    }
    table.checklist th {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: ${Palette.textMuted};
    }
    table.checklist td.status {
      width: 72px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status-pass { color: ${Palette.success}; }
    .status-fail { color: ${Palette.danger}; }
    .status-na, .status-pending { color: ${Palette.textMuted}; }
    ul.issues {
      margin: 0;
      padding-left: 18px;
    }
    ul.issues li { margin-bottom: 4px; }
    .photo-grid {
      display: block;
    }
    .photo-block {
      margin: 0 0 14px;
      padding: 8px;
      border: 1px solid ${Palette.border};
      border-radius: 6px;
      background: #fafcfe;
    }
    .photo-block img {
      display: block;
      width: 100%;
      max-height: 320px;
      object-fit: contain;
      background: #fff;
    }
    .photo-caption {
      margin: 8px 0 0;
      font-size: 9.5pt;
      color: ${Palette.textSecondary};
    }
    .photo-placeholder {
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 16px;
      color: ${Palette.textMuted};
      background: ${Palette.primaryLight};
      border: 1px dashed ${Palette.border};
      font-size: 10pt;
    }
    .keep-together {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid ${Palette.border};
      color: ${Palette.textMuted};
      font-size: 8.5pt;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="header keep-together">
      <p class="brand">FieldReport</p>
      <h1>Intervention report</h1>
      <p class="subtitle">${client} · ${displayOrDash(report.equipmentName)}</p>
      <table class="meta">
        <tr>
          <td class="label">Reference</td>
          <td>${escapeHtml(reportReference(report))}</td>
        </tr>
        <tr>
          <td class="label">Intervention date</td>
          <td>${escapeHtml(formatDisplayDate(report.interventionDate))}</td>
        </tr>
        <tr>
          <td class="label">Client / site</td>
          <td>${client}</td>
        </tr>
        ${
          contact
            ? `<tr><td class="label">Contact</td><td>${escapeHtml(contact)}</td></tr>`
            : ''
        }
        <tr>
          <td class="label">Equipment</td>
          <td>${displayOrDash(report.equipmentName)}</td>
        </tr>
        <tr>
          <td class="label">Problem</td>
          <td>${formatMultiline(report.problemDescription)}</td>
        </tr>
      </table>
    </header>

    <section class="section">
      <h2>Checklist results</h2>
      <table class="checklist">
        <thead>
          <tr><th>Item</th><th>Result</th></tr>
        </thead>
        <tbody>
          ${renderChecklistRows(report.checklist)}
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2>Observations &amp; recommendations</h2>
      <p>${formatMultiline(report.observations)}</p>
    </section>

    <section class="section">
      <h2>Detected issues</h2>
      ${renderIssues(report.identifiedIssues)}
    </section>

    ${renderPhotoSection('Before photos', beforePhotos)}
    ${renderPhotoSection('After photos', afterPhotos)}

    <footer class="footer keep-together">
      <span>Generated ${escapeHtml(generatedAt)} · FieldReport</span>
      <span>Status: Completed</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Build a client-ready PDF from a persisted report snapshot.
 * Does not mutate or save the report.
 */
export async function generateReportPdf(report: Report): Promise<GeneratedReportPdf> {
  assertCanExportReportPdf(report);

  const photos = report.photos ?? [];
  const resolved = await Promise.all(photos.map((photo) => resolvePhotoForPdf(photo)));
  const beforePhotos = resolved.filter((item) => item.photo.category === 'before');
  const afterPhotos = resolved.filter((item) => item.photo.category === 'after');

  const html = buildReportPdfHtml(report, beforePhotos, afterPhotos);
  const filename = buildReportPdfFilename(report);

  try {
    const printed = await Print.printToFileAsync({
      html,
      width: A4_WIDTH,
      height: A4_HEIGHT,
      ...(Platform.OS === 'ios'
        ? {
            margins: {
              top: 36,
              right: 36,
              bottom: 40,
              left: 36,
            },
          }
        : {}),
    });

    const uri = await persistPdfFile(printed.uri, filename);
    return {
      uri,
      printUri: printed.uri,
      numberOfPages: printed.numberOfPages,
      filename,
    };
  } catch (error) {
    if (error instanceof ReportPdfError) {
      throw error;
    }
    throw new ReportPdfError(
      'Could not generate the PDF. Please try again.',
      'generate',
    );
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  return String(error).toLowerCase();
}

/** iOS rejects printAsync when the sheet is closed without printing. */
function isPrintOrShareDismissed(error: unknown): boolean {
  const message = errorText(error);
  return (
    message.includes('printing did not complete') ||
    message.includes('incomplete') ||
    message.includes('cancel') ||
    message.includes('dismiss') ||
    message.includes('closed') ||
    message.includes('printer picker has been cancelled')
  );
}

async function openPdfWithShareSheet(
  pdf: GeneratedReportPdf,
  dialogTitle: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new ReportPdfError(
      'Opening local PDF files is limited on web.',
      'unavailable',
    );
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new ReportPdfError(
      'Sharing is not available on this device.',
      'unavailable',
    );
  }

  await Sharing.shareAsync(pdf.uri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}

export async function previewReportPdf(report: Report): Promise<GeneratedReportPdf> {
  const pdf = await generateReportPdf(report);

  try {
    // Prefer the cache URI expo-print just wrote — document copies can fail to open.
    await Print.printAsync({ uri: pdf.printUri });
    return pdf;
  } catch (error) {
    if (error instanceof ReportPdfError) {
      throw error;
    }
    if (isPrintOrShareDismissed(error)) {
      return pdf;
    }

    // Fall back to the system share sheet (Quick Look / Open With).
    try {
      await openPdfWithShareSheet(pdf, `Open ${pdf.filename}`);
      return pdf;
    } catch (shareError) {
      if (shareError instanceof ReportPdfError) {
        throw shareError;
      }
      if (isPrintOrShareDismissed(shareError)) {
        return pdf;
      }
      throw new ReportPdfError(
        'Could not open the PDF preview. You can still try Share PDF.',
        'preview',
      );
    }
  }
}

export async function shareReportPdf(report: Report): Promise<GeneratedReportPdf> {
  const pdf = await generateReportPdf(report);

  try {
    await openPdfWithShareSheet(pdf, `Share ${pdf.filename}`);
    return pdf;
  } catch (error) {
    if (error instanceof ReportPdfError) {
      throw error;
    }
    if (isPrintOrShareDismissed(error)) {
      return pdf;
    }
    throw new ReportPdfError(
      'Could not open the share sheet. Please try again.',
      'share',
    );
  }
}
