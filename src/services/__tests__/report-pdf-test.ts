import {
  assertCanExportReportPdf,
  buildReportPdfHtml,
  canExportReportPdf,
  ReportPdfError,
} from '@/services/report-pdf';
import { setMockFileExists } from '@/test/expo-file-system-mock';
import { SIGNATURE_URI, sampleReport, sampleSignature } from '@/test/fixtures';
import type { CompanyProfile } from '@/types/company';
import { DEFAULT_COMPANY_DISPLAY_NAME } from '@/types/company';

const company: CompanyProfile = {
  companyName: 'Acme & Co <field>',
  email: 'tech@acme.test',
  phone: '555-0100',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

function html(options: Partial<Parameters<typeof buildReportPdfHtml>[0]> = {}): string {
  const report = options.report ?? sampleReport();
  return buildReportPdfHtml({
    report,
    beforePhotos: [],
    afterPhotos: [],
    companyProfile: null,
    logo: null,
    signatureImage: null,
    ...options,
  });
}

describe('PDF generation without logo or signature files', () => {
  it('renders the default company name and an unsigned report when both are absent', () => {
    const markup = html();

    expect(markup).toContain(DEFAULT_COMPANY_DISPLAY_NAME);
    expect(markup).toContain('(default)');
    expect(markup).not.toContain('class="company-logo"');
    expect(markup).not.toContain('Logo unavailable');
    expect(markup).toContain('Not signed');
    expect(markup).toContain('This report has not been signed.');
    expect(markup).toContain('Unsigned');
    expect(markup).not.toContain('class="signature-image"');
    expect(markup).not.toContain('tech@acme.test');
  });

  it('shows a logo placeholder when the logo file cannot be read and escapes the company name', () => {
    const markup = html({
      companyProfile: company,
      logo: { dataUri: null, unavailableReason: 'Logo file unavailable' },
    });

    expect(markup).toContain('Acme &amp; Co &lt;field&gt;');
    expect(markup).not.toContain('(default)');
    expect(markup).toContain('Logo unavailable');
    expect(markup).not.toContain('class="company-logo"');
    expect(markup).toContain('tech@acme.test');
    expect(markup).toContain('555-0100');
  });

  it('embeds a logo when the image data is available', () => {
    const markup = html({
      companyProfile: { ...company, companyName: 'Acme' },
      logo: { dataUri: 'data:image/png;base64,LOGO' },
    });

    expect(markup).toContain('class="company-logo"');
    expect(markup).toContain('src="data:image/png;base64,LOGO"');
    expect(markup).not.toContain('Logo unavailable');
  });

  it('explains a missing signature image even if the signature also needs reconfirmation', () => {
    const markup = html({
      report: sampleReport({
        signature: sampleSignature({ needsReconfirmation: true }),
      }),
    });

    expect(markup).toContain('Signature image is missing from device storage.');
    expect(markup).not.toContain('needs reconfirmation');
    expect(markup).not.toContain('class="signature-image"');
    expect(markup).toContain('Unsigned');
  });

  it('keeps a signature unsigned when the file exists but the report content needs reconfirmation', () => {
    setMockFileExists(SIGNATURE_URI, true);
    const markup = html({
      report: sampleReport({
        signature: sampleSignature({ needsReconfirmation: true }),
      }),
      signatureImage: { dataUri: 'data:image/png;base64,SIG' },
    });

    expect(markup).toContain('Signature on file needs reconfirmation after report edits.');
    expect(markup).not.toContain('class="signature-image"');
    expect(markup).not.toContain('data:image/png;base64,SIG');
    expect(markup).toContain('Unsigned');
  });

  it('embeds a current signature and does not call it unsigned', () => {
    setMockFileExists(SIGNATURE_URI, true);
    const markup = html({
      report: sampleReport({
        signature: sampleSignature({
          signerName: 'Ada Lovelace',
          consentLabel: 'I agree & confirm <ok>',
        }),
      }),
      signatureImage: { dataUri: 'data:image/png;base64,SIG' },
    });

    expect(markup).toContain('class="signature-image"');
    expect(markup).toContain('src="data:image/png;base64,SIG"');
    expect(markup).toContain('Ada Lovelace');
    expect(markup).toContain('I agree &amp; confirm &lt;ok&gt;');
    expect(markup).toContain('Signed');
    expect(markup).not.toContain('Not signed');
    expect(markup).not.toContain('Unsigned');
  });

  it('refuses to export a draft', () => {
    const draft = sampleReport({ status: 'draft' });
    expect(canExportReportPdf(draft)).toBe(false);
    expect(canExportReportPdf(sampleReport())).toBe(true);
    expect(() => assertCanExportReportPdf(draft)).toThrow(ReportPdfError);
    expect(() => assertCanExportReportPdf(draft)).toThrow(
      'Complete this report before exporting a PDF.',
    );
  });
});
