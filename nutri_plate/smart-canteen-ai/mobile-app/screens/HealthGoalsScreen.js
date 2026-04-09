import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, COLORS } from '../context/ThemeContext';
import { getHealthGoals, setHealthGoals, getRecommendations } from '../services/api';

const getCalorieCaption = (val) => {
    if (val < 1500) return { text: 'Caloric deficit', color: COLORS.cyan };
    if (val <= 2200) return { text: 'Balanced range', color: COLORS.lime };
    return { text: 'Bulking target', color: COLORS.amber };
};
const getProteinCaption = (val) => {
    if (val < 80) return { text: 'Low intake', color: COLORS.cyan };
    if (val <= 150) return { text: 'Good for maintenance', color: COLORS.lime };
    return { text: 'High protein / muscle building', color: COLORS.amber };
};

export default function HealthGoalsScreen({ navigation }) {
    const { colors, spacing, radius, typography, fonts } = useTheme();
    const [goals, setGoals] = useState({ calories: 2000, protein: 60, carbohydrates: 250, fat: 65 });
    const [recs, setRecs] = useState([]);

    useEffect(() => {
        const current = getHealthGoals();
        setGoals({ calories: current.calories, protein: current.protein, carbohydrates: current.carbohydrates, fat: current.fat });
    }, []);

    const handleSave = () => {
        setHealthGoals(goals);
        setRecs(getRecommendations());
        Alert.alert('Goals Saved', 'Your meal recommendations have been updated.');
    };

    const PRESETS = [
        { label: 'Muscle Gain', icon: 'barbell-outline', pack: 'ion', calories: 2800, protein: 120, carbohydrates: 300, fat: 80 },
        { label: 'Weight Loss', icon: 'fitness-outline', pack: 'ion', calories: 1500, protein: 80, carbohydrates: 150, fat: 40 },
        { label: 'Balanced', icon: 'scale-outline', pack: 'ion', calories: 2000, protein: 60, carbohydrates: 250, fat: 65 },
        { label: 'Low Carb', icon: 'leaf-outline', pack: 'ion', calories: 1800, protein: 100, carbohydrates: 80, fat: 90 },
    ];

    const calCaption = getCalorieCaption(goals.calories);
    const proCaption = getProteinCaption(goals.protein);

    const SLIDER_FIELDS = [
        { key: 'calories', label: 'Daily Calories', icon: 'flame-outline', pack: 'ion', min: 1000, max: 4000, step: 50, unit: 'kcal', color: COLORS.danger, caption: calCaption },
        { key: 'protein', label: 'Protein', icon: 'fitness-outline', pack: 'ion', min: 20, max: 250, step: 5, unit: 'g', color: COLORS.cyan, caption: proCaption },
        { key: 'carbohydrates', label: 'Carbohydrates', icon: 'nutrition-outline', pack: 'ion', min: 20, max: 500, step: 10, unit: 'g', color: COLORS.amber, caption: null },
        { key: 'fat', label: 'Fat', icon: 'water-outline', pack: 'ion', min: 10, max: 200, step: 5, unit: 'g', color: '#A78BFA', caption: null },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            <StatusBar barStyle={colors.statusBar} />
            <View style={[styles.headerCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <MaterialCommunityIcons name="target" size={32} color={colors.accent} style={{ marginBottom: spacing.sm }} />
                <Text style={[typography.h2, { color: colors.text }]}>Set Your Daily Goals</Text>
                <Text style={[typography.bodyLight, { color: colors.textSecondary, marginTop: spacing.xs }]}>Personalize your nutrition targets and get tailored recommendations.</Text>
            </View>

            <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Quick Presets</Text>
            <View style={styles.presetsGrid}>
                {PRESETS.map(p => (
                    <TouchableOpacity key={p.label} style={[styles.presetBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]} onPress={() => setGoals({ calories: p.calories, protein: p.protein, carbohydrates: p.carbohydrates, fat: p.fat })}>
                        <Ionicons name={p.icon} size={18} color={colors.accent} style={{ marginBottom: 4 }} />
                        <Text style={[typography.bodyBold, { color: colors.text, textAlign: 'center', fontSize: 13 }]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Custom Goals</Text>
            {SLIDER_FIELDS.map(field => (
                <View key={field.key} style={[styles.sliderCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
                    <View style={styles.sliderHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: field.color + '20' }]}>
                            <Ionicons name={field.icon} size={18} color={field.color} />
                        </View>
                        <Text style={[typography.bodyBold, { color: colors.text, marginLeft: spacing.sm }]}>{field.label}</Text>
                    </View>
                    <Text style={[styles.liveNumber, fonts.syne800, { color: colors.text }]}>
                        {goals[field.key]}<Text style={[typography.body, { color: colors.textMuted }]}> {field.unit}</Text>
                    </Text>
                    <Slider style={styles.slider} minimumValue={field.min} maximumValue={field.max} step={field.step} value={goals[field.key]} onValueChange={val => setGoals(prev => ({ ...prev, [field.key]: val }))} minimumTrackTintColor={COLORS.lime} maximumTrackTintColor={colors.border} thumbTintColor={COLORS.greenDeep} />
                    <View style={styles.rangeLabels}>
                        <Text style={[typography.small, { color: colors.textMuted }]}>{field.min}{field.unit}</Text>
                        <Text style={[typography.small, { color: colors.textMuted }]}>{field.max}{field.unit}</Text>
                    </View>
                    {field.caption && (
                        <View style={[styles.captionPill, { backgroundColor: field.caption.color + '15', borderRadius: radius.full, marginTop: spacing.sm }]}>
                            <Text style={[typography.caption, { color: field.caption.color }]}>{field.caption.text}</Text>
                        </View>
                    )}
                </View>
            ))}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.lime, borderRadius: radius.full, marginTop: spacing.lg }]} onPress={handleSave}>
                <Ionicons name="save" size={18} color={COLORS.midnight} style={{ marginRight: 6 }} />
                <Text style={[typography.h3, { color: COLORS.midnight }]}>Save Goals & Get Suggestions</Text>
            </TouchableOpacity>

            {recs.length > 0 && (
                <View style={{ marginTop: spacing.xl }}>
                    <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>Recommended Foods</Text>
                    {recs.map(r => (
                        <View key={r.key} style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.vegDot, { backgroundColor: r.isVeg ? colors.success : colors.danger }]} />
                                <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>{r.name}</Text>
                            </View>
                            <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2, marginLeft: 14 }]}>{r.calories} cal  {r.protein}g protein  ₹{r.price}</Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerCard: { padding: 24, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    presetBtn: { width: '48%', paddingVertical: 14, borderWidth: 1, alignItems: 'center' },
    sliderCard: { padding: 20, borderWidth: 1, marginBottom: 12 },
    sliderHeader: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    liveNumber: { fontSize: 42, marginTop: 12, textAlign: 'center' },
    slider: { width: '100%', height: 44, marginTop: 8 },
    rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    captionPill: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6 },
    saveBtn: { flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#A4C639', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    recCard: { padding: 14, borderWidth: 1, marginBottom: 8 },
    vegDot: { width: 8, height: 8, borderRadius: 4 },
});
