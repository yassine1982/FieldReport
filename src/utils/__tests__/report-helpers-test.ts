import { buildReportSignature } from '@/services/signature-storage';
import { sampleDraft, sampleSignature } from '@/test/fixtures';
import type { ReportPhoto } from '@/types/report';
import {
  buildReport,
  computeDraftContentDigest,
  computeReportContentDigest,
  countCompletedThisMonth,
  formatCalendarDate,
  formatRelativeDay,
  reconcileSignatureWithContent,
  reportReference,
  toReportSummary,
} from '@/utils/report-helpers';

const existing = {
  id: 'report_fixed',
  createdAt: '2026-04-01T10:00:00.000Z',
};

describe('report content digest', () => {
  it('is stable for the same content and ignores signature metadata', () => {
    const draft = sampleDraft();
    const digest = computeDraftContentDigest(draft);

    expect(computeDraftContentDigest(draft)).toBe(digest);
    expect(
      computeReportContentDigest({
        ...draft,
        clientContact: draft.clientContact,
      }),
    ).toBe(digest);
    expect(computeDraftContentDigest({ ...draft, clientName: `  ${draft.clientName}  ` })).toBe(
      digest,
    );
    expect(
      computeDraftContentDigest({
        ...draft,
        identifiedIssues: [...draft.identifiedIssues, '   '],
      }),
    ).toBe(digest);
  });

  it('changes when checklist status or a photo caption changes', () => {
    const draft = sampleDraft();
    const digest = computeDraftContentDigest(draft);
    const photo: ReportPhoto = {
      id: 'photo_1',
      uri: 'file:///documents/report-photos/photo_1.jpg',
      category: 'before',
      caption: 'Nameplate',
      createdAt: '2026-04-01T11:00:00.000Z',
    };

    expect(
      computeDraftContentDigest({
        ...draft,
        checklist: draft.checklist.map((item) => ({ ...item, status: 'fail' })),
      }),
    ).not.toBe(digest);

    const withPhoto = computeDraftContentDigest({ ...draft, photos: [photo] });
    expect(withPhoto).not.toBe(digest);
    expect(
      computeDraftContentDigest({
        ...draft,
        photos: [{ ...photo, caption: 'Nameplate close-up' }],
      }),
    ).not.toBe(withPhoto);
  });
});

describe('needsReconfirmation', () => {
  it('clears the flag when the digest matches and sets it when content diverges', () => {
    const draft = sampleDraft();
    const digest = computeDraftContentDigest(draft);
    const signature = sampleSignature({ contentDigest: digest, needsReconfirmation: true });

    expect(reconcileSignatureWithContent(signature, digest)?.needsReconfirmation).toBe(false);
    expect(reconcileSignatureWithContent(undefined, digest)).toBeUndefined();

    const signed = buildReport(
      {
        ...draft,
        signature: buildReportSignature({
          uri: signature.uri,
          contentDigest: digest,
          signerName: '  Ada  ',
        }),
      },
      { status: 'completed', existing },
    );

    expect(signed.signature).toMatchObject({
      signerName: 'Ada',
      contentDigest: digest,
      needsReconfirmation: false,
    });
    expect(toReportSummary(signed).isSigned).toBe(true);

    const edited = buildReport(
      { ...draft, observations: 'Found a second leak', signature: signed.signature },
      { status: 'completed', existing },
    );
    expect(edited.signature?.needsReconfirmation).toBe(true);
    expect(edited.signature?.contentDigest).toBe(digest);
    expect(computeReportContentDigest(edited)).not.toBe(digest);
    expect(toReportSummary(edited).isSigned).toBe(false);

    const whitespaceOnly = buildReport(
      { ...draft, observations: `  ${draft.observations}  `, signature: signed.signature },
      { status: 'completed', existing },
    );
    expect(whitespaceOnly.signature?.needsReconfirmation).toBe(false);

    const blankIssue = buildReport(
      {
        ...draft,
        identifiedIssues: [...draft.identifiedIssues, '   '],
        signature: signed.signature,
      },
      { status: 'completed', existing },
    );
    expect(blankIssue.signature?.needsReconfirmation).toBe(false);
  });
});

describe('report display helpers', () => {
  const now = new Date(2026, 9, 14, 9, 0, 0);

  it('formats a stable reference and calendar or relative dates', () => {
    expect(reportReference('report_fixed')).toMatch(/^FR-\d{4}$/);
    expect(reportReference('report_fixed')).toBe(reportReference('report_fixed'));
    expect(formatCalendarDate('2026-10-14')).toBe('14 Oct 2026');
    expect(formatRelativeDay('2026-10-14', now)).toBe('Today');
    expect(formatRelativeDay('2026-10-13', now)).toBe('Yesterday');
    expect(formatRelativeDay('2026-10-10', now)).toBe('10 Oct 2026');
  });

  it('counts completed reports whose intervention date is in the current month', () => {
    const draft = sampleDraft();
    const completed = buildReport(
      { ...draft, interventionDate: '2026-10-14' },
      { status: 'completed', existing },
    );
    const older = buildReport(
      { ...draft, interventionDate: '2026-09-02' },
      { status: 'completed', existing: { ...existing, id: 'report_older' } },
    );
    const stillDraft = buildReport(draft, { status: 'draft', existing: { ...existing, id: 'report_draft' } });

    expect(countCompletedThisMonth([completed, older, stillDraft], now)).toBe(1);
  });
});
