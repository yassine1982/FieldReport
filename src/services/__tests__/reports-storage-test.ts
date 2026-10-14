import AsyncStorage from '@react-native-async-storage/async-storage';

import { REPORTS_STORAGE_KEY, loadReports, upsertReport } from '@/services/reports-storage';
import { setMockFileExists } from '@/test/expo-file-system-mock';
import { SIGNATURE_URI, sampleReport, sampleSignature } from '@/test/fixtures';
import type { Report } from '@/types/report';
import { computeReportContentDigest, toReportSummary } from '@/utils/report-helpers';

async function seedReports(reports: Report[]): Promise<void> {
  await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

async function readStoredReports(): Promise<Report[]> {
  const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
  return JSON.parse(raw ?? '[]') as Report[];
}

describe('signature metadata validation', () => {
  it('drops a signature with blank required fields and keeps the report', async () => {
    setMockFileExists(SIGNATURE_URI, true);
    await seedReports([
      sampleReport({
        signature: sampleSignature({ consentLabel: '   ' }),
      }),
      sampleReport({
        id: 'report_other',
        clientName: 'Other site',
      }),
    ]);

    const loaded = await loadReports();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.signature).toBeUndefined();
    expect(loaded[1]?.clientName).toBe('Other site');

    const stored = await readStoredReports();
    expect(stored[0]?.signature).toBeUndefined();
    expect(stored[1]?.id).toBe('report_other');
  });

  it('drops a signature whose image file is missing', async () => {
    await seedReports([
      sampleReport({
        signature: sampleSignature({
          contentDigest: computeReportContentDigest(sampleReport()),
        }),
      }),
    ]);

    const [loaded] = await loadReports();
    expect(loaded?.signature).toBeUndefined();
    expect(toReportSummary(loaded!).isSigned).toBe(false);
    expect((await readStoredReports())[0]?.signature).toBeUndefined();
  });

  it('trims signer and consent text and persists the canonical signature', async () => {
    setMockFileExists(SIGNATURE_URI, true);
    const report = sampleReport();
    const digest = computeReportContentDigest(report);
    await seedReports([
      sampleReport({
        signature: sampleSignature({
          signerName: '  Ada Lovelace  ',
          consentLabel: '  I agree  ',
          contentDigest: digest,
          needsReconfirmation: false,
        }),
      }),
    ]);

    const [loaded] = await loadReports();
    expect(loaded?.signature).toMatchObject({
      signerName: 'Ada Lovelace',
      consentLabel: 'I agree',
      contentDigest: digest,
      needsReconfirmation: false,
    });

    const stored = (await readStoredReports())[0]?.signature;
    expect(stored?.signerName).toBe('Ada Lovelace');
    expect(stored?.consentLabel).toBe('I agree');
  });

  it('rejects a signature whose needsReconfirmation flag is not boolean', async () => {
    setMockFileExists(SIGNATURE_URI, true);
    const report = sampleReport({
      signature: sampleSignature(),
    });
    const malformed = {
      ...report,
      signature: {
        ...report.signature,
        needsReconfirmation: 'yes',
      },
    };
    await seedReports([malformed as unknown as Report]);

    const [loaded] = await loadReports();
    expect(loaded?.signature).toBeUndefined();
  });
});

describe('needsReconfirmation on load', () => {
  it('marks a signature stale when the stored digest does not match report content', async () => {
    setMockFileExists(SIGNATURE_URI, true);
    await seedReports([
      sampleReport({
        signature: sampleSignature({
          contentDigest: 'fnv1a_stale',
          needsReconfirmation: false,
        }),
      }),
    ]);

    const [loaded] = await loadReports();
    expect(loaded?.signature?.needsReconfirmation).toBe(true);
    expect(loaded?.signature?.contentDigest).toBe('fnv1a_stale');
    expect(toReportSummary(loaded!).isSigned).toBe(false);
    expect((await readStoredReports())[0]?.signature?.needsReconfirmation).toBe(true);
  });

  it('clears a stale reconfirmation flag when the digest still matches', async () => {
    setMockFileExists(SIGNATURE_URI, true);
    const report = sampleReport();
    const digest = computeReportContentDigest(report);
    await seedReports([
      sampleReport({
        signature: sampleSignature({
          contentDigest: digest,
          needsReconfirmation: true,
        }),
      }),
    ]);

    const [loaded] = await loadReports();
    expect(loaded?.signature?.needsReconfirmation).toBe(false);
    expect(loaded?.signature?.contentDigest).toBe(digest);
    expect(toReportSummary(loaded!).isSigned).toBe(true);
    expect((await readStoredReports())[0]?.signature?.needsReconfirmation).toBe(false);
  });
});

describe('upsertReport', () => {
  it('inserts a new id at the front and replaces an existing id in place', async () => {
    const first = sampleReport({ id: 'report_a', clientName: 'Alpha' });
    const second = sampleReport({ id: 'report_b', clientName: 'Beta' });

    expect((await upsertReport(first)).map((report) => report.id)).toEqual(['report_a']);
    expect((await upsertReport(second)).map((report) => report.id)).toEqual([
      'report_b',
      'report_a',
    ]);

    const updated = sampleReport({
      id: 'report_a',
      clientName: 'Alpha updated',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    const afterUpdate = await upsertReport(updated);

    expect(afterUpdate.map((report) => report.id)).toEqual(['report_b', 'report_a']);
    expect(afterUpdate.find((report) => report.id === 'report_a')?.clientName).toBe(
      'Alpha updated',
    );
    expect(afterUpdate.filter((report) => report.id === 'report_a')).toHaveLength(1);

    const stored = await loadReports();
    expect(stored.find((report) => report.id === 'report_a')?.clientName).toBe('Alpha updated');
    expect(stored.find((report) => report.id === 'report_b')?.clientName).toBe('Beta');
  });

  it('stores a signature on the matching report id', async () => {
    setMockFileExists(SIGNATURE_URI, true);
    const report = sampleReport();
    const digest = computeReportContentDigest(report);
    await upsertReport(report);

    const signed = sampleReport({
      signature: sampleSignature({ contentDigest: digest }),
      updatedAt: '2026-04-03T00:00:00.000Z',
    });
    await upsertReport(signed);

    const [loaded] = await loadReports();
    expect(loaded?.id).toBe(report.id);
    expect(loaded?.signature).toMatchObject({
      uri: SIGNATURE_URI,
      contentDigest: digest,
      needsReconfirmation: false,
    });
    expect(await loadReports()).toHaveLength(1);
  });
});
