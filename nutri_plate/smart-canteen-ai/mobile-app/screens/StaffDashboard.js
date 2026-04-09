import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Animated, Easing } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme, COLORS } from '../context/ThemeContext';
import { getDashboard, getLiveSensorData, subscribeNotifications, clearNotifications } from '../services/api';

function Sparkline({ data, width = 60, height = 24, color = '#06B6D4' }) {
    const values = Array.isArray(data) && data.length > 0 ? data : [];
    if (values.length === 0) {
        const y = Math.round(height * 0.2);
        return <Svg width={width} height={height}><Polyline points={`0,${y} ${width},${y}`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" /></Svg>;
    }
    const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
    const points = values.map((v, i) => `${Math.round((i / Math.max(values.length - 1, 1)) * width)},${Math.round(height - ((v - min) / range) * (height - 4) - 2)}`).join(' ');
    return <Svg width={width} height={height}><Polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function PulsingDot({ color = '#F59E0B', size = 8 }) {
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        const animation = Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        animation.start();
        return () => animation.stop();
    }, []);
    return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: anim }} />;
}

// ─── Live Badge ─── a pulsing red dot with "LIVE" text
function LiveBadge() {
    return (
        <View style={liveStyles.badge}>
            <PulsingDot color="#EF4444" size={8} />
            <Text style={liveStyles.badgeText}>LIVE</Text>
        </View>
    );
}

