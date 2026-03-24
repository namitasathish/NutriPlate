import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getDashboard, getAverageRating } from '../services/api';

export default function HomeScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        const data = await getDashboard();
        setContainers(data);
        setLoading(false);
    };

    const getFreshnessColor = (score) => {
        if (score < 40) return colors.danger;
        if (score < 70) return colors.warning;
        return colors.success;
    };

    const getStatusConfig = (status) => {
        if (status === 'Spoiled') return { bg: colors.dangerSoft, color: colors.danger, dot: '●' };
        if (status === 'Warning') return { bg: colors.warningSoft, color: colors.warning, dot: '●' };
        return { bg: colors.successSoft, color: colors.success, dot: '●' };
    };

    const renderItem = ({ item }) => {
        const rating = getAverageRating(item.food_name);
        const statusConf = getStatusConfig(item.status);
        const freshColor = getFreshnessColor(item.freshness_score);
        const freshPercent = Math.round(item.freshness_score);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => navigation.navigate('FoodDetail', { container: item })}
                activeOpacity={0.7}
            >
                <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h3, { color: colors.text }]}>{item.food_name}</Text>
                        <View style={styles.metaRow}>
                            <Text style={[typography.small, { color: colors.textMuted }]}>{item.id}</Text>
                            {item.nutrition?.category && (
                                <>
                                    <Text style={[typography.small, { color: colors.textMuted }]}> • </Text>
                                    <Text style={[typography.small, { color: colors.textMuted }]}>{item.nutrition.category}</Text>
                                </>
                            )}
                        </View>
                        {rating.count > 0 && (
                            <View style={[styles.ratingRow, { marginTop: 4 }]}>
                                <Text style={[typography.small, { color: colors.warning }]}>
                                    {'★'.repeat(Math.round(rating.avg))}{'☆'.repeat(5 - Math.round(rating.avg))}
                                </Text>
                                <Text style={[typography.small, { color: colors.textMuted, marginLeft: 4 }]}>({rating.avg})</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.freshnessRing, { borderColor: freshColor }]}>
                        <Text style={[styles.freshnessVal, { color: freshColor }]}>{freshPercent}%</Text>
                    </View>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                <View style={styles.cardBottom}>
                    <View style={[styles.statusPill, { backgroundColor: statusConf.bg, borderRadius: radius.full }]}>
                        <Text style={[typography.caption, { color: statusConf.color }]}>
                            {statusConf.dot} {item.status}
                        </Text>
                    </View>
                    <Text style={[typography.small, { color: colors.textMuted }]}>
                        {item.nutrition?.calories || '?'} cal • Tap for details →
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading menu...</Text>
            </View>
        );
    }

    const freshCount = containers.filter(c => c.status === 'Fresh').length;
    const warnCount = containers.filter(c => c.status === 'Warning').length;

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <FlatList
                data={containers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: spacing.md }}
                ListHeaderComponent={() => (
                    <View style={styles.header}>
                        <Text style={[typography.h1, { color: colors.text }]}>Today's Menu</Text>
                        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
                            <View style={[styles.statPill, { backgroundColor: colors.successSoft, borderRadius: radius.full }]}>
                                <Text style={[typography.caption, { color: colors.success }]}>🟢 {freshCount} Fresh</Text>
                            </View>
                            {warnCount > 0 && (
                                <View style={[styles.statPill, { backgroundColor: colors.warningSoft, borderRadius: radius.full, marginLeft: 8 }]}>
                                    <Text style={[typography.caption, { color: colors.warning }]}>🟡 {warnCount} Warning</Text>
                                </View>
                            )}
                            <View style={[styles.statPill, { backgroundColor: colors.accentSoft, borderRadius: radius.full, marginLeft: 8 }]}>
                                <Text style={[typography.caption, { color: colors.accent }]}>{containers.length} total</Text>
                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <Text style={{ fontSize: 48, marginBottom: 12 }}>🍽️</Text>
                        <Text style={[typography.h3, { color: colors.textSecondary }]}>No food available</Text>
                        <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>Check back later for today's menu</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 16, paddingTop: 8 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statPill: { paddingHorizontal: 12, paddingVertical: 5 },
    card: {
        padding: 16, marginBottom: 12,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    freshnessRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    freshnessVal: { fontSize: 14, fontWeight: '800' },
    cardDivider: { height: 1, marginVertical: 12 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4 },
    empty: { alignItems: 'center', marginTop: 80 },
});
