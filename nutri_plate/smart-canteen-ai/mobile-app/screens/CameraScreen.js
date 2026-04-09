import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ActivityIndicator, StatusBar, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme, COLORS } from '../context/ThemeContext';
import { uploadImage, analyzePlatePhoto, addToPlate } from '../services/api';

function PulsingScanBar({ visible }) {
    const opacity = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        if (visible) {
            Animated.loop(Animated.sequence([
                Animated.timing(opacity, { toValue: 1.0, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.4, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])).start();
        } else { opacity.setValue(0); }
    }, [visible]);
    if (!visible) return null;
    return <Animated.View style={[styles.scanBar, { opacity }]} />;
}

function TypewriterText({ phases, style, monoStyle }) {
    const [text, setText] = useState('');
    const [phaseIdx, setPhaseIdx] = useState(0);
    useEffect(() => {
        let charIdx = 0;
        const phase = phases[phaseIdx];
        setText('');
        const interval = setInterval(() => {
            charIdx++;
            setText(phase.substring(0, charIdx));
            if (charIdx >= phase.length) { clearInterval(interval); setTimeout(() => { if (phaseIdx < phases.length - 1) setPhaseIdx(phaseIdx + 1); }, 600); }
        }, 150);
        return () => clearInterval(interval);
    }, [phaseIdx]);
    return <Text style={[style, monoStyle]}>{text}<Text style={{ opacity: 0.4 }}>_</Text></Text>;
}

