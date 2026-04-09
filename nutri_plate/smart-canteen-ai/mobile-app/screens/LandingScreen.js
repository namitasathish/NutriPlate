import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, StatusBar, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme, COLORS } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const STUDENT_CARDS = [
    { key: 'menu', screen: 'Home', icon: 'restaurant-outline', iconPack: 'ion', title: 'Menu', desc: 'Browse food & nutrition info' },
    { key: 'meal', screen: 'MealPlanner', icon: 'food-apple-outline', iconPack: 'mci', title: 'Meal Planner', desc: 'Build your perfect plate' },
    { key: 'order', screen: 'OrderAhead', icon: 'cart-outline', iconPack: 'ion', title: 'Order Ahead', desc: 'Skip the queue' },
    { key: 'goals', screen: 'HealthGoals', icon: 'target', iconPack: 'mci', title: 'Health Goals', desc: 'Track your daily targets' },
];

const STAFF_CARDS = [
    { key: 'dash', screen: 'Staff', icon: 'chart-bar', iconPack: 'mci', title: 'Dashboard', desc: 'Monitor freshness & containers' },
    { key: 'rate', screen: 'Ratings', icon: 'star-outline', iconPack: 'ion', title: 'Feedback', desc: 'View student ratings' },
];

function CardIcon({ name, pack, size = 28, color = '#FFF' }) {
    if (pack === 'mci') return <MaterialCommunityIcons name={name} size={size} color={color} />;
    if (pack === 'feather') return <Feather name={name} size={size} color={color} />;
    return <Ionicons name={name} size={size} color={color} />;
}

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

    // Theme-aware card colors based on role
    const getCardStyle = (index) => {
        if (isStaff) {
            // Staff: dark glass cards using theme colors
            const staffColors = [
                { bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.25)', iconBg: 'rgba(6,182,212,0.20)', accent: colors.cyan },
                { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)', iconBg: 'rgba(245,158,11,0.20)', accent: colors.warning },
            ];
            return staffColors[index % staffColors.length];
        }
        // Student: use theme accent and success/warning/danger tints
        const studentColors = isDark
            ? [
                { bg: 'rgba(45,90,39,0.20)', border: 'rgba(45,90,39,0.30)', iconBg: 'rgba(164,198,57,0.15)', accent: COLORS.lime },
                { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.25)', iconBg: 'rgba(34,197,94,0.20)', accent: colors.success },
                { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)', iconBg: 'rgba(245,158,11,0.20)', accent: colors.warning },
                { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)', iconBg: 'rgba(239,68,68,0.20)', accent: colors.danger },
            ]
            : [
                { bg: '#2D5A27', border: '#3D7A37', iconBg: 'rgba(255,255,255,0.20)', accent: '#FFF' },
                { bg: '#22C55E', border: '#4ADE80', iconBg: 'rgba(255,255,255,0.20)', accent: '#FFF' },
                { bg: '#F59E0B', border: '#FBBF24', iconBg: 'rgba(255,255,255,0.20)', accent: '#FFF' },
                { bg: '#EF4444', border: '#F87171', iconBg: 'rgba(255,255,255,0.20)', accent: '#FFF' },
            ];
        return studentColors[index % studentColors.length];
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Top Bar */}
                <View style={[styles.topBar, { marginTop: 50 }]}>
                    <View style={styles.themeRow}>
                        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
                            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: colors.dangerSoft, borderRadius: radius.md }]}
                        onPress={logout}
                    >
                        <Feather name="log-out" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                        <Text style={[typography.caption, { color: colors.danger }]}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Welcome Header */}
                <View style={styles.welcomeSection}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.accentSoft }]}>
                        <Ionicons name={isStaff ? 'restaurant' : 'school'} size={28} color={colors.accent} />
                    </View>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>{greetingTime()},</Text>
                    <Text style={[typography.h1, { color: colors.text, marginTop: 2 }]}>{user?.username || 'User'}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.full, marginTop: spacing.sm }]}>
                        <Ionicons name={isStaff ? 'construct' : 'book'} size={12} color={colors.accent} style={{ marginRight: 4 }} />
                        <Text style={[typography.caption, { color: colors.accent }]}>{isStaff ? 'Staff Account' : 'Student Account'}</Text>
                    </View>
                </View>

                {/* Feature Cards — theme aware */}
                <View style={styles.cardGrid}>
                    {cards.map((card, index) => {
                        const cs = getCardStyle(index);
                        return (
                            <TouchableOpacity
                                key={card.key}
                                style={[styles.featureCard, {
                                    backgroundColor: cs.bg,
                                    borderColor: cs.border,
                                    borderWidth: 1,
                                    borderRadius: radius.lg,
                                    width: cards.length === 2 ? '100%' : '47.5%',
                                }]}
                                onPress={() => navigation.navigate(card.screen)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.cardIconCircle, { backgroundColor: cs.iconBg }]}>
                                    <CardIcon name={card.icon} pack={card.iconPack} size={26} color={cs.accent} />
                                </View>
                                <Text style={[styles.cardTitle, { color: isDark || !isStaff ? '#FFF' : '#FFF' }]}>{card.title}</Text>
                                <Text style={[styles.cardDesc, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.75)' }]}>{card.desc}</Text>
                                <View style={styles.cardArrow}>
                                    <Feather name="arrow-right" size={18} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)'} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footerSection}>
                    <View style={[styles.footerCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                        <MaterialCommunityIcons name="robot-outline" size={20} color={colors.textSecondary} style={{ marginBottom: 6 }} />
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
    themeBtn: { padding: 6 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
    welcomeSection: { alignItems: 'center', marginTop: 28, marginBottom: 32 },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    featureCard: {
        padding: 20,
        minHeight: 160,
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    cardIconCircle: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: { fontSize: 18, fontFamily: 'Syne_700Bold', marginBottom: 4 },
    cardDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 17 },
    cardArrow: { alignSelf: 'flex-end', marginTop: 8 },
    footerSection: { marginTop: 28, alignItems: 'center' },
    footerCard: { padding: 16, alignItems: 'center', width: '100%' },
});
