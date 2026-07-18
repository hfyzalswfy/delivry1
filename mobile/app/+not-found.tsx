import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../src/theme/spacing';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '404' }} />
      <Text style={[styles.code, { color: colors.primary }]}>404</Text>
      <Text style={[styles.title, { color: colors.text }]}>{t('common.notFound')}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primaryLight }]} onPress={() => router.replace('/(app)/(driver)')}>
        <Text style={[styles.btnText, { color: colors.primary }]}>{t('common.goBack')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  code: { fontSize: fontSize.mega, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  title: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.lg },
  btn: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.xl, borderRadius: borderRadius.lg },
  btnText: { fontSize: fontSize.md, fontWeight: '600' },
});
