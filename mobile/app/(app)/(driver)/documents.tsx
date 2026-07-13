import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DriverDocuments } from '../../../src/types/database';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useTranslation } from 'react-i18next';

const DOC_TYPES = [
  { key: 'license', labelKey: 'documents.driverLicense', icon: '\u{1F3C1}', descKey: 'documents.driverLicenseDesc' },
  { key: 'vehicle_registration', labelKey: 'documents.vehicleRegistration', icon: '\u{1F697}', descKey: 'documents.vehicleRegistrationDesc' },
  { key: 'national_id', labelKey: 'documents.nationalId', icon: '\u{1F464}', descKey: 'documents.nationalIdDesc' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function statusBadge(s: string, theme: ReturnType<typeof useTheme>): { labelKey: string; bg: string; text: string } {
  const m: Record<string, { labelKey: string; bg: string; text: string }> = {
    approved: { labelKey: 'documents.approved', bg: theme.statusDelivered, text: theme.statusDeliveredText },
    rejected: { labelKey: 'documents.rejected', bg: theme.statusCancelled, text: theme.statusCancelledText },
    pending: { labelKey: 'documents.pending', bg: theme.statusPending, text: theme.statusPendingText },
  };
  return m[s] || { labelKey: 'documents.notUploaded', bg: theme.disabledBg, text: theme.disabledText };
}

async function fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const file = new File(uri);
  const base64 = await file.base64();
  return decode(base64);
}

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: t('documents.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('documents.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <FlatList
        data={DOC_TYPES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[S.instructions, { color: theme.gray }]}>{t('documents.instructions')}</Text>
            {errorState && (
              <View style={[S.errorBanner, { backgroundColor: theme.statusCancelled }]}>
                <Text style={{ fontSize: 14 }}>{'\u{26A0}\u{FE0F}'}</Text>
                <Text style={[S.errorText, { color: theme.statusCancelledText }]}>{errorState}</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const doc = documents.get(item.key);
          const badge = statusBadge(doc?.status ?? 'missing', theme);
          const isUploading = uploading[item.key];

          return (
            <View style={[S.docCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={S.docHeader}>
                <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[S.docLabel, { color: theme.white }]}>{t(item.labelKey)}</Text>
                  <Text style={[S.docDesc, { color: theme.gray }]}>{t(item.descKey)}</Text>
                </View>
                <View style={[S.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[S.statusBadgeText, { color: badge.text }]}>{t(badge.labelKey)}</Text>
                </View>
              </View>
              {doc && (
                <View style={[S.docPreview, { borderTopColor: theme.border }]}>
                  <Text style={[S.docPreviewLabel, { color: theme.gray }]}>
                    {t('documents.uploaded', { date: new Date(doc.created_at).toLocaleDateString() })}
                    {doc.expires_at ? ` \u00B7 ${t('documents.expires', { date: new Date(doc.expires_at).toLocaleDateString() })}` : ''}
                  </Text>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <Text style={{ color: theme.statusCancelledText, fontSize: theme.fontSize.sm, marginTop: 4 }}>
                      {'\u{26A0}\u{FE0F} '}{t('documents.rejected')}: {doc.rejection_reason}
                    </Text>
                  )}
                </View>
              )}
              <View style={S.docActions}>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: theme.badgeGray }, isUploading && S.actionBtnDisabled]}
                  onPress={() => takePhoto(item.key)} disabled={isUploading}
                >
                  {isUploading
                    ? <ActivityIndicator size="small" color={theme.green} />
                    : <><Text style={{ fontSize: 16 }}>{'\u{1F4F7}'}</Text><Text style={[S.actionBtnText, { color: theme.white }]}>{t('documents.camera')}</Text></>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: theme.badgeGray }, isUploading && S.actionBtnDisabled]}
                  onPress={() => uploadFromGallery(item.key)} disabled={isUploading}
                >
                  {isUploading
                    ? <ActivityIndicator size="small" color={theme.green} />
                    : <><Text style={{ fontSize: 16 }}>{'\u{1F5BC}'}</Text><Text style={[S.actionBtnText, { color: theme.white }]}>{t('documents.gallery')}</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={S.footer}>
            <Text style={[S.footerText, { color: theme.dim }]}>{t('documents.footerNote')}</Text>
            <TouchableOpacity style={[S.statusBtn, { borderColor: theme.green }]} onPress={() => router.push('/(app)/(driver)/account-status')}>
              <Text style={[S.statusBtnText, { color: theme.green }]}>{t('documents.viewStatus')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  instructions: { fontSize: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 12, lineHeight: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, gap: 8 },
  errorText: { flex: 1, fontSize: 12 },
  docCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  docHeader: { flexDirection: 'row', alignItems: 'center' },
  docLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  docDesc: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  docPreview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  docPreviewLabel: { fontSize: 12 },
  docActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, gap: 8 },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  footer: { marginHorizontal: 16, marginTop: 8, alignItems: 'center' },
  footerText: { fontSize: 12, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  statusBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 14, fontWeight: '600' },
});
