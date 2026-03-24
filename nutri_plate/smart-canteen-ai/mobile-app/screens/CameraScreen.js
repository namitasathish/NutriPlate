import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ActivityIndicator, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { uploadImage, analyzePlatePhoto, addToPlate } from '../services/api';

export default function CameraScreen({ navigation, route }) {
    const { colors, spacing, radius, typography } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedUri, setCapturedUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [plateResults, setPlateResults] = useState(null);
    const cameraRef = useRef(null);
    const containerId = route.params?.containerId;
    const mode = route.params?.mode || 'staff';

    // ─── Pick from Device Gallery ───
    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to upload images.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setCapturedUri(result.assets[0].uri);
        }
    };

    if (!permission) {
        return <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
                <StatusBar barStyle={colors.statusBar} />
                <View style={[styles.permCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📷</Text>
                    <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>Camera Access Required</Text>
                    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
                        NutriPlate needs camera access to scan and analyze food items.
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        style={[styles.permBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]}
                    >
                        <Text style={[typography.bodyBold, { color: '#FFF' }]}>Grant Permission</Text>
                    </TouchableOpacity>
                    {/* Gallery fallback even without camera permission */}
                    <TouchableOpacity
                        onPress={pickFromGallery}
                        style={[styles.galleryFallback, { borderColor: colors.accent, borderRadius: radius.md, marginTop: spacing.sm }]}
                    >
                        <Text style={[typography.bodyBold, { color: colors.accent }]}>🖼️ Upload from Gallery Instead</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false, exif: false });
                setCapturedUri(photo.uri);
            } catch (e) {
                Alert.alert("Error", "Could not capture photo. Try again.");
            }
        }
    };

    const handleStaffUpload = async () => {
        setUploading(true);
        try {
            const result = await uploadImage(capturedUri, containerId);
            setUploading(false);
            Alert.alert(
                "✅ Food Analyzed!",
                `🍳 Food: ${result.food_name}\n📊 Spoilage: ${(result.vision_spoilage_score * 100).toFixed(1)}%\n📦 Container: ${result.container_id}`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (e) {
            setUploading(false);
            Alert.alert("Error", "Upload failed. Try again.");
        }
    };

    const handlePlateScan = async () => {
        setUploading(true);
        try {
            const detected = await analyzePlatePhoto(capturedUri);
            setUploading(false);
            setPlateResults(detected);
        } catch (e) {
            setUploading(false);
            Alert.alert("Error", "Could not analyze plate.");
        }
    };

    const handleAddDetectedToPlate = () => {
        if (plateResults) {
            plateResults.forEach(item => addToPlate(item.key));
            Alert.alert("✅ Added!", `${plateResults.length} items added to your meal plan.`, [
                { text: "View Plate", onPress: () => navigation.navigate('MealPlanner') },
                { text: "OK" },
            ]);
        }
    };

    // ─── Plate scan results view ───
    if (plateResults) {
        let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
        plateResults.forEach(item => {
            if (item.nutrition) {
                totalCal += item.nutrition.calories;
                totalPro += item.nutrition.protein;
                totalCarb += item.nutrition.carbohydrates;
                totalFat += item.nutrition.fat;
            }
        });

        return (
            <View style={[styles.container, { backgroundColor: colors.bg }]}>
                <StatusBar barStyle="light-content" />
                <Image source={{ uri: capturedUri }} style={styles.resultImage} />
                <View style={[styles.resultCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>🔍 Detected on Your Plate</Text>
                    {plateResults.map((item, i) => (
                        <View key={i} style={[styles.detectedRow, { borderBottomColor: colors.border }]}>
                            <Text style={[typography.bodyBold, { color: colors.text, flex: 1 }]}>{item.name}</Text>
                            <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.nutrition?.calories} cal</Text>
                            <View style={[styles.confBadge, { backgroundColor: colors.successSoft, borderRadius: radius.full, marginLeft: 8 }]}>
                                <Text style={[typography.small, { color: colors.success }]}>{(item.confidence * 100).toFixed(0)}%</Text>
                            </View>
                        </View>
                    ))}
                    <View style={[styles.totalRow, { borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
                        <Text style={[typography.bodyBold, { color: colors.text }]}>Total</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{totalCal} cal • {totalPro}g P • {totalCarb}g C • {totalFat}g F</Text>
                    </View>
                </View>
                <View style={[styles.resultActions, { padding: spacing.md, gap: 10 }]}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardAlt, borderRadius: radius.md, flex: 1 }]} onPress={() => { setPlateResults(null); setCapturedUri(null); }}>
                        <Text style={[typography.bodyBold, { color: colors.text }]}>🔄 Rescan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success, borderRadius: radius.md, flex: 1 }]} onPress={handleAddDetectedToPlate}>
                        <Text style={[typography.bodyBold, { color: '#FFF' }]}>➕ Add to Plate</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── Preview mode (photo taken or picked) ───
    if (capturedUri) {
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <StatusBar barStyle="light-content" />
                <Image source={{ uri: capturedUri }} style={styles.preview} />
                <View style={[styles.previewBar, { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 }]}>
                    <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm }]}>
                        {mode === 'plate_scan' ? '📷 Plate photo' : containerId ? `Updating: ${containerId}` : 'New container'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardAlt, borderRadius: radius.md, flex: 1 }]} onPress={() => setCapturedUri(null)}>
                            <Text style={[typography.bodyBold, { color: colors.text }]}>🔄 Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.accent, borderRadius: radius.md, flex: 1 }]}
                            onPress={mode === 'plate_scan' ? handlePlateScan : handleStaffUpload}
                            disabled={uploading}
                        >
                            <Text style={[typography.bodyBold, { color: '#FFF' }]}>
                                {uploading ? '⏳ Analyzing...' : mode === 'plate_scan' ? '🔍 Analyze' : '✅ Upload'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // ─── Camera mode with Gallery button ───
    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            <StatusBar barStyle="light-content" />
            <CameraView style={styles.camera} facing="back" ref={cameraRef} />
            <View style={styles.overlay}>
                <View style={[styles.hintPill, { borderRadius: radius.full }]}>
                    <Text style={[typography.bodyBold, { color: '#FFF' }]}>
                        {mode === 'plate_scan' ? '📷 Scan your plate' : containerId ? `📷 Update ${containerId}` : '📷 Scan new food'}
                    </Text>
                </View>
            </View>
            {/* Corner markers */}
            <View style={styles.frameCornersContainer}>
                <View style={[styles.cornerTL, { borderColor: colors.accent }]} />
                <View style={[styles.cornerTR, { borderColor: colors.accent }]} />
                <View style={[styles.cornerBL, { borderColor: colors.accent }]} />
                <View style={[styles.cornerBR, { borderColor: colors.accent }]} />
            </View>
            {/* Bottom controls: Gallery + Capture + Flip placeholder */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery} activeOpacity={0.7}>
                    <View style={[styles.galleryBtnInner, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md }]}>
                        <Text style={{ fontSize: 24 }}>🖼️</Text>
                        <Text style={[typography.small, { color: '#FFF', marginTop: 2 }]}>Gallery</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.7}>
                    <View style={styles.captureInner} />
                </TouchableOpacity>
                {/* Spacer for symmetry */}
                <View style={styles.galleryBtn} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    camera: { flex: 1 },
    overlay: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center' },
    hintPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10 },
    frameCornersContainer: { position: 'absolute', top: '25%', left: '15%', right: '15%', bottom: '35%' },
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3 },
    bottomBar: {
        position: 'absolute', bottom: 30, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        paddingHorizontal: 30,
    },
    galleryBtn: { width: 60, alignItems: 'center' },
    galleryBtnInner: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
    captureBtn: {
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#FFF',
    },
    captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF' },
    preview: { flex: 1, resizeMode: 'cover' },
    previewBar: { padding: 16 },
    actionBtn: { paddingVertical: 14, alignItems: 'center' },
    permCard: { padding: 32, alignItems: 'center', width: '100%', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    permBtn: { paddingVertical: 14, paddingHorizontal: 32, elevation: 3, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
    galleryFallback: { paddingVertical: 14, paddingHorizontal: 32, borderWidth: 2 },
    resultImage: { height: 220, resizeMode: 'cover' },
    resultCard: { padding: 20, marginHorizontal: 16, marginTop: -24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    detectedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    confBadge: { paddingHorizontal: 8, paddingVertical: 3 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2 },
    resultActions: { flexDirection: 'row' },
});
