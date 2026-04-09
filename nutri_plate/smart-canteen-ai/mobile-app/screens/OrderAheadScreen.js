import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getMenuItems, placeOrder, getOrders } from '../services/api';

export default function OrderAheadScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [menu, setMenu] = useState([]);
    const [cart, setCart] = useState({});
    const [orders, setOrders] = useState([]);
    const [tab, setTab] = useState('menu');

    useEffect(() => {
        setMenu(getMenuItems()); setOrders(getOrders());
        const interval = setInterval(() => setOrders(getOrders()), 5000);
        return () => clearInterval(interval);
    }, []);

    const addToCart = (key) => setCart(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    const removeFromCart = (key) => setCart(prev => { const n = { ...prev }; if (n[key] > 1) n[key]--; else delete n[key]; return n; });

    const cartItems = Object.entries(cart).map(([key, qty]) => { const item = menu.find(m => m.key === key); return item ? { ...item, quantity: qty } : null; }).filter(Boolean);
    const totalPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const handleOrder = () => {
        if (cartItems.length === 0) { Alert.alert('Empty Cart', 'Add items first!'); return; }
        const order = placeOrder(cartItems.map(i => ({ foodName: i.name, key: i.key, quantity: i.quantity, price: i.price })));
        Alert.alert('Order Placed!', `Order ${order.id}\nEstimated wait: ${order.estimatedWaitMinutes} min\nTotal: ₹${totalPrice}`);
        setCart({}); setOrders(getOrders());
    };

    const getOrderStatusConfig = (status) => {
        if (status === 'Ready for Pickup') return { bg: colors.successSoft, color: colors.success, icon: 'checkmark-circle' };
        return { bg: colors.warningSoft, color: colors.warning, icon: 'time-outline' };
    };

    const renderMenuItem = ({ item }) => (
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.success : colors.danger }]} />
                    <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>{item.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginLeft: 14 }}>
                    <Text style={[typography.small, { color: colors.textMuted }]}>{item.calories} cal</Text>
                    <Text style={[typography.small, { color: colors.textMuted }]}> • </Text>
                    <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                    <Text style={[typography.small, { color: colors.textMuted, marginLeft: 2 }]}>{item.prepTime}min</Text>
                </View>
            </View>
            <Text style={[typography.bodyBold, { color: colors.accent, marginRight: 10 }]}>₹{item.price}</Text>
            <View style={styles.qtyControls}>
                {cart[item.key] > 0 && (
                    <>
                        <TouchableOpacity onPress={() => removeFromCart(item.key)} style={[styles.qtyBtn, { backgroundColor: colors.dangerSoft }]}>
                            <Feather name="minus" size={16} color={colors.danger} />
                        </TouchableOpacity>
                        <Text style={[typography.bodyBold, { color: colors.text, marginHorizontal: 8 }]}>{cart[item.key]}</Text>
                    </>
                )}
                <TouchableOpacity onPress={() => addToCart(item.key)} style={[styles.qtyBtn, { backgroundColor: colors.successSoft }]}>
                    <Feather name="plus" size={16} color={colors.success} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <View style={[styles.tabRow, { margin: spacing.md, backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: 4 }]}>
                <TouchableOpacity style={[styles.tab, tab === 'menu' && { backgroundColor: colors.accent }, { borderRadius: radius.md }]} onPress={() => setTab('menu')}>
                    <Ionicons name="cart-outline" size={14} color={tab === 'menu' ? '#FFF' : colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[typography.bodyBold, { color: tab === 'menu' ? '#FFF' : colors.textMuted }]}>Order</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'orders' && { backgroundColor: colors.accent }, { borderRadius: radius.md }]} onPress={() => { setTab('orders'); setOrders(getOrders()); }}>
                    <Ionicons name="cube-outline" size={14} color={tab === 'orders' ? '#FFF' : colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[typography.bodyBold, { color: tab === 'orders' ? '#FFF' : colors.textMuted }]}>My Orders ({orders.length})</Text>
                </TouchableOpacity>
            </View>

            {tab === 'orders' ? (
                <FlatList data={orders} keyExtractor={item => item.id} contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="cube-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                            <Text style={[typography.h3, { color: colors.textSecondary }]}>No orders yet</Text>
                            <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>Place your first order!</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const remaining = Math.max(0, Math.round((item.estimatedReady - Date.now()) / 60000));
                        const sc = getOrderStatusConfig(item.status);
                        return (
                            <View style={[styles.orderCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                                <View style={styles.orderHeader}>
                                    <Text style={[typography.bodyBold, { color: colors.text }]}>{item.id}</Text>
                                    <View style={[styles.orderStatusPill, { backgroundColor: sc.bg, borderRadius: radius.full }]}>
                                        <Ionicons name={sc.icon} size={12} color={sc.color} style={{ marginRight: 3 }} />
                                        <Text style={[typography.caption, { color: sc.color }]}>{item.status}</Text>
                                    </View>
                                </View>
                                {item.items.map((i, idx) => (
                                    <Text key={idx} style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]}>• {i.foodName} ×{i.quantity} — ₹{i.price * i.quantity}</Text>
                                ))}
                                <View style={[styles.orderFooter, { borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
                                    <Text style={[typography.bodyBold, { color: colors.text }]}>₹{item.totalPrice}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name={item.status === 'Ready for Pickup' ? 'checkmark-circle' : 'time-outline'} size={14} color={sc.color} style={{ marginRight: 4 }} />
                                        <Text style={[typography.caption, { color: sc.color }]}>{item.status === 'Ready for Pickup' ? 'Ready!' : `~${remaining}min`}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            ) : (
                <>
                    {cartItems.length > 0 && (
                        <View style={[styles.cartCard, { backgroundColor: colors.card, margin: spacing.md, marginTop: 0, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                            <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>Cart ({cartItems.length} items)</Text>
                            {cartItems.map(i => (
                                <Text key={i.key} style={[typography.body, { color: colors.textSecondary }]}>{i.name} ×{i.quantity} = ₹{i.price * i.quantity}</Text>
                            ))}
                            <TouchableOpacity style={[styles.orderBtn, { backgroundColor: colors.accent, borderRadius: radius.md, marginTop: spacing.md }]} onPress={handleOrder}>
                                <Text style={[typography.bodyBold, { color: '#FFF', fontSize: 16 }]}>Place Order — ₹{totalPrice}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <FlatList data={menu} renderItem={renderMenuItem} keyExtractor={item => item.key} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabRow: { flexDirection: 'row' },
    tab: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    menuCard: { flexDirection: 'row', padding: 14, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
    qtyControls: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cartCard: { padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    orderBtn: { padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
    orderCard: { padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    orderStatusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4 },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1 },
    empty: { alignItems: 'center', marginTop: 60 },
    vegDot: { width: 8, height: 8, borderRadius: 4 },
});
