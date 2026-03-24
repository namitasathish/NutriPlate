import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getHealthGoals, setHealthGoals, getRecommendations } from '../services/api';

export default function HealthGoalsScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [goals, setGoals] = useState({ calories: '2000', protein: '60', carbohydrates: '250', fat: '65' });
    const [recs, setRecs] = useState([]);

    useEffect(() => {
        const current = getHealthGoals();
        setGoals({
            calories: String(current.calories),
            protein: String(current.protein),
            carbohydrates: String(current.carbohydrates),
            fat: String(current.fat),
        });
    }, []);

    const handleSave = () => {
        const parsed = {
            calories: parseInt(goals.calories) || 2000,
            protein: parseInt(goals.protein) || 60,
            carbohydrates: parseInt(goals.carbohydrates) || 250,
            fat: parseInt(goals.fat) || 65,
        };
        setHealthGoals(parsed);
        setRecs(getRecommendations());
        Alert.alert('✅ Goals Saved!', 'Your meal recommendations have been updated.');
    };

    const PRESETS = [
        { label: '🏋 Muscle Gain', calories: '2800', protein: '120', carbohydrates: '300', fat: '80' },
        { label: '🏃 Weight Loss', calories: '1500', protein: '80', carbohydrates: '150', fat: '40' },
        { label: '⚖️ Balanced', calories: '2000', protein: '60', carbohydrates: '250', fat: '65' },
        { label: '🥗 Low Carb', calories: '1800', protein: '100', carbohydrates: '80', fat: '90' },
    ];

    const FIELDS = [
        { key: 'calories', label: 'Daily Calories', unit: 'kcal', icon: '🔥', color: '#EF4444' },
        { key: 'protein', label: 'Protein', unit: 'g', icon: '💪', color: '#6C63FF' },
        { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g', icon: '🌾', color: '#F59E0B' },
        { key: 'fat', label: 'Fat', unit: 'g', icon: '🧈', color: '#A78BFA' },
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            <StatusBar barStyle={colors.statusBar} />

            <View style={[styles.headerCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>🎯</Text>
                <Text style={[typography.h2, { color: colors.text }]}>Set Your Daily Goals</Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    Personalize your nutrition targets and get tailored recommendations.
                </Text>
            </View>

            {/* Quick Presets */}
            <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Quick Presets</Text>
            <View style={styles.presetsGrid}>
                {PRESETS.map(p => (
                    <TouchableOpacity
                        key={p.label}
                        style={[styles.presetBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}
                        onPress={() => setGoals({ calories: p.calories, protein: p.protein, carbohydrates: p.carbohydrates, fat: p.fat })}
                    >
                        <Text style={[typography.bodyBold, { color: colors.text, textAlign: 'center' }]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Custom Goals */}
            <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Custom Goals</Text>
            {FIELDS.map(field => (
                <View key={field.key} style={[styles.goalRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
                    <View style={[styles.iconCircle, { backgroundColor: field.color + '20' }]}>
                        <Text style={{ fontSize: 18 }}>{field.icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[typography.bodyBold, { color: colors.text }]}>{field.label}</Text>
                        <Text style={[typography.small, { color: colors.textMuted }]}>{field.unit}</Text>
                    </View>
                    <TextInput
                        style={[styles.goalInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border, borderRadius: radius.sm }]}
                        value={goals[field.key]}
                        onChangeText={v => setGoals({ ...goals, [field.key]: v })}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                    />
                </View>
            ))}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent, borderRadius: radius.md, marginTop: spacing.lg }]} onPress={handleSave}>
                <Text style={[typography.bodyBold, { color: '#FFF', fontSize: 16 }]}>💾 Save Goals & Get Suggestions</Text>
            </TouchableOpacity>

            {/* Recommendations */}
            {recs.length > 0 && (
                <View style={{ marginTop: spacing.xl }}>
                    <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>Recommended Foods</Text>
                    {recs.map(r => (
                        <View key={r.key} style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
                            <Text style={[typography.bodyBold, { color: colors.text }]}>{r.isVeg ? '🟢' : '🔴'} {r.name}</Text>
                            <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
                                {r.calories} cal • {r.protein}g protein • ₹{r.price}
                            </Text>
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
    goalRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, marginBottom: 8 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    goalInput: { width: 80, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, fontSize: 16, fontWeight: '700' },
    saveBtn: { padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    recCard: { padding: 14, borderWidth: 1, marginBottom: 8 },
});
