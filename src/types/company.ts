export type CompanyProfile = {
  companyName: string;
  /** Persistent local file URI under the app document directory */
  logoUri?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  technicianName?: string;
  updatedAt: string;
};

export type CompanyProfileInput = {
  companyName: string;
  logoUri?: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  technicianName: string;
};

export const EMPTY_COMPANY_PROFILE_INPUT: CompanyProfileInput = {
  companyName: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  technicianName: '',
};

/** Display name used in PDFs when company name is unset. */
export const DEFAULT_COMPANY_DISPLAY_NAME = 'Independent technician';

export const DEFAULT_SIGNATURE_CONSENT_LABEL =
  'I confirm that I have reviewed this intervention report and acknowledge the work described. This signature is captured as part of the report record and is not a qualified electronic signature.';
