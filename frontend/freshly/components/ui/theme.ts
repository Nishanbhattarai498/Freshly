const palette = {
  forest: '#0f766e',
  forestDeep: '#134e4a',
  mint: '#2dd4bf',
  lime: '#84cc16',
  sky: '#38bdf8',
  coral: '#fb7185',
  amber: '#f59e0b',
  ink: '#0f172a',
  midnight: '#06131f',
  slate: '#475569',
  mist: '#e2e8f0',
  cloud: '#f8fafc',
  white: '#ffffff',
  success: '#16a34a',
  danger: '#e11d48',
  warning: '#d97706',
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
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

export const typography = {
  fontFamily: 'System',
  hero: { fontSize: 34, fontWeight: '900' as const, lineHeight: 40 },
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '800' as const, lineHeight: 28 },
  title: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  small: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
};

export const gradients = {
  auroraLight: ['#f3fff9', '#d7f7ea', '#d9efff'] as const,
  auroraDark: ['#07141d', '#0d2225', '#11342e'] as const,
  heroLight: ['#0f766e', '#14b8a6', '#38bdf8'] as const,
  heroDark: ['#0b1822', '#12352e', '#0f766e'] as const,
  cardLight: ['#ffffff', '#f7fbff'] as const,
  cardDark: ['#0f172a', '#111f2d'] as const,
  accent: ['#14b8a6', '#84cc16'] as const,
  danger: ['#fb7185', '#e11d48'] as const,
};

export const shadows = {
  soft: {
    shadowColor: '#08111d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  medium: {
    shadowColor: '#08111d',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
};

export const getThemeTokens = (isDark: boolean) => ({
  bg: isDark ? '#051019' : '#f4f8f6',
  bgElevated: isDark ? '#0b1822' : '#fbfefd',
  card: isDark ? 'rgba(11,24,34,0.92)' : 'rgba(255,255,255,0.96)',
  cardMuted: isDark ? '#102232' : '#eef6f3',
  border: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
  borderStrong: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.12)',
  textPrimary: isDark ? '#f8fafc' : '#0f172a',
  textSecondary: isDark ? '#b6c4d3' : '#516072',
  textMuted: isDark ? '#8da0b5' : '#7a8a9d',
  inputBg: isDark ? 'rgba(8,22,33,0.94)' : '#ffffff',
  inputBorder: isDark ? 'rgba(148,163,184,0.16)' : '#dbe5ec',
  tint: palette.mint,
  tintStrong: palette.forest,
  success: palette.success,
  danger: palette.danger,
});

const theme = {
  palette,
  typography,
  radii,
  spacing,
  gradients,
  shadows,
  layout: {
    radius: radii.lg,
    spacing,
  },
};

export default theme;
