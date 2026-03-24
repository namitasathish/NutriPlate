import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const LIGHT = {
    bg: '#F5F7FA',
    card: '#FFFFFF',
    cardAlt: '#F0F4F8',
    text: '#1A1D2E',
    textSecondary: '#5A6178',
    textMuted: '#9BA3B5',
    border: '#E8EDF3',
    accent: '#6C63FF',
    accentLight: '#8B83FF',
    accentSoft: 'rgba(108, 99, 255, 0.08)',
    success: '#22C55E',
    successSoft: 'rgba(34, 197, 94, 0.1)',
    warning: '#F59E0B',
    warningSoft: 'rgba(245, 158, 11, 0.1)',
    danger: '#EF4444',
    dangerSoft: 'rgba(239, 68, 68, 0.1)',
    inputBg: '#F0F2F5',
    navBg: '#FFFFFF',
    statusBar: 'dark-content',
    shadow: '#1A1D2E',
    gradientStart: '#6C63FF',
    gradientEnd: '#A78BFA',
    glass: 'rgba(255,255,255,0.85)',
    tabActive: '#6C63FF',
    tabInactive: '#9BA3B5',
};

export const DARK = {
    bg: '#0F1118',
    card: '#1A1D2E',
    cardAlt: '#222639',
    text: '#F0F2F5',
    textSecondary: '#9BA3B5',
    textMuted: '#5A6178',
    border: '#2A2F42',
    accent: '#8B83FF',
    accentLight: '#A78BFA',
    accentSoft: 'rgba(139, 131, 255, 0.15)',
    success: '#22C55E',
    successSoft: 'rgba(34, 197, 94, 0.15)',
    warning: '#F59E0B',
    warningSoft: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    dangerSoft: 'rgba(239, 68, 68, 0.15)',
    inputBg: '#222639',
    navBg: '#1A1D2E',
    statusBar: 'light-content',
    shadow: '#000000',
    gradientStart: '#6C63FF',
    gradientEnd: '#A78BFA',
    glass: 'rgba(26, 29, 46, 0.85)',
    tabActive: '#8B83FF',
    tabInactive: '#5A6178',
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

export const typography = {
    h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    bodyBold: { fontSize: 15, fontWeight: '600' },
    caption: { fontSize: 12, fontWeight: '500' },
    small: { fontSize: 11, fontWeight: '400' },
    label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
};

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(true); // Default to dark mode
    const colors = isDark ? DARK : LIGHT;
    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme, spacing, radius, typography }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
