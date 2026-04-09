import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getMenuItems, addToPlate, removeFromPlate, clearPlate, getPlate, getRecommendations } from '../services/api';

export default function MealPlannerScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [menu, setMenu] = useState([]);
    const [plate, setPlate] = useState({ items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }, goals: {} });
    const [recommendations, setRecs] = useState([]);
    const [showRecs, setShowRecs] = useState(false);

    useEffect(() => { setMenu(getMenuItems()); setPlate(getPlate()); }, []);

    const handleAdd = (key) => { const u = addToPlate(key); setPlate(u); setRecs(getRecommendations()); };
    const handleRemove = (key) => { const u = removeFromPlate(key); setPlate(u); setRecs(getRecommendations()); };
    const handleClear = () => { const u = clearPlate(); setPlate(u); setRecs([]); };

    const goals = plate.goals;
    const macros = [
        { key: 'calories', label: 'Calories', val: plate.totals.calories, max: goals.calories || 2000, color: colors.danger, unit: 'kcal' },
        { key: 'protein', label: 'Protein', val: plate.totals.protein, max: goals.protein || 60, color: colors.cyan, unit: 'g' },
        { key: 'carbs', label: 'Carbs', val: plate.totals.carbohydrates, max: goals.carbohydrates || 250, color: colors.warning, unit: 'g' },
        { key: 'fat', label: 'Fat', val: plate.totals.fat, max: goals.fat || 65, color: '#A78BFA', unit: 'g' },
    ];

    const renderMenuItem = ({ item }) => {
        const onPlate = plate.items.find(p => p.key === item.key);
        return (
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.success : colors.danger }]} />
                        <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>{item.name}</Text>
                    </View>
                    <Text style={[typography.small, { color: colors.textMuted, marginTop: 2, marginLeft: 14 }]}>{item.calories} cal  {item.protein}g protein  ₹{item.price}</Text>
                </View>
                <View style={styles.qtyControls}>
                    {onPlate && (
                        <TouchableOpacity onPress={() => handleRemove(item.key)} style={[styles.qtyBtn, { backgroundColor: colors.dangerSoft }]}>
                            <Feather name="minus" size={16} color={colors.danger} />
                        </TouchableOpacity>
                    )}
                    {onPlate && <Text style={[typography.bodyBold, { color: colors.text, marginHorizontal: 8 }]}>{onPlate.quantity}</Text>}
                    <TouchableOpacity onPress={() => handleAdd(item.key)} style={[styles.qtyBtn, { backgroundColor: colors.successSoft }]}>
                        <Feather name="plus" size={16} color={colors.success} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <FlatList
                data={showRecs ? recommendations : menu}
                renderItem={renderMenuItem}
                keyExtractor={item => item.key}
                contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
                ListHeaderComponent={
                    <View>
                        <View style={[styles.goalsCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                            <View style={styles.goalsHeader}>
                                <Text style={[typography.label, { color: colors.textMuted }]}>Today's Goals</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('HealthGoals')}>
                                    <Text style={[typography.caption, { color: colors.accent }]}>Edit Goals</Text>
                                </TouchableOpacity>
                            </View>
                            {macros.map(m => {
                                const pct = Math.min(100, (m.val / m.max) * 100);
                                return (
                                    <View key={m.key} style={{ marginBottom: 10 }}>
                                        <View style={styles.macroLabelRow}>
                                            <Text style={[typography.caption, { color: colors.text }]}>{m.label}</Text>
                                            <Text style={[typography.small, { color: colors.textSecondary }]}>{Math.round(m.val)} / {m.max} {m.unit}</Text>
                                        </View>
                                        <View style={[styles.barTrack, { backgroundColor: colors.cardAlt, borderRadius: radius.full }]}>
                                            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pct > 100 ? colors.danger : m.color, borderRadius: radius.full }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={[styles.actionsRow, { marginTop: spacing.md, marginBottom: spacing.md }]}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: showRecs ? colors.cardAlt : colors.accent, borderRadius: radius.md }]} onPress={() => { setShowRecs(!showRecs); setRecs(getRecommendations()); }}>
                                <Ionicons name={showRecs ? 'list' : 'bulb-outline'} size={14} color={showRecs ? colors.text : '#FFF'} style={{ marginRight: 4 }} />
                                <Text style={[typography.caption, { color: showRecs ? colors.text : '#FFF' }]}>{showRecs ? 'Menu' : 'Suggest'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]} onPress={() => navigation.navigate('Camera', { mode: 'plate_scan' })}>
                                <Ionicons name="camera-outline" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                                <Text style={[typography.caption, { color: colors.accent }]}>Scan Plate</Text>
                            </TouchableOpacity>
                            {plate.items.length > 0 && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.dangerSoft, borderRadius: radius.md }]} onPress={handleClear}>
                                    <Ionicons name="trash-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                                    <Text style={[typography.caption, { color: colors.danger }]}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {plate.items.length > 0 && (
                            <View style={[styles.plateCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, marginBottom: spacing.md }]}>
                                <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>Your Plate ({plate.items.length})</Text>
                                {plate.items.map(item => (
                                    <View key={item.key} style={styles.plateRow}>
                                        <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{item.name} ×{item.quantity}</Text>
                                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{(item.nutrition?.calories || 0) * item.quantity} cal</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Text style={[typography.label, { color: colors.textMuted }]}>{showRecs ? 'Recommended for You' : 'Canteen Menu'}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    goalsCard: { padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    goalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    barTrack: { height: 6 },
    barFill: { height: 6 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    plateCard: { padding: 16, elevation: 1 },
    plateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    menuCard: { flexDirection: 'row', padding: 14, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
    qtyControls: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    vegDot: { width: 8, height: 8, borderRadius: 4 },
});
