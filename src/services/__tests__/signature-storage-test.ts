import { buildReportSignature, isSignatureCurrent, signatureUriToDiscard } from '@/services/signature-storage';
import { setMockFileExists } from '@/test/expo-file-system-mock';
import { SIGNATURE_URI, sampleSignature } from '@/test/fixtures';
import { DEFAULT_SIGNATURE_CONSENT_LABEL } from '@/types/company';

describe('signature capture metadata', () => {
  it('trims the signer name and records a current signature', () => {
    const signature = buildReportSignature({
      uri: SIGNATURE_URI,
      contentDigest: 'fnv1a_abc',
      signerName: '  Ada Lovelace  ',
      consentLabel: '  I agree  ',
      signedAt: '2026-04-02T15:30:00.000Z',
    });

    expect(signature).toEqual({
      uri: SIGNATURE_URI,
      signerName: 'Ada Lovelace',
      signedAt: '2026-04-02T15:30:00.000Z',
      consentLabel: 'I agree',
      contentDigest: 'fnv1a_abc',
      needsReconfirmation: false,
    });
  });

  it('uses the default consent label and omits a blank signer name', () => {
    const signature = buildReportSignature({
      uri: SIGNATURE_URI,
      contentDigest: 'fnv1a_abc',
      signerName: '   ',
      signedAt: '2026-04-02T15:30:00.000Z',
    });

    expect(signature.signerName).toBeUndefined();
    expect(signature.consentLabel).toBe(DEFAULT_SIGNATURE_CONSENT_LABEL);
    expect(signature.needsReconfirmation).toBe(false);
  });
});

describe('signatureUriToDiscard', () => {
  it('returns only a uri that is not already committed on the report', () => {
    expect(signatureUriToDiscard(undefined, SIGNATURE_URI)).toBeUndefined();
    expect(signatureUriToDiscard(SIGNATURE_URI, SIGNATURE_URI)).toBeUndefined();
    expect(signatureUriToDiscard('file:///documents/report-signatures/new.png', SIGNATURE_URI)).toBe(
      'file:///documents/report-signatures/new.png',
    );
    expect(signatureUriToDiscard('file:///documents/report-signatures/new.png', undefined)).toBe(
      'file:///documents/report-signatures/new.png',
    );
  });
});

describe('isSignatureCurrent', () => {
  it('requires a stored file and a signature that does not need reconfirmation', () => {
    const signature = sampleSignature();
    setMockFileExists(SIGNATURE_URI, true);

    expect(isSignatureCurrent(signature)).toBe(true);
    expect(isSignatureCurrent({ ...signature, needsReconfirmation: true })).toBe(false);
    expect(isSignatureCurrent(undefined)).toBe(false);

    setMockFileExists(SIGNATURE_URI, false);
    expect(isSignatureCurrent(signature)).toBe(false);
  });
});
