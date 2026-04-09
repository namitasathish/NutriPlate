import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTheme, COLORS } from '../context/ThemeContext';
import { getDashboard, getAverageRating } from '../services/api';

function ForkIcon({ size = 48, color = '#2D5A27' }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <Path d="M7 2v20" />
            <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </Svg>
    );
}

function ScorePanel({ item, colors, typography, spacing, radius }) {
    const [expanded, setExpanded] = useState(false);
    const heightAnim = useRef(new Animated.Value(0)).current;
    const toggle = () => {
        Animated.timing(heightAnim, { toValue: expanded ? 0 : 1, duration: 200, useNativeDriver: false }).start();
        setExpanded(!expanded);
    };
    const panelHeight = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
    const n = item.nutrition || {};
    return (
        <View>
            <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
                <View style={[styles.freshnessBarBg, { borderRadius: radius.full, overflow: 'hidden' }]}>
                    <LinearGradient colors={[COLORS.lime, COLORS.greenDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.freshnessBarFill, { width: `${Math.round(item.freshness_score)}%`, borderRadius: radius.full }]} />
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'right' }]}>
                    {Math.round(item.freshness_score)}% fresh — tap to {expanded ? 'collapse' : 'expand'}
                </Text>
            </TouchableOpacity>
            <Animated.View style={{ height: panelHeight, overflow: 'hidden' }}>
                <View style={[styles.macroPanel, { backgroundColor: colors.cardAlt, borderRadius: radius.md, marginTop: spacing.sm }]}>
                    {[
                        { label: 'Protein', val: `${n.protein || 0}g`, color: COLORS.cyan },
                        { label: 'Carbs', val: `${n.carbohydrates || 0}g`, color: COLORS.amber },
                        { label: 'Fat', val: `${n.fat || 0}g`, color: '#A78BFA' },
                        { label: 'Calories', val: `${n.calories || 0}`, color: COLORS.danger },
                    ].map((m, i) => (
                        <View key={i} style={styles.macroItem}>
                            <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                            <Text style={[typography.small, { color: colors.textMuted }]}>{m.label}</Text>
                            <Text style={[typography.bodyBold, { color: colors.text, marginTop: 2 }]}>{m.val}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
}

export default function HomeScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); const i = setInterval(loadData, 5000); return () => clearInterval(i); }, []);
    const loadData = async () => { setContainers(await getDashboard()); setLoading(false); };

    const getStatusConfig = (status) => {
        if (status === 'Spoiled') return { bg: colors.dangerSoft, color: colors.danger, icon: 'alert-circle' };
        if (status === 'Warning') return { bg: colors.warningSoft, color: colors.warning, icon: 'alert-circle-outline' };
        return { bg: colors.successSoft, color: colors.success, icon: 'checkmark-circle' };
    };

    const renderItem = ({ item }) => {
        const rating = getAverageRating(item.food_name);
        const sc = getStatusConfig(item.status);
        return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]} onPress={() => navigation.navigate('FoodDetail', { container: item })} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h3, { color: colors.text }]}>{item.food_name}</Text>
                        <View style={styles.metaRow}>
                            <Text style={[typography.small, { color: colors.textMuted }]}>{item.id}</Text>
                            {item.nutrition?.category && (<><Text style={[typography.small, { color: colors.textMuted }]}> • </Text><Text style={[typography.small, { color: colors.textMuted }]}>{item.nutrition.category}</Text></>)}
                        </View>
                        {rating.count > 0 && (
                            <View style={[styles.ratingRow, { marginTop: 4 }]}>
                                {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= Math.round(rating.avg) ? 'star' : 'star-outline'} size={12} color={colors.warning} />)}
                                <Text style={[typography.small, { color: colors.textMuted, marginLeft: 4 }]}>({rating.avg})</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: sc.bg, borderRadius: radius.full }]}>
                        <Ionicons name={sc.icon} size={12} color={sc.color} style={{ marginRight: 3 }} />
                        <Text style={[typography.caption, { color: sc.color }]}>{item.status}</Text>
                    </View>
                </View>
                <View style={{ marginTop: spacing.sm }}><ScorePanel item={item} colors={colors} typography={typography} spacing={spacing} radius={radius} /></View>
                <View style={[styles.cardBottom, { marginTop: spacing.sm }]}>
                    <Text style={[typography.small, { color: colors.textMuted }]}>{item.nutrition?.calories || '?'} cal</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading menu...</Text>
        </View>
    );

    const freshCount = containers.filter(c => c.status === 'Fresh').length;
    const warnCount = containers.filter(c => c.status === 'Warning').length;

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <FlatList data={containers} renderItem={renderItem} keyExtractor={item => item.id} contentContainerStyle={{ padding: spacing.md }}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={[typography.h1, { color: colors.text }]}>Today's Menu</Text>
                        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
                            <View style={[styles.statPill, { backgroundColor: colors.successSoft, borderRadius: radius.full }]}>
                                <Ionicons name="checkmark-circle" size={12} color={colors.success} style={{ marginRight: 3 }} />
                                <Text style={[typography.caption, { color: colors.success }]}>{freshCount} Fresh</Text>
                            </View>
                            {warnCount > 0 && (
                                <View style={[styles.statPill, { backgroundColor: colors.warningSoft, borderRadius: radius.full, marginLeft: 8 }]}>
                                    <Ionicons name="alert-circle-outline" size={12} color={colors.warning} style={{ marginRight: 3 }} />
                                    <Text style={[typography.caption, { color: colors.warning }]}>{warnCount} Warning</Text>
                                </View>
                            )}
                            <View style={[styles.statPill, { backgroundColor: colors.accentSoft, borderRadius: radius.full, marginLeft: 8 }]}>
                                <Text style={[typography.caption, { color: colors.accent }]}>{containers.length} total</Text>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: COLORS.cream, borderRadius: radius.lg }]}>
                        <ForkIcon size={56} color={COLORS.greenDeep} />
                        <Text style={[typography.bodyLight, { color: '#5A6178', marginTop: 16, textAlign: 'center', lineHeight: 22 }]}>Scan a meal to get personalised{'\n'}recommendations</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 16, paddingTop: 8 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5 },
    card: { padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    freshnessBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%' },
    freshnessBarFill: { height: 8 },
    macroPanel: { flexDirection: 'row', padding: 12, justifyContent: 'space-around' },
    macroItem: { alignItems: 'center' },
    macroDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
    emptyCard: { alignItems: 'center', padding: 40, marginTop: 40, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
});
