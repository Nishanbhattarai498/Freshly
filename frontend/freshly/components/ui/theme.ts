export const palette = {
  primary: '#0f766e',
  primarySoft: '#14b8a6',
  secondary: '#0ea5e9',
  accent: '#f59e0b',
  sky: '#38bdf8',
  mint: '#6ee7b7',
  surfaceLight: '#f8fafc',
  surfaceDark: '#0b1220',
  cardLight: '#ffffff',
  cardDark: '#111827',
  borderLight: '#e2e8f0',
  borderDark: '#334155',
  textPrimaryLight: '#0f172a',
  textPrimaryDark: '#f8fafc',
  textSecondaryLight: '#475569',
  textSecondaryDark: '#94a3b8',
  brandGradientA: '#0ea5e9',
  brandGradientB: '#10b981',
  brandGradientDarkA: '#0f172a',
  brandGradientDarkB: '#064e3b',
  danger: '#ef4444',
  success: '#10b981',
};

export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 999,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const gradients = {
  heroLight: [palette.brandGradientA, palette.brandGradientB] as const,
  heroDark: [palette.brandGradientDarkA, palette.brandGradientDarkB] as const,
  panelLight: ['#ffffff', '#f8fafc'] as const,
  panelDark: ['#111827', '#0f172a'] as const,
};

export const getThemeTokens = (isDark: boolean) => ({
  bg: isDark ? palette.surfaceDark : palette.surfaceLight,
  card: isDark ? palette.cardDark : palette.cardLight,
  border: isDark ? palette.borderDark : palette.borderLight,
  textPrimary: isDark ? palette.textPrimaryDark : palette.textPrimaryLight,
  textSecondary: isDark ? palette.textSecondaryDark : palette.textSecondaryLight,
});