export default function CameraScreen({ navigation, route }) {
    const { colors, spacing, radius, typography, fonts } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedUri, setCapturedUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [plateResults, setPlateResults] = useState(null);
    const [sheetStage, setSheetStage] = useState(0);
    const [uploadResult, setUploadResult] = useState(null);
    const cameraRef = useRef(null);
    const sheetHeight = useRef(new Animated.Value(0)).current;
    const containerId = route.params?.containerId;
    const mode = route.params?.mode || 'staff';

    const animateSheet = (stage) => {
        Animated.spring(sheetHeight, { toValue: stage === 2 ? 320 : stage === 1 ? 180 : 0, tension: 60, friction: 8, useNativeDriver: false }).start();
        setSheetStage(stage);
    };

    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access is required.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
        if (!result.canceled && result.assets?.[0]) setCapturedUri(result.assets[0].uri);
    };

    if (!permission) return <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.accent} /></View>;

    if (!permission.granted) return (
        <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
            <StatusBar barStyle={colors.statusBar} />
            <View style={[styles.permCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 }]}>
                <Ionicons name="camera" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
                <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>Camera Access Required</Text>
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>NutriPlate needs camera access to scan and analyze food items.</Text>
                <TouchableOpacity onPress={requestPermission} style={[styles.permBtn, { backgroundColor: COLORS.lime, borderRadius: radius.full }]}>
                    <Text style={[typography.bodyBold, { color: COLORS.midnight }]}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromGallery} style={[styles.galleryFallback, { borderColor: COLORS.lime, borderRadius: radius.full, marginTop: spacing.sm }]}>
                    <Ionicons name="images" size={16} color={COLORS.lime} style={{ marginRight: 6 }} />
                    <Text style={[typography.bodyBold, { color: COLORS.lime }]}>Upload from Gallery Instead</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const takePicture = async () => {
        if (cameraRef.current) {
            try { const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false, exif: false }); setCapturedUri(photo.uri); }
            catch (e) { Alert.alert("Error", "Could not capture photo."); }
        }
    };

    const handleStaffUpload = async () => {
        setUploading(true); animateSheet(0);
        try { const result = await uploadImage(capturedUri, containerId); setUploading(false); setUploadResult(result); animateSheet(1); }
        catch (e) { setUploading(false); Alert.alert("Error", "Upload failed."); }
    };

    const handlePlateScan = async () => {
        setUploading(true);
        try { setPlateResults(await analyzePlatePhoto(capturedUri)); setUploading(false); }
        catch (e) { setUploading(false); Alert.alert("Error", "Could not analyze plate."); }
    };

    const handleAddDetectedToPlate = () => {
        if (plateResults) {
            plateResults.forEach(item => addToPlate(item.key));
            Alert.alert("Added!", `${plateResults.length} items added to your meal plan.`, [
                { text: "View Plate", onPress: () => navigation.navigate('MealPlanner') }, { text: "OK" },
            ]);
        }
    };

    const FreshnessPill = ({ score }) => {
        const isFresh = score >= 70;
        const pulseAnim = useRef(new Animated.Value(1)).current;
        useEffect(() => {
            if (!isFresh) { Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])).start(); }
        }, [isFresh]);
        return (
            <Animated.View style={[styles.freshPill, { backgroundColor: isFresh ? 'rgba(164,198,57,0.15)' : 'rgba(245,158,11,0.15)', borderRadius: radius.full, opacity: isFresh ? 1 : pulseAnim }]}>
                <Ionicons name={isFresh ? 'checkmark-circle' : 'alert-circle'} size={12} color={isFresh ? COLORS.lime : COLORS.amber} style={{ marginRight: 3 }} />
                <Text style={[typography.caption, { color: isFresh ? COLORS.lime : COLORS.amber }]}>{isFresh ? 'Fresh' : 'Caution'}</Text>
            </Animated.View>
        );
    };

    // Plate scan results
    if (plateResults) {
        let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
        plateResults.forEach(item => { if (item.nutrition) { totalCal += item.nutrition.calories; totalPro += item.nutrition.protein; totalCarb += item.nutrition.carbohydrates; totalFat += item.nutrition.fat; } });
        return (
            <View style={[styles.container, { backgroundColor: colors.bg }]}>
                <StatusBar barStyle="light-content" />
                <Image source={{ uri: capturedUri }} style={styles.resultImage} />
                <View style={[styles.resultCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                        <Ionicons name="search" size={18} color={colors.text} style={{ marginRight: 6 }} />
                        <Text style={[typography.h3, { color: colors.text }]}>Detected on Your Plate</Text>
                    </View>
                    {plateResults.map((item, i) => (
                        <View key={i} style={[styles.detectedRow, { borderBottomColor: colors.border }]}>
                            <Text style={[typography.bodyBold, { color: colors.text, flex: 1 }]}>{item.name}</Text>
                            <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.nutrition?.calories} cal</Text>
                            <FreshnessPill score={85} />
                        </View>
                    ))}
                    <View style={[styles.totalRow, { borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
                        <Text style={[typography.bodyBold, { color: colors.text }]}>Total</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{totalCal} cal  {totalPro}g P  {totalCarb}g C  {totalFat}g F</Text>
                    </View>
                </View>
                <View style={[styles.resultActions, { padding: spacing.md, gap: 10 }]}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardAlt, borderRadius: radius.md, flex: 1 }]} onPress={() => { setPlateResults(null); setCapturedUri(null); }}>
                        <Feather name="refresh-cw" size={16} color={colors.text} style={{ marginRight: 4 }} />
                        <Text style={[typography.bodyBold, { color: colors.text }]}>Rescan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.lime, borderRadius: radius.md, flex: 1 }]} onPress={handleAddDetectedToPlate}>
                        <Ionicons name="add-circle" size={16} color={COLORS.midnight} style={{ marginRight: 4 }} />
                        <Text style={[typography.bodyBold, { color: COLORS.midnight }]}>Add to Plate</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Preview mode
    if (capturedUri) return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle="light-content" />
            <Image source={{ uri: capturedUri }} style={styles.preview} />
            {uploading && (
                <View style={styles.aiOverlay}>
                    <PulsingScanBar visible={true} />
                    <TypewriterText phases={['Scanning...', 'Analyzing...', 'Processing result']} style={{ color: COLORS.lime, fontSize: 16, textAlign: 'center', marginTop: 12 }} monoStyle={fonts.jetbrains} />
                </View>
            )}
            <Animated.View style={[styles.bottomSheet, { height: sheetHeight, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: 14 }]}>
                {sheetStage >= 1 && uploadResult && (
                    <View style={{ padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[typography.h3, { color: colors.text }]}>{uploadResult.food_name}</Text>
                            <FreshnessPill score={(1 - uploadResult.vision_spoilage_score) * 100} />
                        </View>
                        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', marginTop: 4 }]}>Confidence: {((1 - uploadResult.vision_spoilage_score) * 100).toFixed(0)}%</Text>
                        {sheetStage === 1 && (
                            <TouchableOpacity onPress={() => animateSheet(2)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[typography.caption, { color: COLORS.lime }]}>View macro breakdown</Text>
                                <Ionicons name="chevron-down" size={14} color={COLORS.lime} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        )}
                        {sheetStage === 2 && uploadResult.nutrition && (
                            <View style={[styles.macroChips, { marginTop: 16 }]}>
                                {[
                                    { label: 'Calories', val: uploadResult.nutrition.calories, color: COLORS.danger },
                                    { label: 'Protein', val: `${uploadResult.nutrition.protein}g`, color: COLORS.cyan },
                                    { label: 'Carbs', val: `${uploadResult.nutrition.carbohydrates}g`, color: COLORS.amber },
                                    { label: 'Fat', val: `${uploadResult.nutrition.fat}g`, color: '#A78BFA' },
                                ].map((m, i) => (
                                    <View key={i} style={[styles.macroChip, { borderColor: m.color + '40' }]}>
                                        <Text style={[typography.small, { color: 'rgba(255,255,255,0.5)' }]}>{m.label}</Text>
                                        <Text style={[typography.bodyBold, { color: m.color, marginTop: 2 }]}>{m.val}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </Animated.View>
            {!uploading && sheetStage === 0 && (
                <View style={[styles.previewBar, { backgroundColor: 'rgba(15,23,42,0.92)', borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 }]}>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: spacing.sm }]}>
                        {mode === 'plate_scan' ? 'Plate photo' : containerId ? `Updating: ${containerId}` : 'New container'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, flex: 1 }]} onPress={() => { setCapturedUri(null); setUploadResult(null); animateSheet(0); }}>
                            <Feather name="refresh-cw" size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={[typography.bodyBold, { color: colors.text }]}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.lime, borderRadius: radius.md, flex: 1 }]} onPress={mode === 'plate_scan' ? handlePlateScan : handleStaffUpload} disabled={uploading}>
                            <Ionicons name={mode === 'plate_scan' ? 'search' : 'cloud-upload'} size={16} color={COLORS.midnight} style={{ marginRight: 4 }} />
                            <Text style={[typography.bodyBold, { color: COLORS.midnight }]}>{mode === 'plate_scan' ? 'Analyze' : 'Upload'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {sheetStage > 0 && (
                <View style={[styles.previewBar, { backgroundColor: 'rgba(15,23,42,0.92)', borderTopWidth: 0 }]}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, flex: 1 }]} onPress={() => { setCapturedUri(null); setUploadResult(null); animateSheet(0); }}>
                            <Feather name="refresh-cw" size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={[typography.bodyBold, { color: colors.text }]}>New Scan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.lime, borderRadius: radius.md, flex: 1 }]} onPress={() => navigation.goBack()}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.midnight} style={{ marginRight: 4 }} />
                            <Text style={[typography.bodyBold, { color: COLORS.midnight }]}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    // Camera mode
    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle="light-content" />
            <CameraView style={styles.camera} facing="back" ref={cameraRef} />
            <View style={styles.overlay}>
                <View style={[styles.hintPill, { borderRadius: radius.full }]}>
                    <Ionicons name="camera" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={[typography.bodyBold, { color: colors.text }]}>
                        {mode === 'plate_scan' ? 'Scan your plate' : containerId ? `Update ${containerId}` : 'Scan new food'}
                    </Text>
                </View>
            </View>
            <View style={styles.frameCornersContainer}>
                <View style={[styles.cornerTL, { borderColor: COLORS.lime }]} />
                <View style={[styles.cornerTR, { borderColor: COLORS.lime }]} />
                <View style={[styles.cornerBL, { borderColor: COLORS.lime }]} />
                <View style={[styles.cornerBR, { borderColor: COLORS.lime }]} />
            </View>
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery} activeOpacity={0.7}>
                    <View style={[styles.galleryBtnInner, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md }]}>
                        <Ionicons name="images" size={24} color="#FFF" />
                        <Text style={[typography.small, { color: '#FFF', marginTop: 2 }]}>Gallery</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.7}>
                    <View style={styles.captureInner} />
                </TouchableOpacity>
                <View style={styles.galleryBtn} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    camera: { flex: 1 },
    overlay: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center' },
    hintPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
    frameCornersContainer: { position: 'absolute', top: '25%', left: '15%', right: '15%', bottom: '35%' },
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 36, height: 36, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 4 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 36, height: 36, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 4 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 36, height: 36, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 4 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 4 },
    scanBar: { height: 3, backgroundColor: '#A4C639', borderRadius: 99, width: '70%', alignSelf: 'center' },
    aiOverlay: { position: 'absolute', top: '26%', left: '15%', right: '15%', alignItems: 'center' },
    bottomBar: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 30 },
    galleryBtn: { width: 60, alignItems: 'center' },
    galleryBtnInner: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
    captureBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(164,198,57,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#A4C639' },
    captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#A4C639' },
    preview: { flex: 1, resizeMode: 'cover' },
    previewBar: { padding: 16 },
    bottomSheet: { position: 'absolute', bottom: 80, left: 12, right: 12 },
    actionBtn: { flexDirection: 'row', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    freshPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
    macroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    macroChip: { width: '47%', padding: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center' },
    permCard: { padding: 32, alignItems: 'center', width: '100%', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    permBtn: { paddingVertical: 14, paddingHorizontal: 32, elevation: 3, shadowColor: '#A4C639', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
    galleryFallback: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 32, borderWidth: 2 },
    resultImage: { height: 220, resizeMode: 'cover' },
    resultCard: { padding: 20, marginHorizontal: 16, marginTop: -24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    detectedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2 },
    resultActions: { flexDirection: 'row' },
});