// ─── Buffer Progress Bar ─── shows 0-30 readings accumulated
function BufferBar({ count = 0, total = 30, colors }) {
    const pct = Math.min(count / total, 1) * 100;
    return (
        <View style={liveStyles.bufferContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted }}>Buffer for inference</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: COLORS.lime }}>{count}/{total}</Text>
            </View>
            <View style={[liveStyles.bufferTrack, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Animated.View style={[liveStyles.bufferFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#22C55E' : COLORS.lime }]} />
            </View>
        </View>
    );
}

export default function StaffDashboard({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [containers, setContainers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNotifs, setShowNotifs] = useState(false);
    const [liveData, setLiveData] = useState(null);
    const sensorHistory = useRef({});

    useEffect(() => {
        loadData();
        loadLive();
        const interval = setInterval(loadData, 5000);
        const liveInterval = setInterval(loadLive, 2000);
        const unsub = subscribeNotifications(setNotifications);
        return () => { clearInterval(interval); clearInterval(liveInterval); unsub(); };
    }, []);

    const loadData = useCallback(async () => {
        const data = await getDashboard();
        data.forEach(c => {
            if (!sensorHistory.current[c.id]) sensorHistory.current[c.id] = { temp: [], humidity: [], nh3: [] };
            const r = c.sensor_readings && c.sensor_readings[0] ? c.sensor_readings[0] : {};
            const h = sensorHistory.current[c.id];
            if (r.temperature != null) h.temp = [...h.temp.slice(-9), r.temperature];
            if (r.humidity != null) h.humidity = [...h.humidity.slice(-9), r.humidity];
            if (r.NH3 != null) h.nh3 = [...h.nh3.slice(-9), r.NH3];
        });
        // Filter out the live container (C1) from the regular list
        setContainers(data.filter(c => c.id !== 'container_1'));
        setLoading(false);
    }, []);

    const loadLive = useCallback(async () => {
        const data = await getLiveSensorData();
        setLiveData(data);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;
    const allContainers = liveData?.container ? [liveData.container, ...containers] : containers;
    const freshCount = allContainers.filter(c => c.status === 'Fresh').length;
    const warnCount = allContainers.filter(c => c.status === 'Warning').length;
    const spoiledCount = allContainers.filter(c => c.status === 'Spoiled').length;

    const checkTime = (timestamp) => {
        if (!timestamp) return { label: 'Never', color: colors.danger, urgent: true };
        const diff = (Date.now() / 1000) - timestamp;
        const hours = diff / 3600;
        if (hours > 2) return { label: `${hours.toFixed(1)}h — Update Now`, color: colors.danger, urgent: true };
        if (hours > 1) return { label: `${hours.toFixed(1)}h ago`, color: colors.warning, urgent: false };
        return { label: `${Math.round(diff / 60)}m ago`, color: colors.success, urgent: false };
    };

    const getFreshnessColor = (score) => { if (score < 40) return colors.danger; if (score < 70) return colors.warning; return colors.success; };
    const getStatusConfig = (status) => {
        if (status === 'Spoiled') return { bg: colors.dangerSoft, color: colors.danger };
        if (status === 'Warning') return { bg: colors.warningSoft, color: colors.warning };
        return { bg: colors.successSoft, color: colors.success };
    };

    const glassStyle = { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14 };

    // ─── Live Container Card ───
    const renderLiveCard = () => {
        if (!liveData) return null;
        const ct = liveData.container;
        const latest = liveData.latest_reading;
        const history = liveData.history || {};
        const connected = liveData.connected;            // actual JSON data flowing
        const bridgeConnected = liveData.bridge_connected; // bridge process is up
        const isWarmup = liveData.warmup;                // bridge up, Arduino warming up

        const freshness = ct?.freshness_score ?? 100;
        const status = ct?.status || 'Fresh';
        const foodName = ct?.food_name || 'No Food Scanned';
        const sc = getStatusConfig(status);
        const freshColor = getFreshnessColor(freshness);

        // Connection state for border color
        const borderColor = connected
            ? 'rgba(164,198,57,0.40)'
            : isWarmup
            ? 'rgba(251,191,36,0.35)'   // amber for warming up
            : 'rgba(239,68,68,0.30)';   // red for disconnected

        // Status row derived from 3 states
        const connLabel = connected
            ? 'Arduino Connected — Live Data'
            : isWarmup
            ? 'Arduino Warming Up… (~2 min)'
            : 'Arduino Disconnected';
        const connColor = connected ? '#22C55E' : isWarmup ? '#F59E0B' : '#EF4444';
        const connBg = connected
            ? 'rgba(34,197,94,0.08)'
            : isWarmup
            ? 'rgba(251,191,36,0.08)'
            : 'rgba(239,68,68,0.08)';

        const sensorChips = latest ? [
            { label: 'Temperature', val: `${latest.temperature?.toFixed(1)}°C`, color: (latest.temperature || 0) > 33 ? COLORS.danger : COLORS.cyan, data: history.temperature || [], sparkColor: COLORS.cyan, icon: 'thermometer-outline' },
            { label: 'Humidity', val: `${latest.humidity?.toFixed(0)}%`, color: colors.text, data: history.humidity || [], sparkColor: '#A78BFA', icon: 'water-outline' },
            { label: 'CH₄ (Methane)', val: `${(latest.CH4 || 0).toFixed(0)} ppm`, color: (latest.CH4 || 0) > 500 ? COLORS.danger : colors.text, data: history.CH4 || [], sparkColor: COLORS.amber, icon: 'flame-outline' },
            { label: 'NH₃ (Ammonia)', val: `${(latest.NH3 || 0).toFixed(2)} ppm`, color: (latest.NH3 || 0) > 3 ? COLORS.danger : colors.text, data: history.NH3 || [], sparkColor: '#F472B6', icon: 'flask-outline' },
            { label: 'H₂S', val: `${(latest.H2S || 0).toFixed(2)} ppm`, color: (latest.H2S || 0) > 2 ? COLORS.danger : colors.text, data: history.H2S || [], sparkColor: '#FB923C', icon: 'cloud-outline' },
            { label: 'Alcohol', val: `${(latest.alcohol || 0).toFixed(3)} mg/L`, color: colors.text, data: history.alcohol || [], sparkColor: '#34D399', icon: 'wine-outline' },
        ] : [];

        return (
            <View style={[liveStyles.card, { backgroundColor: colors.card, borderColor, borderRadius: 14 }]}>
                {/* Header */}
                <View style={liveStyles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="hardware-chip" size={18} color={COLORS.lime} />
                            <Text style={[typography.h3, { color: colors.text }]}>Hardware Sensors</Text>
                        </View>
                        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]}>{foodName}</Text>
                    </View>
                    <LiveBadge />
                </View>

                {/* Connection Status Row */}
                <View style={[liveStyles.connRow, { backgroundColor: connBg, borderRadius: radius.sm, marginTop: spacing.sm }]}>
                    <PulsingDot color={connColor} size={6} />
                    <Text style={[typography.small, { color: connColor, marginLeft: 6, flex: 1 }]}>
                        {connLabel}
                    </Text>
                </View>

                {/* WARMUP BANNER — shown when bridge is up but Arduino hasn't sent data yet */}
                {isWarmup && !connected && (
                    <View style={[liveStyles.warmupBanner, { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.25)', borderRadius: radius.sm, marginTop: spacing.sm }]}>
                        <Ionicons name="time-outline" size={16} color="#F59E0B" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[typography.bodyBold, { color: '#F59E0B' }]}>Sensors Warming Up</Text>
                            <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>
                                MQ gas sensors need ~2 minutes to stabilize. LED is blue on the device. Graphs will appear automatically once data flows.
                            </Text>
                        </View>
                    </View>
                )}

                {/* DISCONNECTED BANNER */}
                {!bridgeConnected && !connected && (
                    <View style={[liveStyles.warmupBanner, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)', borderRadius: radius.sm, marginTop: spacing.sm }]}>
                        <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[typography.bodyBold, { color: '#EF4444' }]}>Arduino Not Connected</Text>
                            <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>
                                Start hardware_bridge.py on your PC to connect the Arduino. Make sure the USB cable is plugged in.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Sensor Grid — only shown when data is flowing */}
                {sensorChips.length > 0 && (
                    <View style={[liveStyles.sensorGrid, { marginTop: spacing.sm }]}>
                        {sensorChips.map((m, i) => (
                            <View key={i} style={[liveStyles.sensorChip, glassStyle]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name={m.icon} size={12} color={colors.textMuted} />
                                            <Text style={[typography.small, { color: colors.textMuted }]}>{m.label}</Text>
                                        </View>
                                        <Text style={[typography.bodyBold, { color: m.color, fontSize: 15, marginTop: 3, fontFamily: 'JetBrainsMono_500Medium' }]}>{m.val}</Text>
                                    </View>
                                    <Sparkline data={m.data} color={m.sparkColor} width={50} height={22} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Buffer Progress — show when data is flowing */}
                {connected && (
                    <View style={{ marginTop: spacing.sm }}>
                        <BufferBar count={liveData.buffer_count || 0} total={30} colors={colors} />
                    </View>
                )}

                {/* Freshness Score + Status — show when connected */}
                {connected && (
                    <View style={[liveStyles.freshnessRow, { marginTop: spacing.sm }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.small, { color: colors.textMuted }]}>Freshness Score</Text>
                            <Text style={{ fontFamily: 'Syne_800ExtraBold', fontSize: 28, color: freshColor, marginTop: 2 }}>{Math.round(freshness)}%</Text>
                        </View>
                        <View style={[liveStyles.statusPill, { backgroundColor: sc.bg, borderRadius: radius.full }]}>
                            {status !== 'Fresh' && <PulsingDot color={sc.color} size={6} />}
                            <Ionicons name={status === 'Spoiled' ? 'alert-circle' : status === 'Warning' ? 'warning' : 'checkmark-circle'} size={14} color={sc.color} style={{ marginLeft: status !== 'Fresh' ? 4 : 0, marginRight: 4 }} />
                            <Text style={[typography.caption, { color: sc.color }]}>{status}</Text>
                        </View>
                    </View>
                )}

                {/* Spoilage Warning Banner */}
                {connected && status !== 'Fresh' && (
                    <View style={[liveStyles.warningBanner, { backgroundColor: sc.bg, borderRadius: radius.sm, marginTop: spacing.sm }]}>
                        <PulsingDot color={sc.color} size={8} />
                        <Ionicons name="alert-circle" size={14} color={sc.color} style={{ marginLeft: 6, marginRight: 4 }} />
                        <Text style={[typography.caption, { color: sc.color }]}>{status} — Freshness at {Math.round(freshness)}%</Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={[liveStyles.actionRow, { marginTop: spacing.md }]}>
                    <TouchableOpacity
                        style={[liveStyles.actionBtn, { backgroundColor: 'rgba(164,198,57,0.12)', borderRadius: radius.md, flex: 1 }]}
                        onPress={() => navigation.navigate('Camera', { containerId: ct?.id || 'C1' })}
                    >
                        <Ionicons name="camera" size={16} color={COLORS.lime} style={{ marginRight: 6 }} />
                        <Text style={[typography.bodyBold, { color: COLORS.lime }]}>Update Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[liveStyles.actionBtn, { backgroundColor: 'rgba(6,182,212,0.12)', borderRadius: radius.md, flex: 1 }]}
                        onPress={loadLive}
                    >
                        <Feather name="refresh-cw" size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
                        <Text style={[typography.bodyBold, { color: COLORS.cyan }]}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ─── Regular Container Card ───
    const renderItem = ({ item }) => {
        const ts = checkTime(item.timestamp);
        const sr = item.sensor_readings && item.sensor_readings[0] ? item.sensor_readings[0] : {};
        const sc = getStatusConfig(item.status);
        const freshColor = getFreshnessColor(item.freshness_score);
        const history = sensorHistory.current[item.id] || { temp: [], humidity: [], nh3: [] };

        const sensorData = [
            { label: 'Temp', val: sr.temperature ? `${sr.temperature.toFixed(1)}°C` : '?°C', color: (sr.temperature || 0) > 33 ? COLORS.danger : COLORS.cyan, data: history.temp, sparkColor: COLORS.cyan, icon: 'thermometer-outline' },
            { label: 'Humidity', val: sr.humidity ? `${sr.humidity.toFixed(0)}%` : '?%', color: colors.text, data: history.humidity, sparkColor: '#A78BFA', icon: 'water-outline' },
            { label: 'NH\u2083', val: sr.NH3 ? sr.NH3.toFixed(2) : 'N/A', color: (sr.NH3 || 0) > 3 ? COLORS.danger : colors.text, data: history.nh3, sparkColor: COLORS.amber, icon: 'flask-outline' },
            { label: 'Freshness', val: `${Math.round(item.freshness_score)}%`, color: freshColor, data: [], sparkColor: COLORS.lime, icon: 'leaf-outline' },
        ];

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderLeftWidth: item.status !== 'Fresh' ? 4 : 1, borderLeftColor: item.status === 'Spoiled' ? colors.danger : item.status === 'Warning' ? colors.warning : 'rgba(255,255,255,0.10)' }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[typography.h3, { color: colors.text }]}>{item.food_name}</Text>
                        <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>{item.id}</Text>
                    </View>
                    <TouchableOpacity style={[styles.updateBtn, { backgroundColor: 'rgba(164,198,57,0.12)', borderRadius: radius.md }]} onPress={() => navigation.navigate('Camera', { containerId: item.id })}>
                        <Ionicons name="camera" size={14} color={COLORS.lime} style={{ marginRight: 4 }} />
                        <Text style={[typography.caption, { color: COLORS.lime }]}>Update</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.sensorGrid, { marginTop: spacing.sm }]}>
                    {sensorData.map((m, i) => (
                        <View key={i} style={[styles.sensorChip, glassStyle]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={[typography.small, { color: colors.textMuted }]}>{m.label}</Text>
                                    <Text style={[typography.bodyBold, { color: m.color, fontSize: 14, marginTop: 2 }]}>{m.val}</Text>
                                </View>
                                <Sparkline data={m.data} color={m.sparkColor} />
                            </View>
                        </View>
                    ))}
                </View>
                {item.status !== 'Fresh' && (
                    <View style={[styles.warningBanner, { backgroundColor: sc.bg, borderRadius: radius.sm, marginTop: spacing.sm }]}>
                        <PulsingDot />
                        <Ionicons name="alert-circle" size={14} color={sc.color} style={{ marginLeft: 6, marginRight: 4 }} />
                        <Text style={[typography.caption, { color: sc.color }]}>{item.status} — Freshness at {Math.round(item.freshness_score)}%</Text>
                    </View>
                )}
                <View style={[styles.timeBar, { backgroundColor: ts.urgent ? colors.dangerSoft : colors.successSoft, borderRadius: radius.sm, marginTop: spacing.sm }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="time-outline" size={13} color={ts.color} style={{ marginRight: 4 }} />
                        <Text style={[typography.caption, { color: ts.color }]}>{ts.label}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading dashboard...</Text>
        </View>
    );

    const summaryData = [
        { label: 'Total', val: allContainers.length, bg: colors.accentSoft, color: colors.accent },
        { label: 'Fresh', val: freshCount, bg: colors.successSoft, color: colors.success },
        { label: 'Warn', val: warnCount, bg: colors.warningSoft, color: colors.warning },
        { label: 'Spoiled', val: spoiledCount, bg: colors.dangerSoft, color: colors.danger },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            {unreadCount > 0 && (
                <TouchableOpacity style={[styles.alertBanner, { backgroundColor: colors.danger, borderRadius: radius.md, margin: spacing.md, marginBottom: 0 }]} onPress={() => setShowNotifs(!showNotifs)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <PulsingDot />
                        <Ionicons name="notifications" size={16} color="#FFF" style={{ marginLeft: 8, marginRight: 4 }} />
                        <Text style={[typography.bodyBold, { color: '#FFF' }]}>{unreadCount} Alert{unreadCount > 1 ? 's' : ''}</Text>
                    </View>
                    <Ionicons name={showNotifs ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            )}
            {showNotifs && (
                <View style={[styles.notifPanel, { backgroundColor: colors.card, margin: spacing.md, marginTop: spacing.sm, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }]}>
                    {notifications.slice(0, 5).map(n => (
                        <Text key={n.id} style={[typography.small, { color: n.type === 'danger' ? colors.danger : colors.warning, paddingVertical: 3 }]}>{n.message}</Text>
                    ))}
                    <TouchableOpacity onPress={() => { clearNotifications(); setShowNotifs(false); }} style={{ marginTop: spacing.xs }}>
                        <Text style={[typography.caption, { color: COLORS.lime }]}>Clear All</Text>
                    </TouchableOpacity>
                </View>
            )}
            <FlatList data={containers} renderItem={renderItem} keyExtractor={item => item.id} contentContainerStyle={{ padding: spacing.md }}
                ListHeaderComponent={
                    <View style={{ marginBottom: spacing.md }}>
                        {/* Live Hardware Container */}
                        {renderLiveCard()}

                        {/* Add Container Button */}
                        <TouchableOpacity style={[styles.addContainerBtn, { backgroundColor: COLORS.lime, borderRadius: radius.md, marginTop: spacing.md }]} onPress={() => navigation.navigate('Camera', { containerId: null })}>
                            <Ionicons name="camera" size={18} color={COLORS.midnight} style={{ marginRight: 6 }} />
                            <Text style={[typography.bodyBold, { color: COLORS.midnight }]}>Add New Container</Text>
                        </TouchableOpacity>

                        {/* Summary Row */}
                        <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
                            {summaryData.map((s, i) => (
                                <View key={i} style={[styles.summaryChip, { backgroundColor: s.bg, borderRadius: 14 }]}>
                                    <Text style={[typography.h3, { color: s.color }]}>{s.val}</Text>
                                    <Text style={[typography.small, { color: s.color, marginTop: 2 }]}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Section Divider */}
                        {containers.length > 0 && (
                            <View style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm, letterSpacing: 1, textTransform: 'uppercase' }]}>Other Containers</Text>
                            </View>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <View style={[styles.emptyState, { borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14 }]}>
                        <Text style={[typography.mono, { color: colors.textMuted, textAlign: 'center' }]}>No additional containers</Text>
                    </View>
                }
            />
        </View>
    );
}

// ─── Live Card Styles ───
const liveStyles = StyleSheet.create({
    card: {
        padding: 16,
        borderWidth: 2,
        elevation: 4,
        shadowColor: '#A4C639',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        gap: 5,
    },
    badgeText: {
        fontFamily: 'Syne_700Bold',
        fontSize: 11,
        color: '#EF4444',
        letterSpacing: 1.5,
    },
    connRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    sensorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    sensorChip: {
        width: '48%',
        padding: 10,
        marginBottom: 2,
    },
    freshnessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    warmupBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        borderWidth: 1,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bufferContainer: {
        paddingHorizontal: 2,
    },
    bufferTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    bufferFill: {
        height: '100%',
        borderRadius: 3,
    },
});

// ─── Regular Card Styles ───
const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    alertBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    notifPanel: { padding: 14 },
    addContainerBtn: { flexDirection: 'row', padding: 14, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#A4C639', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryChip: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    card: { padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    updateBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    sensorChip: { width: '48%', padding: 10, marginBottom: 2 },
    warningBanner: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    timeBar: { padding: 8 },
    emptyState: { marginTop: 40, padding: 32, borderWidth: 2, borderRadius: 14, alignItems: 'center' },
});
