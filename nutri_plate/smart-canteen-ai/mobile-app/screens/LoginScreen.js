import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, COLORS } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { setMockMode, USE_MOCK } from '../services/api';

export default function LoginScreen({ navigation }) {
    const { colors, spacing, radius, typography, fonts } = useTheme();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDemo, setIsDemo] = useState(USE_MOCK);

    const logoAnim = useRef(new Animated.Value(0)).current;
    const taglineAnim = useRef(new Animated.Value(0)).current;
    const formAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(200, [
            Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(taglineAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(formAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
        setError('');
        setLoading(true);
        try {
            await new Promise(r => setTimeout(r, 800));
            if (username.trim().length < 3) { setError('Username must be at least 3 characters'); setLoading(false); return; }
            login({ id: Date.now(), username: username.trim(), role });
        } catch (e) { setError('Login failed. Please try again.'); }
        setLoading(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['rgba(45,90,39,0.08)', 'transparent', 'rgba(6,182,212,0.05)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
                <Animated.View style={[styles.header, { opacity: logoAnim, transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
                    <MaskedView maskElement={<Text style={[styles.maskedTitle, fonts.syne800]}>NutriPlate</Text>}>
                        <LinearGradient colors={[COLORS.lime, COLORS.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={[styles.maskedTitle, fonts.syne800, { opacity: 0 }]}>NutriPlate</Text>
                        </LinearGradient>
                    </MaskedView>
                </Animated.View>

                <Animated.View style={{ opacity: taglineAnim, transform: [{ translateY: taglineAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], alignItems: 'center', marginBottom: spacing.xl }}>
                    <Text style={[typography.bodyLight, { color: colors.textMuted, textAlign: 'center' }]}>AI-Powered Smart Canteen</Text>
                </Animated.View>

                <Animated.View style={{ opacity: formAnim, transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity style={[styles.roleBtn, { borderColor: role === 'student' ? COLORS.lime : colors.border, backgroundColor: role === 'student' ? 'rgba(164,198,57,0.12)' : 'transparent', borderRadius: radius.full }]} onPress={() => setRole('student')}>
                            <Ionicons name="school" size={16} color={role === 'student' ? COLORS.lime : colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[typography.bodyBold, { color: role === 'student' ? COLORS.lime : colors.textMuted }]}>Student</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.roleBtn, { borderColor: role === 'staff' ? COLORS.cyan : colors.border, backgroundColor: role === 'staff' ? 'rgba(6,182,212,0.12)' : 'transparent', borderRadius: radius.full }]} onPress={() => setRole('staff')}>
                            <Ionicons name="restaurant" size={16} color={role === 'staff' ? COLORS.cyan : colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[typography.bodyBold, { color: role === 'staff' ? COLORS.cyan : colors.textMuted }]}>Staff</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.inputGroup, { marginTop: spacing.lg }]}>
                        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>USERNAME</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]} placeholder="Enter your username" placeholderTextColor={colors.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />
                    </View>
                    <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>PASSWORD</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]} placeholder="Enter your password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                    </View>

                    {error ? <Text style={[typography.caption, { color: COLORS.danger, marginTop: spacing.sm, textAlign: 'center' }]}>{error}</Text> : null}

                    <View style={styles.demoToggleContainer}>
                        <Text style={[typography.caption, { color: colors.textMuted, marginRight: 8 }]}>Demo Mode (Mock Data)</Text>
                        <TouchableOpacity 
                            style={[styles.toggleTrack, { backgroundColor: isDemo ? COLORS.lime : colors.border }]} 
                            onPress={() => {
                                const newMode = !isDemo;
                                setIsDemo(newMode);
                                setMockMode(newMode);
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.toggleThumb, { 
                                transform: [{ translateX: isDemo ? 20 : 0 }],
                                backgroundColor: isDemo ? COLORS.midnight : colors.textMuted 
                            }]} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.loginBtn, { backgroundColor: COLORS.lime, borderRadius: radius.full, marginTop: spacing.lg }]} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color={COLORS.midnight} /> : <Text style={[typography.h3, { color: COLORS.midnight }]}>Sign In</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.md }}>
                        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                            Don't have an account? <Text style={{ color: COLORS.lime }}>Create one</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    header: { alignItems: 'center', marginBottom: 12 },
    maskedTitle: { fontSize: 42, textAlign: 'center' },
    roleContainer: { flexDirection: 'row', gap: 10 },
    roleBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
    inputGroup: { width: '100%' },
    input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1 },
    loginBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#A4C639', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
    demoToggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    toggleTrack: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
    toggleThumb: { width: 20, height: 20, borderRadius: 10 },
});
