import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

// ─── NutriPlate Design System ───
export const COLORS = {
    greenDeep: '#2D5A27',
    midnight: '#0F172A',
    lime: '#A4C639',
    cream: '#FAF3E0',
    cyan: '#06B6D4',
    white: '#FFFFFF',
    white40: 'rgba(255,255,255,0.40)',
    white08: 'rgba(255,255,255,0.08)',
    white10: 'rgba(255,255,255,0.10)',
    white05: 'rgba(255,255,255,0.05)',
    amber: '#F59E0B',
    amberSoft: 'rgba(245,158,11,0.15)',
    danger: '#EF4444',
    dangerSoft: 'rgba(239,68,68,0.12)',
};

export const LIGHT = {
    bg: COLORS.cream,
    card: '#FFFFFF',
    cardAlt: '#F5F0E1',
    text: '#1A1D2E',
    textSecondary: '#5A6178',
    textMuted: '#9BA3B5',
    border: '#E8E0D0',
    accent: COLORS.greenDeep,
    accentLight: '#3D7A37',
    accentSoft: 'rgba(45, 90, 39, 0.10)',
    success: '#22C55E',
    successSoft: 'rgba(34, 197, 94, 0.1)',
    warning: COLORS.amber,
    warningSoft: COLORS.amberSoft,
    danger: COLORS.danger,
    dangerSoft: COLORS.dangerSoft,
    inputBg: 'rgba(0,0,0,0.04)',
    navBg: COLORS.cream,
    statusBar: 'dark-content',
    shadow: '#1A1D2E',
    gradientStart: COLORS.lime,
    gradientEnd: COLORS.greenDeep,
    glass: 'rgba(255,255,255,0.85)',
    tabActive: COLORS.greenDeep,
    tabInactive: '#9BA3B5',
    tabDot: COLORS.lime,
    lime: COLORS.lime,
    cyan: COLORS.cyan,
    midnight: COLORS.midnight,
    greenDeep: COLORS.greenDeep,
    cream: COLORS.cream,
};

export const DARK = {
    bg: COLORS.midnight,
    card: '#1E293B',
    cardAlt: '#1E293B',
    text: '#F0F2F5',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    accent: COLORS.cyan,
    accentLight: '#22D3EE',
    accentSoft: 'rgba(6, 182, 212, 0.15)',
    success: '#22C55E',
    successSoft: 'rgba(34, 197, 94, 0.15)',
    warning: COLORS.amber,
    warningSoft: COLORS.amberSoft,
    danger: COLORS.danger,
    dangerSoft: COLORS.dangerSoft,
    inputBg: 'rgba(255,255,255,0.06)',
    navBg: 'rgba(15,23,42,0.95)',
    statusBar: 'light-content',
    shadow: '#000000',
    gradientStart: COLORS.lime,
    gradientEnd: COLORS.cyan,
    glass: 'rgba(15, 23, 42, 0.85)',
    tabActive: COLORS.cyan,
    tabInactive: '#64748B',
    tabDot: COLORS.cyan,
    lime: COLORS.lime,
    cyan: COLORS.cyan,
    midnight: COLORS.midnight,
    greenDeep: COLORS.greenDeep,
    cream: COLORS.cream,
};

export const glassCard = {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};

export const fonts = {
    syne800: { fontFamily: 'Syne_800ExtraBold' },
    syne700: { fontFamily: 'Syne_700Bold' },
    syne600: { fontFamily: 'Syne_600SemiBold' },
    dmSans: { fontFamily: 'DMSans_400Regular' },
    dmSans300: { fontFamily: 'DMSans_300Light' },
    dmSans500: { fontFamily: 'DMSans_500Medium' },
    dmSans700: { fontFamily: 'DMSans_700Bold' },
    jetbrains: { fontFamily: 'JetBrainsMono_400Regular' },
    jetbrains500: { fontFamily: 'JetBrainsMono_500Medium' },
};

export const typography = {
    h1: { fontSize: 28, ...fonts.syne800, letterSpacing: -0.5 },
    h2: { fontSize: 22, ...fonts.syne700, letterSpacing: -0.3 },
    h3: { fontSize: 18, ...fonts.syne600 },
    body: { fontSize: 15, ...fonts.dmSans },
    bodyBold: { fontSize: 15, ...fonts.dmSans700 },
    bodyLight: { fontSize: 15, ...fonts.dmSans300 },
    caption: { fontSize: 12, ...fonts.dmSans500 },
    small: { fontSize: 11, ...fonts.dmSans },
    label: { fontSize: 13, ...fonts.dmSans700, letterSpacing: 0.5, textTransform: 'uppercase' },
    mono: { fontSize: 14, ...fonts.jetbrains },
    monoMedium: { fontSize: 14, ...fonts.jetbrains500 },
};

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(true);
    const colors = isDark ? DARK : LIGHT;
    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme, spacing, radius, typography, fonts, glassCard }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
