import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { withStorageOperation } from '@/services/storage-operation';
import {
  DEFAULT_COMPANY_DISPLAY_NAME,
  type CompanyProfile,
  type CompanyProfileInput,
} from '@/types/company';

export const COMPANY_PROFILE_STORAGE_KEY = 'fieldreport.company.v1';
export const LOGO_DIR_NAME = 'company-assets';

export type CompanyProfileErrors = Partial<{
  companyName: string;
  email: string;
  phone: string;
  website: string;
  logo: string;
}>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

function logosDirectory(): Directory {
  return new Directory(Paths.document, LOGO_DIR_NAME);
}

export function ensureLogosDirectory(): Directory {
  const dir = logosDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionFromUri(uri: string): string {
  const cleaned = uri.split('?')[0] ?? uri;
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleaned);
  if (!match?.[1]) {
    return 'png';
  }
  const ext = match[1].toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg' || ext === 'png' || ext === 'heic' || ext === 'webp') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'png';
}

const PROFILE_KEYS = [
  'companyName',
  'logoUri',
  'email',
  'phone',
  'address',
  'website',
  'technicianName',
  'updatedAt',
] as const;

/**
 * Unsaved logo copied during this settings session. A save that is still in
 * flight must not delete the file — it may already be the stored profile logo.
 */
export function logoUriToDiscardOnLeave(options: {
  sessionLogoUri?: string;
  savedLogoUri?: string;
  saveInFlight: boolean;
}): string | undefined {
  if (options.saveInFlight) {
    return undefined;
  }
  const sessionLogoUri = options.sessionLogoUri;
  if (!sessionLogoUri || sessionLogoUri === options.savedLogoUri) {
    return undefined;
  }
  return sessionLogoUri;
}

export function logoFileExists(uri: string | undefined): boolean {
  if (!uri) {
    return false;
  }
  if (Platform.OS === 'web') {
    return true;
  }
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Copy a library picker URI into persistent document storage for the company logo.
 */
export async function persistLogoFromUri(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  return withStorageOperation(async () => {
    const dir = ensureLogosDirectory();
    const filename = `logo_${Date.now()}.${extensionFromUri(sourceUri)}`;
    const destination = new File(dir, filename);
    const source = new File(sourceUri);

    if (!source.exists) {
      throw new Error('Selected logo is no longer available.');
    }

    await source.copy(destination);

    if (!destination.exists) {
      throw new Error('Could not store the logo on this device.');
    }

    return destination.uri;
  });
}

export async function deleteLogoFile(uri: string | undefined): Promise<void> {
  if (Platform.OS === 'web' || !uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Missing or unreadable files are non-fatal during cleanup.
  }
}

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validateCompanyProfileInput(
  input: CompanyProfileInput,
): CompanyProfileErrors {
  const errors: CompanyProfileErrors = {};

  if (input.email.trim() && !EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (input.website.trim() && !WEBSITE_PATTERN.test(input.website.trim())) {
    errors.website = 'Enter a valid website (e.g. example.com).';
  }
  if (input.phone.trim() && input.phone.trim().length < 5) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (input.logoUri && Platform.OS !== 'web' && !logoFileExists(input.logoUri)) {
    errors.logo = 'Logo file is missing. Choose a new image.';
  }

  return errors;
}

/** Company name is required for a fully branded PDF; unset uses a fallback. */
export function resolveCompanyDisplayName(profile: CompanyProfile | null): string {
  const name = profile?.companyName?.trim();
  return name && name.length > 0 ? name : DEFAULT_COMPANY_DISPLAY_NAME;
}

export function hasCompanyBrandingName(profile: CompanyProfile | null): boolean {
  return Boolean(profile?.companyName?.trim());
}

export function profileToInput(profile: CompanyProfile | null): CompanyProfileInput {
  return {
    companyName: profile?.companyName ?? '',
    logoUri: profile?.logoUri,
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    website: profile?.website ?? '',
    technicianName: profile?.technicianName ?? '',
  };
}

export function buildCompanyProfile(input: CompanyProfileInput): CompanyProfile {
  const logoUri =
    input.logoUri && logoFileExists(input.logoUri)
      ? input.logoUri
      : input.logoUri && Platform.OS === 'web'
        ? input.logoUri
        : undefined;

  return {
    companyName: input.companyName.trim(),
    logoUri,
    email: optionalTrimmed(input.email),
    phone: optionalTrimmed(input.phone),
    address: optionalTrimmed(input.address),
    website: optionalTrimmed(input.website),
    technicianName: optionalTrimmed(input.technicianName),
    updatedAt: new Date().toISOString(),
  };
}

function isCompanyProfile(value: unknown): value is CompanyProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.companyName === 'string' &&
    typeof profile.updatedAt === 'string' &&
    (profile.logoUri === undefined || typeof profile.logoUri === 'string') &&
    (profile.email === undefined || typeof profile.email === 'string') &&
    (profile.phone === undefined || typeof profile.phone === 'string') &&
    (profile.address === undefined || typeof profile.address === 'string') &&
    (profile.website === undefined || typeof profile.website === 'string') &&
    (profile.technicianName === undefined || typeof profile.technicianName === 'string')
  );
}

