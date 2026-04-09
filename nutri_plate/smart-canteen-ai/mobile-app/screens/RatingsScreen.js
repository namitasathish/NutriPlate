import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getAllRatings } from '../services/api';

export default function RatingsScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [ratings, setRatings] = useState({});
    const [sortBy, setSortBy] = useState('rating');

    useEffect(() => {
        setRatings(getAllRatings());
        const interval = setInterval(() => setRatings(getAllRatings()), 10000);
        return () => clearInterval(interval);
    }, []);

    const sortedItems = Object.entries(ratings)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => sortBy === 'rating' ? b.avg - a.avg : b.count - a.count);

    const getRatingColor = (avg) => { if (avg >= 4) return colors.success; if (avg >= 3) return colors.warning; return colors.danger; };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <FlatList
                data={sortedItems}
                keyExtractor={item => item.name}
                contentContainerStyle={{ padding: spacing.md }}
                ListHeaderComponent={
                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={[typography.h1, { color: colors.text }]}>Ratings & Feedback</Text>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md }]}>
                            {sortedItems.length} dishes rated by students
                        </Text>
                        <View style={[styles.tabRow, { backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: 4 }]}>
                            <TouchableOpacity style={[styles.tab, sortBy === 'rating' && { backgroundColor: colors.accent }, { borderRadius: radius.md }]} onPress={() => setSortBy('rating')}>
                                <Ionicons name="star" size={14} color={sortBy === 'rating' ? '#FFF' : colors.textMuted} style={{ marginRight: 4 }} />
                                <Text style={[typography.bodyBold, { color: sortBy === 'rating' ? '#FFF' : colors.textMuted }]}>By Rating</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tab, sortBy === 'count' && { backgroundColor: colors.accent }, { borderRadius: radius.md }]} onPress={() => setSortBy('count')}>
                                <Ionicons name="trending-up" size={14} color={sortBy === 'count' ? '#FFF' : colors.textMuted} style={{ marginRight: 4 }} />
                                <Text style={[typography.bodyBold, { color: sortBy === 'count' ? '#FFF' : colors.textMuted }]}>By Reviews</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const rColor = getRatingColor(item.avg);
                    return (
                        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                            <View style={styles.cardMain}>
                                <View style={[styles.rankBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.sm }]}>
                                    <Text style={[typography.bodyBold, { color: colors.accent }]}>{index + 1}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.md }}>
                                    <Text style={[typography.bodyBold, { color: colors.text }]}>{item.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= Math.round(item.avg) ? 'star' : 'star-outline'} size={12} color={rColor} />)}
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.avgNum, { color: rColor }]}>{item.avg}</Text>
                                    <Text style={[typography.small, { color: colors.textMuted }]}>{item.count} reviews</Text>
                                </View>
                            </View>
                            {item.reviews && item.reviews.slice(0, 2).map(r => (
                                <View key={r.id} style={[styles.reviewRow, { borderTopColor: colors.border }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={10} color={colors.warning} />)}
                                    </View>
                                    <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 8, flex: 1, fontStyle: 'italic' }]}>"{r.comment}"</Text>
                                </View>
                            ))}
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabRow: { flexDirection: 'row' },
    tab: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    card: { padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    cardMain: { flexDirection: 'row', alignItems: 'center' },
    rankBadge: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    avgNum: { fontSize: 24, fontWeight: '800' },
    reviewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
});
