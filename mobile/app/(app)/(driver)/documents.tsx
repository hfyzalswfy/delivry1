import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DriverDocuments } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../src/constants/icons';

const DOC_TYPES = [
  { key: 'license', labelKey: 'documents.driverLicense', icon: ICONS.flag, descKey: 'documents.driverLicenseDesc' },
  { key: 'vehicle_registration', labelKey: 'documents.vehicleRegistration', icon: ICONS.car, descKey: 'documents.vehicleRegistrationDesc' },
  { key: 'national_id', labelKey: 'documents.nationalId', icon: ICONS.person, descKey: 'documents.nationalIdDesc' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function statusBadge(s: string, colors: ReturnType<typeof useColors>): { labelKey: string; bg: string; text: string } {
  const m: Record<string, { labelKey: string; bg: string; text: string }> = {
    approved: { labelKey: 'documents.approved', bg: colors.successLight, text: colors.success },
    rejected: { labelKey: 'documents.rejected', bg: colors.dangerLight, text: colors.danger },
    pending: { labelKey: 'documents.pending', bg: colors.infoLight, text: colors.info },
  };
  return m[s] || { labelKey: 'documents.notUploaded', bg: colors.borderLight, text: colors.disabled };
}

async function fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const file = new File(uri);
  const base64 = await file.base64();
  return decode(base64);
}

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Map<string, DriverDocuments>>(new Map());
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errorState, setErrorState] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchDocs = useCallback(async (dId: string) => {
    const { data: docs, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', dId)
      .is('deleted_at', null);

    if (error) { setErrorState(t('error.unexpectedError')); return; }

    const docMap = new Map<string, DriverDocuments>();
    (docs ?? []).forEach((d) => {
      const existing = docMap.get(d.document_type);
      if (!existing || new Date(d.created_at) > new Date(existing.created_at)) {
        docMap.set(d.document_type, d);
      }
    });
    setDocuments(docMap);
    setErrorState(null);
  }, [t]);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;
    (async () => {
      const { data: driver, error } = await supabase.from('drivers').select('id').eq('profile_id', profile.id).single();
      if (error || !driver) { if (!cancelledRef.current) { setErrorState(t('error.driverNotFound')); setLoading(false); } return; }
      if (!cancelledRef.current) setDriverId(driver.id);
      await fetchDocs(driver.id);
      if (!cancelledRef.current) setLoading(false);
    })();
    return () => { cancelledRef.current = true; };
  }, [profile, fetchDocs, t]);

  const pickAndUpload = async (docType: string, pickerFn: () => Promise<ImagePicker.ImagePickerResult>) => {
    if (!driverId) return;

    let result: ImagePicker.ImagePickerResult;
    try { result = await pickerFn(); } catch (err: any) {
      Alert.alert(t('error.operationFailed'), err?.message || t('error.unexpectedError'));
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert(t('error.fileTooLarge'), t('documents.fileTooLarge'));
      return;
    }
    if (asset.mimeType && !ALLOWED_TYPES.includes(asset.mimeType)) {
      Alert.alert(t('error.unsupportedFormat'), t('documents.unsupportedFormat'));
      return;
    }

    setUploading((prev) => ({ ...prev, [docType]: true }));
    setErrorState(null);

    try {
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${profile!.id}/${docType}_${Date.now()}.${fileExt}`;
      const contentType = asset.mimeType || `image/${fileExt}`;

      const arrayBuffer = await fileToArrayBuffer(asset.uri);

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, arrayBuffer, { contentType, upsert: true });

      if (uploadError) {
        const msg = uploadError.message?.toLowerCase() || '';
        if (msg.includes('bucket') || msg.includes('not found') || msg.includes('404')) {
          Alert.alert(t('error.storageNotConfigured'), t('documents.storageNotConfigured'));
        } else if (msg.includes('permission') || msg.includes('policy') || msg.includes('403')) {
          Alert.alert(t('error.permissionDenied'), t('documents.permissionDenied'));
        } else if (msg.includes('duplicate')) {
          Alert.alert(t('error.operationFailed'), t('documents.retry'));
        } else {
          Alert.alert(t('documents.uploadFailed'), `${t('documents.uploadFailed')}: ${uploadError.message}`);
        }
        setUploading((prev) => ({ ...prev, [docType]: false }));
        return;
      }

      const { data: urlData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('driver_documents').insert({
        driver_id: driverId,
        document_type: docType,
        document_url: urlData.publicUrl,
        status: 'pending',
      });

      if (dbError) {
        Alert.alert(t('error.operationFailed'), `${t('error.operationFailed')}: ${dbError.message}`);
        setUploading((prev) => ({ ...prev, [docType]: false }));
        return;
      }

      await fetchDocs(driverId);
      Alert.alert(t('common.success'), t('documents.uploadSuccess'));
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('network') || msg.includes('fetch')) {
        Alert.alert(t('error.networkError'), t('documents.networkError'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.retry'), onPress: () => pickAndUpload(docType, pickerFn) },
        ]);
      } else if (msg.includes('timeout')) {
        Alert.alert(t('error.uploadFailed'), t('error.uploadTimeout'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.retry'), onPress: () => pickAndUpload(docType, pickerFn) },
        ]);
      } else if (msg.includes('permission') || msg.includes('denied')) {
        Alert.alert(t('error.permissionDenied'), t('documents.permissionDenied'));
      } else if (msg.includes('enoent') || msg.includes('no such file')) {
        Alert.alert(t('error.operationFailed'), t('documents.fileNotFound'));
      } else {
        Alert.alert(t('documents.uploadFailed'), `${t('error.unexpectedError')}: ${msg}`, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.retry'), onPress: () => pickAndUpload(docType, pickerFn) },
        ]);
      }
    }

    setUploading((prev) => ({ ...prev, [docType]: false }));
  };

  const takePhoto = (docType: string) =>
    pickAndUpload(docType, async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') throw new Error('Camera permission denied');
      return ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    });

  const uploadFromGallery = (docType: string) =>
    pickAndUpload(docType, async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') throw new Error('Gallery permission denied');
      return ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: t('documents.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('documents.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <FlatList
        data={DOC_TYPES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[S.instructions, { color: colors.textSecondary }]}>{t('documents.instructions')}</Text>
            {errorState && (
              <View style={[S.errorBanner, { backgroundColor: colors.dangerLight }]}>
                <MaterialIcons name={ICONS.warning} size={fontSize.sm} color={colors.danger} />
                <Text style={[S.errorText, { color: colors.danger }]}>{errorState}</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const doc = documents.get(item.key);
          const badge = statusBadge(doc?.status ?? 'missing', colors);
          const isUploading = uploading[item.key];

          return (
            <View style={[S.docCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={S.docHeader}>
                <MaterialIcons name={item.icon as any} size={fontSize.xxxl} color={colors.text} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={[S.docLabel, { color: colors.text }]}>{t(item.labelKey)}</Text>
                  <Text style={[S.docDesc, { color: colors.textSecondary }]}>{t(item.descKey)}</Text>
                </View>
                <View style={[S.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[S.statusBadgeText, { color: badge.text }]}>{t(badge.labelKey)}</Text>
                </View>
              </View>
              {doc && (
                <View style={[S.docPreview, { borderTopColor: colors.border }]}>
                  <Text style={[S.docPreviewLabel, { color: colors.textSecondary }]}>
                    {t('documents.uploaded', { date: new Date(doc.created_at).toLocaleDateString() })}
                    {doc.expires_at ? ` \u00B7 ${t('documents.expires', { date: new Date(doc.expires_at).toLocaleDateString() })}` : ''}
                  </Text>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <MaterialIcons name={ICONS.warning} size={fontSize.sm} color={colors.danger} />
                      <Text style={{ color: colors.danger, fontSize: fontSize.sm, marginLeft: spacing.xs }}>
                        {t('documents.rejected')}: {doc.rejection_reason}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={S.docActions}>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: colors.borderLight }, isUploading && S.actionBtnDisabled]}
                  onPress={() => takePhoto(item.key)} disabled={isUploading}
                >
                  {isUploading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <><MaterialIcons name={ICONS.camera} size={fontSize.md} color={colors.text} /><Text style={[S.actionBtnText, { color: colors.text }]}>{t('documents.camera')}</Text></>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: colors.borderLight }, isUploading && S.actionBtnDisabled]}
                  onPress={() => uploadFromGallery(item.key)} disabled={isUploading}
                >
                  {isUploading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <><MaterialIcons name={ICONS.photoLibrary} size={fontSize.md} color={colors.text} /><Text style={[S.actionBtnText, { color: colors.text }]}>{t('documents.gallery')}</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={S.footer}>
            <Text style={[S.footerText, { color: colors.textTertiary }]}>{t('documents.footerNote')}</Text>
            <TouchableOpacity style={[S.statusBtn, { borderColor: colors.primary }]} onPress={() => router.push('/(app)/(driver)/account-status')}>
              <Text style={[S.statusBtnText, { color: colors.primary }]}>{t('documents.viewStatus')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  instructions: { fontSize: fontSize.sm, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.md, lineHeight: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.sm },
  errorText: { flex: 1, fontSize: fontSize.xs },
  docCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1 },
  docHeader: { flexDirection: 'row', alignItems: 'center' },
  docLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  docDesc: { fontSize: fontSize.xs },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, marginLeft: spacing.sm },
  statusBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  docPreview: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  docPreviewLabel: { fontSize: fontSize.xs },
  docActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, paddingVertical: spacing.md, gap: spacing.sm },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  footer: { marginHorizontal: spacing.md, marginTop: spacing.sm, alignItems: 'center' },
  footerText: { fontSize: fontSize.xs, textAlign: 'center', marginBottom: spacing.md, lineHeight: 18 },
  statusBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1 },
  statusBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
