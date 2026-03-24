import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, StatusBar, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const STUDENT_CARDS = [
    { key: 'menu', screen: 'Home', icon: '🍽️', title: 'Menu', desc: 'Browse food & nutrition info', gradient: ['#6C63FF', '#8B83FF'] },
    { key: 'meal', screen: 'MealPlanner', icon: '🥗', title: 'Meal Planner', desc: 'Build your perfect plate', gradient: ['#22C55E', '#4ADE80'] },
    { key: 'order', screen: 'OrderAhead', icon: '🛒', title: 'Order Ahead', desc: 'Skip the queue', gradient: ['#F59E0B', '#FBBF24'] },
    { key: 'goals', screen: 'HealthGoals', icon: '🎯', title: 'Health Goals', desc: 'Track your daily targets', gradient: ['#EF4444', '#F87171'] },
];

const STAFF_CARDS = [
    { key: 'dash', screen: 'Staff', icon: '📊', title: 'Dashboard', desc: 'Monitor freshness & containers', gradient: ['#6C63FF', '#8B83FF'] },
    { key: 'rate', screen: 'Ratings', icon: '⭐', title: 'Feedback', desc: 'View student ratings', gradient: ['#F59E0B', '#FBBF24'] },
];

export default function LandingScreen({ navigation }) {
    const { isDark, colors, toggleTheme, spacing, radius, typography } = useTheme();
    const { user, logout } = useAuth();

    const isStaff = user?.role === 'staff';
    const cards = isStaff ? STAFF_CARDS : STUDENT_CARDS;

    const greetingTime = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Top Bar */}
                <View style={[styles.topBar, { marginTop: 50 }]}>
                    <View style={styles.themeRow}>
                        <Text style={[typography.small, { color: colors.textMuted }]}>{isDark ? '🌙' : '☀️'}</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#D1D5DB', true: colors.accent }}
                            thumbColor="#FFF"
                            style={{ transform: [{ scale: 0.8 }] }}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: colors.dangerSoft, borderRadius: radius.md }]}
                        onPress={logout}
                    >
                        <Text style={[typography.caption, { color: colors.danger }]}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Welcome Header */}
                <View style={styles.welcomeSection}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.accentSoft }]}>
                        <Text style={{ fontSize: 28 }}>{isStaff ? '👨‍🍳' : '🎓'}</Text>
                    </View>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>{greetingTime()},</Text>
                    <Text style={[typography.h1, { color: colors.text, marginTop: 2 }]}>{user?.username || 'User'}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.full, marginTop: spacing.sm }]}>
                        <Text style={[typography.caption, { color: colors.accent }]}>{isStaff ? '🔧 Staff Account' : '📚 Student Account'}</Text>
                    </View>
                </View>

                {/* Feature Cards */}
                <View style={styles.cardGrid}>
                    {cards.map((card, index) => (
                        <TouchableOpacity
                            key={card.key}
                            style={[styles.featureCard, {
                                backgroundColor: card.gradient[0],
                                borderRadius: radius.lg,
                                width: cards.length === 2 ? '100%' : '47.5%',
                            }]}
                            onPress={() => navigation.navigate(card.screen)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.cardIconCircle}>
                                <Text style={{ fontSize: 28 }}>{card.icon}</Text>
                            </View>
                            <Text style={styles.cardTitle}>{card.title}</Text>
                            <Text style={styles.cardDesc}>{card.desc}</Text>
                            <View style={styles.cardArrow}>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>→</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footerSection}>
                    <View style={[styles.footerCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                        <Text style={{ fontSize: 20, marginBottom: 6 }}>🤖</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                            Powered by Multi-Modal AI{'\n'}Vision • Sensors • Fusion
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    logoutBtn: { paddingHorizontal: 14, paddingVertical: 8 },
    welcomeSection: { alignItems: 'center', marginTop: 28, marginBottom: 32 },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    roleBadge: { paddingHorizontal: 14, paddingVertical: 6 },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    featureCard: {
        padding: 20,
        minHeight: 160,
        justifyContent: 'space-between',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    cardIconCircle: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
    cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 17 },
    cardArrow: { alignSelf: 'flex-end', marginTop: 8 },
    footerSection: { marginTop: 28, alignItems: 'center' },
    footerCard: { padding: 16, alignItems: 'center', width: '100%' },
});
