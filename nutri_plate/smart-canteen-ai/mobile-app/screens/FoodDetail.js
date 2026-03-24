import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { rateFood, getAverageRating } from '../services/api';

export default function FoodDetail({ route }) {
    const { colors, spacing, radius, typography } = useTheme();
    const { container } = route.params;
    const nutrition = container.nutrition || null;
    const [myRating, setMyRating] = useState(0);
    const [comment, setComment] = useState('');
    const [ratings, setRatings] = useState(getAverageRating(container.food_name));

    const getFreshnessColor = (score) => {
        if (score < 40) return colors.danger;
        if (score < 70) return colors.warning;
        return colors.success;
    };

    const sensorData = container.sensor_readings?.[0] || {};
    const freshColor = getFreshnessColor(container.freshness_score);

    const handleRate = () => {
        if (myRating === 0) { Alert.alert('Select Rating', 'Tap the stars first!'); return; }
        const updated = rateFood(container.food_name, myRating, comment || 'No comment');
        setRatings(updated);
        setMyRating(0);
        setComment('');
        Alert.alert('✅ Thanks!', `You rated ${container.food_name} ${myRating}/5`);
    };

    const NutritionBar = ({ label, value, max, color, unit }) => {
        const pct = Math.min((value / max) * 100, 100);
        return (
            <View style={styles.nutriBarRow}>
                <View style={styles.nutriLabelRow}>
                    <View style={[styles.nutriDot, { backgroundColor: color }]} />
                    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>{value}{unit}</Text>
                </View>
                <View style={[styles.nutriBarTrack, { backgroundColor: colors.cardAlt, borderRadius: radius.full }]}>
                    <View style={[styles.nutriBarFill, { width: `${pct}%`, backgroundColor: color, borderRadius: radius.full }]} />
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            <StatusBar barStyle={colors.statusBar} />

            {/* Header Card */}
            <View style={[styles.headerCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[typography.h2, { color: colors.text }]}>{container.food_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{container.id}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}> • </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{nutrition?.category || 'Food'}</Text>
                    {nutrition?.isVeg !== undefined && (
                        <View style={[styles.vegBadge, { backgroundColor: nutrition.isVeg ? colors.successSoft : colors.dangerSoft, borderRadius: radius.full, marginLeft: 8 }]}>
                            <Text style={[typography.small, { color: nutrition.isVeg ? colors.success : colors.danger }]}>
                                {nutrition.isVeg ? '● Veg' : '● Non-Veg'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Freshness Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.md }]}>Freshness Analysis</Text>
                <View style={styles.freshnessCenter}>
                    <View style={[styles.bigRing, { borderColor: freshColor }]}>
                        <Text style={[styles.bigScore, { color: freshColor }]}>{Math.round(container.freshness_score)}%</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: freshColor === colors.success ? colors.successSoft : freshColor === colors.warning ? colors.warningSoft : colors.dangerSoft, borderRadius: radius.full, marginTop: spacing.sm }]}>
                        <Text style={[typography.bodyBold, { color: freshColor }]}>{container.status}</Text>
                    </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.md }]} />
                <View style={styles.infoRow}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Spoilage Score</Text>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>{container.sensor_score?.toFixed(3) || '0.000'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>Vision Analysis</Text>
                    <Text style={[typography.bodyBold, { color: container.vision_features ? colors.success : colors.danger }]}>
                        {container.vision_features ? '✅ Complete' : '❌ Missing'}
                    </Text>
                </View>
            </View>

            {/* Sensor Data */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.md }]}>Live Sensor Readings</Text>
                <View style={styles.sensorGrid}>
                    {[
                        { val: sensorData.NH3, label: 'NH₃', unit: 'ppm', warn: 3, icon: '💨' },
                        { val: sensorData.H2S, label: 'H₂S', unit: 'ppm', warn: 2, icon: '🧪' },
                        { val: sensorData.temperature, label: 'Temp', unit: '°C', warn: 35, icon: '🌡️' },
                        { val: sensorData.humidity, label: 'Humidity', unit: '%', warn: 75, icon: '💧' },
                    ].map((s, i) => (
                        <View key={i} style={[styles.sensorTile, { backgroundColor: colors.cardAlt, borderRadius: radius.md }]}>
                            <Text style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</Text>
                            <Text style={[typography.h3, { color: (s.val || 0) > s.warn ? colors.danger : colors.text }]}>
                                {s.val?.toFixed(1) || 'N/A'}
                            </Text>
                            <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>{s.label} ({s.unit})</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Nutrition */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.md }]}>Nutrition Facts</Text>
                {nutrition ? (
                    <View>
                        <NutritionBar label="Calories" value={nutrition.calories} max={500} color="#EF4444" unit=" kcal" />
                        <NutritionBar label="Protein" value={nutrition.protein} max={50} color="#6C63FF" unit="g" />
                        <NutritionBar label="Carbs" value={nutrition.carbohydrates} max={80} color="#F59E0B" unit="g" />
                        <NutritionBar label="Fat" value={nutrition.fat} max={40} color="#A78BFA" unit="g" />
                        <NutritionBar label="Vitamins" value={nutrition.vitamins} max={30} color="#22C55E" unit="%" />
                        <NutritionBar label="Calcium" value={nutrition.calcium} max={30} color="#06B6D4" unit="%" />
                    </View>
                ) : (
                    <Text style={[typography.body, { color: colors.textMuted, fontStyle: 'italic' }]}>Nutrition data not available.</Text>
                )}
            </View>

            {/* Rating Section */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>Rate This Dish</Text>
                {ratings.count > 0 && (
                    <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                        {'★'.repeat(Math.round(ratings.avg))}{'☆'.repeat(5 - Math.round(ratings.avg))} {ratings.avg}/5 ({ratings.count} reviews)
                    </Text>
                )}
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <TouchableOpacity key={n} onPress={() => setMyRating(n)} style={styles.starTouch}>
                            <Text style={[styles.star, { color: n <= myRating ? colors.warning : colors.textMuted }]}>
                                {n <= myRating ? '★' : '☆'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    style={[styles.commentInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                    placeholder="Leave a comment (optional)..."
                    placeholderTextColor={colors.textMuted}
                    value={comment}
                    onChangeText={setComment}
                />
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]} onPress={handleRate}>
                    <Text style={[typography.bodyBold, { color: '#FFF' }]}>Submit Rating</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerCard: { padding: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    vegBadge: { paddingHorizontal: 8, paddingVertical: 3 },
    sectionCard: { padding: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    freshnessCenter: { alignItems: 'center' },
    bigRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
    bigScore: { fontSize: 28, fontWeight: '800' },
    statusPill: { paddingHorizontal: 16, paddingVertical: 6 },
    divider: { height: 1 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sensorTile: { width: '48%', padding: 14, alignItems: 'center' },
    nutriBarRow: { marginBottom: 14 },
    nutriLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    nutriDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    nutriBarTrack: { height: 6 },
    nutriBarFill: { height: 6 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
    starTouch: { padding: 4 },
    star: { fontSize: 34 },
    commentInput: { padding: 14, borderWidth: 1, marginBottom: 12, fontSize: 15 },
    submitBtn: { padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
});
