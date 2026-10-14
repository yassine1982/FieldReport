import { buildReportSignature } from '@/services/signature-storage';
import { sampleDraft, sampleSignature } from '@/test/fixtures';
import type { ReportPhoto } from '@/types/report';
import {
  buildReport,
  computeDraftContentDigest,
  computeReportContentDigest,
  reconcileSignatureWithContent,
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
