import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  COMPANY_PROFILE_STORAGE_KEY,
  loadCompanyProfile,
  logoUriToDiscardOnLeave,
  profileToInput,
  resolveCompanyDisplayName,
  saveCompanyProfile,
  upsertCompanyProfile,
  validateCompanyProfileInput,
  hasCompanyBrandingName,
} from '@/services/company-storage';
import { mockDeletedFileUris, setMockFileExists } from '@/test/expo-file-system-mock';
import { LOGO_URI, REPLACEMENT_LOGO_URI } from '@/test/fixtures';
import {
  EMPTY_COMPANY_PROFILE_INPUT,
  type CompanyProfile,
  type CompanyProfileInput,
} from '@/types/company';

function profileInput(overrides: Partial<CompanyProfileInput> = {}): CompanyProfileInput {
  return {
    ...EMPTY_COMPANY_PROFILE_INPUT,
    companyName: 'Acme',
    ...overrides,
  };
}

function storedProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    companyName: 'Acme',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

async function readStoredProfile(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('company profile serialization', () => {
  it('saves a trimmed profile and restores empty optional fields as form strings', async () => {
    setMockFileExists(LOGO_URI, true);

    const saved = await upsertCompanyProfile(
      profileInput({
        companyName: '  Acme Field  ',
        logoUri: LOGO_URI,
        email: '  tech@acme.test  ',
        phone: '   ',
        address: '  1 Main St  ',
        website: ' example.com ',
        technicianName: '  Ada  ',
      }),
      null,
    );

    expect(saved).toMatchObject({
      companyName: 'Acme Field',
      logoUri: LOGO_URI,
      email: 'tech@acme.test',
      address: '1 Main St',
      website: 'example.com',
      technicianName: 'Ada',
    });
    expect(saved.phone).toBeUndefined();
    expect(saved.updatedAt).toEqual(expect.any(String));

    const restored = await loadCompanyProfile();
    expect(restored).toEqual(saved);

    const form = profileToInput(restored);
    expect(form).toEqual({
      companyName: 'Acme Field',
      logoUri: LOGO_URI,
      email: 'tech@acme.test',
      phone: '',
      address: '1 Main St',
      website: 'example.com',
      technicianName: 'Ada',
    });

    const raw = await readStoredProfile();
    expect(raw).toMatchObject({
      companyName: 'Acme Field',
      logoUri: LOGO_URI,
      email: 'tech@acme.test',
    });
    expect(raw?.phone).toBeUndefined();
  });

  it('rewrites stored whitespace and drops unknown keys on load', async () => {
    await AsyncStorage.setItem(
      COMPANY_PROFILE_STORAGE_KEY,
      JSON.stringify({
        companyName: '  Acme  ',
        email: '  tech@acme.test  ',
        phone: '   ',
        notes: 'ignore me',
        updatedAt: '2026-04-01T10:00:00.000Z',
      }),
    );

    const loaded = await loadCompanyProfile();
    expect(loaded).toMatchObject({
      companyName: 'Acme',
      email: 'tech@acme.test',
      updatedAt: '2026-04-01T10:00:00.000Z',
    });
    expect(loaded?.phone).toBeUndefined();
    expect(loaded?.logoUri).toBeUndefined();

    const raw = await readStoredProfile();
    expect(raw).toEqual({
      companyName: 'Acme',
      email: 'tech@acme.test',
      updatedAt: '2026-04-01T10:00:00.000Z',
    });
  });

  it('returns null for corrupt or incomplete profiles without overwriting storage', async () => {
    await AsyncStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, '{');
    await expect(loadCompanyProfile()).resolves.toBeNull();
    expect(await AsyncStorage.getItem(COMPANY_PROFILE_STORAGE_KEY)).toBe('{');

    await AsyncStorage.setItem(
      COMPANY_PROFILE_STORAGE_KEY,
      JSON.stringify({ companyName: 'Acme' }),
    );
    await expect(loadCompanyProfile()).resolves.toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(COMPANY_PROFILE_STORAGE_KEY)) ?? '')).toEqual({
      companyName: 'Acme',
    });
  });

  it('clears a missing logo file and keeps the rest of the profile', async () => {
    setMockFileExists(LOGO_URI, true);
    const saved = await saveCompanyProfile(storedProfile({ logoUri: LOGO_URI }));
    setMockFileExists(LOGO_URI, false);

    const loaded = await loadCompanyProfile();
    expect(loaded?.logoUri).toBeUndefined();
    expect(loaded?.companyName).toBe('Acme');
    expect(loaded?.updatedAt).toBe(saved.updatedAt);
    expect((await readStoredProfile())?.logoUri).toBeUndefined();
  });

  it('does not rewrite a profile that is already canonical', async () => {
    setMockFileExists(LOGO_URI, true);
    await saveCompanyProfile(
      storedProfile({
        logoUri: LOGO_URI,
        email: 'tech@acme.test',
      }),
    );
    const writes = (AsyncStorage.setItem as jest.Mock).mock.calls.length;

    const loaded = await loadCompanyProfile();
    expect(loaded?.logoUri).toBe(LOGO_URI);
    expect((AsyncStorage.setItem as jest.Mock).mock.calls.length).toBe(writes);
  });
});