function hasUnknownProfileKeys(value: CompanyProfile): boolean {
  return Object.keys(value).some(
    (key) => !PROFILE_KEYS.includes(key as (typeof PROFILE_KEYS)[number]),
  );
}

function normalizeCompanyProfile(value: unknown): {
  profile: CompanyProfile;
  changed: boolean;
} | null {
  if (!isCompanyProfile(value)) {
    return null;
  }

  let logoUri = value.logoUri;
  if (logoUri && Platform.OS !== 'web' && !logoFileExists(logoUri)) {
    logoUri = undefined;
  }

  const profile: CompanyProfile = {
    companyName: value.companyName.trim(),
    logoUri,
    email: optionalTrimmed(value.email),
    phone: optionalTrimmed(value.phone),
    address: optionalTrimmed(value.address),
    website: optionalTrimmed(value.website),
    technicianName: optionalTrimmed(value.technicianName),
    updatedAt: value.updatedAt,
  };

  const changed =
    hasUnknownProfileKeys(value) ||
    profile.companyName !== value.companyName ||
    profile.logoUri !== value.logoUri ||
    profile.email !== value.email ||
    profile.phone !== value.phone ||
    profile.address !== value.address ||
    profile.website !== value.website ||
    profile.technicianName !== value.technicianName;

  return { profile, changed };
}

export async function loadCompanyProfile(): Promise<CompanyProfile | null> {
  const raw = await AsyncStorage.getItem(COMPANY_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const normalized = normalizeCompanyProfile(parsed);
    if (!normalized) {
      return null;
    }
    if (normalized.changed) {
      await saveCompanyProfile(normalized.profile);
    }
    return normalized.profile;
  } catch {
    return null;
  }
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  return withStorageOperation(async () => {
    await AsyncStorage.setItem(COMPANY_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return profile;
  });
}

/**
 * Persist profile and replace the logo file, deleting the previous logo when
 * the saved URI changes. Refuses to save when a requested logo file is missing
 * so the previous logo is not deleted by accident.
 */
export async function upsertCompanyProfile(
  input: CompanyProfileInput,
  previous: CompanyProfile | null,
): Promise<CompanyProfile> {
  const next = buildCompanyProfile(input);
  if (input.logoUri && !next.logoUri) {
    throw new Error('Logo file is missing. Choose a new image.');
  }
  await saveCompanyProfile(next);

  if (previous?.logoUri && previous.logoUri !== next.logoUri) {
    try {
      await deleteLogoFile(previous.logoUri);
    } catch {
      // Best-effort cleanup of the replaced logo.
    }
  }

  return next;
}
