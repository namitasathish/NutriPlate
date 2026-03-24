import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const { colors, spacing, radius, typography } = useTheme();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }
        setError('');
        setLoading(true);
        try {
            // Mock login — accepts any credentials with 3+ char username
            await new Promise(r => setTimeout(r, 800));
            if (username.trim().length < 3) {
                setError('Username must be at least 3 characters');
                setLoading(false);
                return;
            }
            const userData = { id: Date.now(), username: username.trim(), role };
            login(userData);
        } catch (e) {
            setError('Login failed. Please try again.');
        }
        setLoading(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={colors.statusBar} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.logoCircle, { backgroundColor: colors.accentSoft }]}>
                        <Text style={styles.logoEmoji}>🍽️</Text>
                    </View>
                    <Text style={[typography.h1, { color: colors.text, marginTop: spacing.md }]}>NutriPlate</Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>AI-Powered Smart Canteen</Text>
                </View>

                {/* Role Selector */}
                <View style={[styles.roleContainer, { backgroundColor: colors.cardAlt, borderRadius: radius.xl }]}>
                    <TouchableOpacity
                        style={[styles.roleBtn, role === 'student' && { backgroundColor: colors.accent }, { borderRadius: radius.lg }]}
                        onPress={() => setRole('student')}
                    >
                        <Text style={[typography.bodyBold, { color: role === 'student' ? '#FFF' : colors.textMuted }]}>🎓 Student</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleBtn, role === 'staff' && { backgroundColor: colors.accent }, { borderRadius: radius.lg }]}
                        onPress={() => setRole('staff')}
                    >
                        <Text style={[typography.bodyBold, { color: role === 'staff' ? '#FFF' : colors.textMuted }]}>👨‍🍳 Staff</Text>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={[styles.inputGroup, { marginTop: spacing.lg }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>USERNAME</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                        placeholder="Enter your username"
                        placeholderTextColor={colors.textMuted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>
                <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs }]}>PASSWORD</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.sm, textAlign: 'center' }]}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.loginBtn, { backgroundColor: colors.accent, borderRadius: radius.md, marginTop: spacing.lg }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={[typography.bodyBold, { color: '#FFF', fontSize: 16 }]}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.md }}>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                        Don't have an account? <Text style={{ color: colors.accent, fontWeight: '600' }}>Create one</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    header: { alignItems: 'center', marginBottom: 32 },
    logoCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    logoEmoji: { fontSize: 36 },
    roleContainer: { flexDirection: 'row', padding: 4, marginTop: 8 },
    roleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    inputGroup: { width: '100%' },
    input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1 },
    loginBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
