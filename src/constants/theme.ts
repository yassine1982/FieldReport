/**
 * FieldReport design tokens — professional blue / white palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  primary: '#2F6BFF',
  primaryDark: '#1E4FCC',
  primaryLight: '#EAF1FF',
  accent: '#2F6BFF',
  success: '#16A34A',
  successLight: '#E7F8EE',
  warning: '#D97706',
  warningLight: '#FFF4E0',
  danger: '#E11D48',
  dangerLight: '#FDE8EE',
  white: '#FFFFFF',
  background: '#F4F6FB',
  border: '#E4E9F1',
  text: '#121826',
  textSecondary: '#5C6778',
  textMuted: '#8B95A5',
  overlay: 'rgba(18, 24, 38, 0.45)',
} as const;

export const Colors = {
  light: {
    text: Palette.text,
    textSecondary: Palette.textSecondary,
    textMuted: Palette.textMuted,
    background: Palette.background,
    surface: Palette.white,
    backgroundElement: Palette.primaryLight,
    backgroundSelected: '#D6E8F8',
    border: Palette.border,
    primary: Palette.primary,
    primaryDark: Palette.primaryDark,
    primaryContrast: Palette.white,
    success: Palette.success,
    successLight: Palette.successLight,
    warning: Palette.warning,
    warningLight: Palette.warningLight,
    danger: Palette.danger,
    dangerLight: Palette.dangerLight,
    cardShadow: 'rgba(18, 24, 38, 0.06)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#A8B4C2',
    textMuted: '#7B8794',
    background: '#0B1220',
    surface: '#152033',
    backgroundElement: '#1C2B42',
    backgroundSelected: '#243752',
    border: '#2A3B55',
    primary: '#4CA0E8',
    primaryDark: '#208AEF',
    primaryContrast: '#041018',
    success: '#4ADE80',
    successLight: '#123124',
    warning: '#FB923C',
    warningLight: '#3A2414',
    danger: '#FB7185',
    dangerLight: '#3F1D2A',
    cardShadow: 'rgba(0, 0, 0, 0.35)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** 4pt spacing scale */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 40,
  eight: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Typography = {
  brand: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
} as const;

/** Minimum accessible touch target (Apple HIG / Material) */
export const TouchTarget = {
  min: 44,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
