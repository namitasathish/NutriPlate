import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getDashboard, subscribeNotifications, clearNotifications } from '../services/api';

export default function StaffDashboard({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [containers, setContainers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNotifs, setShowNotifs] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        const unsub = subscribeNotifications(setNotifications);
        return () => { clearInterval(interval); unsub(); };
    }, []);

    const loadData = async () => {
        const data = await getDashboard();
        setContainers(data);
        setLoading(false);
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const freshCount = containers.filter(c => c.status === 'Fresh').length;
    const warnCount = containers.filter(c => c.status === 'Warning').length;
    const spoiledCount = containers.filter(c => c.status === 'Spoiled').length;

    const checkTime = (timestamp) => {
        if (!timestamp) return { label: 'Never', color: colors.danger, urgent: true };
        const diff = (Date.now() / 1000) - timestamp;
        const hours = diff / 3600;
        if (hours > 2) return { label: `${hours.toFixed(1)}h — Update Now`, color: colors.danger, urgent: true };
        if (hours > 1) return { label: `${hours.toFixed(1)}h ago`, color: colors.warning, urgent: false };
        return { label: `${Math.round(diff / 60)}m ago`, color: colors.success, urgent: false };
    };

    const getFreshnessColor = (score) => {
        if (score < 40) return colors.danger;
        if (score < 70) return colors.warning;
        return colors.success;
    };

    const getStatusConfig = (status) => {
        if (status === 'Spoiled') return { bg: colors.dangerSoft, color: colors.danger };
        if (status === 'Warning') return { bg: colors.warningSoft, color: colors.warning };
        return { bg: colors.successSoft, color: colors.success };
    };

    const renderItem = ({ item }) => {
        const ts = checkTime(item.timestamp);
        const sr = item.sensor_readings?.[0] || {};
        const sc = getStatusConfig(item.status);
        const freshColor = getFreshnessColor(item.freshness_score);

        return (
            <View style={[styles.card, {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderLeftWidth: item.status !== 'Fresh' ? 4 : 0,
                borderLeftColor: item.status === 'Spoiled' ? colors.danger : colors.warning,
                borderColor: colors.border,
                borderWidth: 1,
            }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h3, { color: colors.text }]}>{item.food_name}</Text>
                        <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>{item.id}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.updateBtn, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}
                        onPress={() => navigation.navigate('Camera', { containerId: item.id })}
                    >
                        <Text style={[typography.caption, { color: colors.accent }]}>📷 Update</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.metricsRow, { marginTop: spacing.sm }]}>
                    {[
                        { label: 'Freshness', val: `${Math.round(item.freshness_score)}%`, color: freshColor },
                        { label: 'Status', val: item.status, color: sc.color },
                        { label: 'NH₃', val: sr.NH3?.toFixed(2) || 'N/A', color: (sr.NH3 || 0) > 3 ? colors.danger : colors.text },
                        { label: 'Temp', val: `${sr.temperature?.toFixed(1) || '?'}°C`, color: (sr.temperature || 0) > 33 ? colors.danger : colors.text },
                    ].map((m, i) => (
                        <View key={i} style={[styles.metricItem, { backgroundColor: colors.cardAlt, borderRadius: radius.sm }]}>
                            <Text style={[typography.small, { color: colors.textMuted }]}>{m.label}</Text>
                            <Text style={[typography.bodyBold, { color: m.color, fontSize: 14, marginTop: 2 }]}>{m.val}</Text>
                        </View>
                    ))}
                </View>

                <View style={[styles.timeBar, {
                    backgroundColor: ts.urgent ? colors.dangerSoft : colors.successSoft,
                    borderRadius: radius.sm,
                    marginTop: spacing.sm,
                }]}>
                    <Text style={[typography.caption, { color: ts.color, textAlign: 'center' }]}>🕐 {ts.label}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />

            {/* Alert Banner */}
            {unreadCount > 0 && (
                <TouchableOpacity
                    style={[styles.alertBanner, { backgroundColor: colors.danger, borderRadius: radius.md, margin: spacing.md, marginBottom: 0 }]}
                    onPress={() => setShowNotifs(!showNotifs)}
                >
                    <Text style={[typography.bodyBold, { color: '#FFF' }]}>🔔 {unreadCount} Alert{unreadCount > 1 ? 's' : ''}</Text>
                    <Text style={[typography.small, { color: 'rgba(255,255,255,0.7)' }]}>{showNotifs ? 'Hide ▲' : 'Show ▼'}</Text>
                </TouchableOpacity>
            )}

            {showNotifs && (
                <View style={[styles.notifPanel, { backgroundColor: colors.card, margin: spacing.md, marginTop: spacing.sm, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1 }]}>
                    {notifications.slice(0, 5).map(n => (
                        <Text key={n.id} style={[typography.small, { color: n.type === 'danger' ? colors.danger : colors.warning, paddingVertical: 3 }]}>
                            {n.message}
                        </Text>
                    ))}
                    <TouchableOpacity onPress={() => { clearNotifications(); setShowNotifs(false); }} style={{ marginTop: spacing.xs }}>
                        <Text style={[typography.caption, { color: colors.accent }]}>Clear All</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={containers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: spacing.md }}
                ListHeaderComponent={() => (
                    <View style={{ marginBottom: spacing.md }}>
                        {/* Actions */}
                        <TouchableOpacity
                            style={[styles.addContainerBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]}
                            onPress={() => navigation.navigate('Camera', { containerId: null })}
                        >
                            <Text style={[typography.bodyBold, { color: '#FFF' }]}>📷  Add New Container</Text>
                        </TouchableOpacity>

                        {/* Summary Stats */}
                        <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
                            {[
                                { label: 'Total', val: containers.length, bg: colors.accentSoft, color: colors.accent },
                                { label: 'Fresh', val: freshCount, bg: colors.successSoft, color: colors.success },
                                { label: 'Warn', val: warnCount, bg: colors.warningSoft, color: colors.warning },
                                { label: 'Spoiled', val: spoiledCount, bg: colors.dangerSoft, color: colors.danger },
                            ].map((s, i) => (
                                <View key={i} style={[styles.summaryChip, { backgroundColor: s.bg, borderRadius: radius.md }]}>
                                    <Text style={[typography.h3, { color: s.color }]}>{s.val}</Text>
                                    <Text style={[typography.small, { color: s.color, marginTop: 2 }]}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    alertBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    notifPanel: { padding: 14 },
    addContainerBtn: { padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryChip: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    card: { padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    updateBtn: { paddingVertical: 8, paddingHorizontal: 14 },
    metricsRow: { flexDirection: 'row', gap: 6 },
    metricItem: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
    timeBar: { padding: 8 },
});
