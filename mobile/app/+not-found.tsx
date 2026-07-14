import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ title: '404' }} />
      <Text style={[styles.code, { color: theme.green }]}>404</Text>
      <Text style={[styles.title, { color: theme.white }]}>{t('common.notFound')}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.greenDark }]} onPress={() => router.replace('/(app)/(driver)')}>
        <Text style={[styles.btnText, { color: theme.greenLight }]}>{t('common.goBack')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  code: { fontSize: 64, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 24 },
  btn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
});
