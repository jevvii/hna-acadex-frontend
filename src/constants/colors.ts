// src/constants/colors.ts
export const Colors = {
  primary: '#1A3A6B',
  primaryDark: '#0F2147',
  primaryLight: '#2E5FA3',
  accentRed: '#C0272D',
  accentGold: '#D4A017',
  accentRope: '#C8A96E',
  success: '#10B981',

  light: {
    background: '#F4F6FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    textPrimary: '#1A3A6B',
    textSecondary: '#5A6A85',
    border: '#E2E8F0',
    muted: '#F1F5F9',
    mutedForeground: '#94A3B8',
    tabBar: '#FFFFFF',
    tabBarActive: '#1A3A6B',
    tabBarInactive: '#5A6A85',
  },
  dark: {
    background: '#0D1B2A',
    surface: '#1A2A3D',
    card: '#1E3048',
    textPrimary: '#E8EDF5',
    textSecondary: '#8FA3BE',
    border: '#2A3F5A',
    muted: '#1A2A3D',
    mutedForeground: '#5A6A85',
    tabBar: '#0F2147',
    tabBarActive: '#2E5FA3',
    tabBarInactive: '#8FA3BE',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const Typography = {
  heading1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading2: { fontSize: 22, fontWeight: '700' as const },
  heading3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
};

export const Shadows = {
  card: {
    shadowColor: '#1A3A6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  sm: {
    shadowColor: '#1A3A6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
};

// Attendance status colors for Roll Call feature
export const StatusColors = {
  present: '#4CAF50',
  presentBorder: '#388E3C',
  presentBg: '#E8F5E9',
  absent: '#E53935',
  absentBorder: '#B71C1C',
  absentBg: '#FFEBEE',
  late: '#FFA000',
  lateBorder: '#E65100',
  lateBg: '#FFF3E0',
  excused: '#888888',
  excusedBorder: '#AAAAAA',
  excusedBg: '#F5F5F5',
  unmarked: '#E0E0E0',
  unmarkedBorder: '#BDBDBD',
  unmarkedBg: '#F2F4F7',
};
