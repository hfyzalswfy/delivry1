import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from 'react-i18next';

export function BackButton() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
      <Text style={[styles.arrow, { color: theme.white }]}>{'\u2190'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingLeft: 8, paddingRight: 16, paddingVertical: 4 },
  arrow: { fontSize: 22, fontWeight: '600' },
});