describe('company logo replacement', () => {
  it('replaces the stored logo and deletes only the previous file', async () => {
    setMockFileExists(LOGO_URI, true);
    setMockFileExists(REPLACEMENT_LOGO_URI, true);
    const previous = await saveCompanyProfile(storedProfile({ logoUri: LOGO_URI }));

    const next = await upsertCompanyProfile(
      profileInput({ logoUri: REPLACEMENT_LOGO_URI }),
      previous,
    );

    expect(next.logoUri).toBe(REPLACEMENT_LOGO_URI);
    expect(mockDeletedFileUris()).toEqual([LOGO_URI]);
    expect((await loadCompanyProfile())?.logoUri).toBe(REPLACEMENT_LOGO_URI);
  });

  it('refuses to save when the requested logo file is missing and keeps the previous logo', async () => {
    setMockFileExists(LOGO_URI, true);
    const previous = await saveCompanyProfile(storedProfile({ logoUri: LOGO_URI }));
    const before = await AsyncStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);

    await expect(
      upsertCompanyProfile(profileInput({ logoUri: REPLACEMENT_LOGO_URI }), previous),
    ).rejects.toThrow('Logo file is missing. Choose a new image.');

    expect(await AsyncStorage.getItem(COMPANY_PROFILE_STORAGE_KEY)).toBe(before);
    expect(mockDeletedFileUris()).toEqual([]);
    expect((await loadCompanyProfile())?.logoUri).toBe(LOGO_URI);
  });

  it('decides which unsaved logo to delete when leaving settings', () => {
    expect(
      logoUriToDiscardOnLeave({
        sessionLogoUri: REPLACEMENT_LOGO_URI,
        savedLogoUri: LOGO_URI,
        saveInFlight: false,
      }),
    ).toBe(REPLACEMENT_LOGO_URI);

    expect(
      logoUriToDiscardOnLeave({
        sessionLogoUri: LOGO_URI,
        savedLogoUri: LOGO_URI,
        saveInFlight: false,
      }),
    ).toBeUndefined();

    expect(
      logoUriToDiscardOnLeave({
        sessionLogoUri: REPLACEMENT_LOGO_URI,
        savedLogoUri: LOGO_URI,
        saveInFlight: true,
      }),
    ).toBeUndefined();

    expect(
      logoUriToDiscardOnLeave({
        savedLogoUri: LOGO_URI,
        saveInFlight: false,
      }),
    ).toBeUndefined();
  });
});

describe('company profile validation', () => {
  it('accepts an empty optional profile and a present logo file', () => {
    setMockFileExists(LOGO_URI, true);
    expect(validateCompanyProfileInput(profileInput({ logoUri: LOGO_URI }))).toEqual({});
  });

  it('rejects invalid contact fields and a missing logo file', () => {
    expect(
      validateCompanyProfileInput(
        profileInput({
          email: 'not-an-email',
          phone: '1234',
          website: 'not a url',
          logoUri: LOGO_URI,
        }),
      ),
    ).toEqual({
      email: 'Enter a valid email address.',
      phone: 'Enter a valid phone number.',
      website: 'Enter a valid website (e.g. example.com).',
      logo: 'Logo file is missing. Choose a new image.',
    });
  });

  it('uses the independent-technician fallback when the company name is blank', () => {
    expect(resolveCompanyDisplayName(null)).toBe('Independent technician');
    expect(hasCompanyBrandingName(null)).toBe(false);
    expect(resolveCompanyDisplayName(storedProfile({ companyName: '   ' }))).toBe(
      'Independent technician',
    );
    expect(hasCompanyBrandingName(storedProfile({ companyName: 'Acme' }))).toBe(true);
    expect(resolveCompanyDisplayName(storedProfile({ companyName: 'Acme' }))).toBe('Acme');
  });
});
