import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';

interface BackButtonProps {
  fallbackRoute?: string;
}

export function BackButton({ fallbackRoute = '/(app)/(driver)' }: BackButtonProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={() => { if (router.canGoBack()) router.back(); else router.replace(fallbackRoute as any); }}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Go back"
    >
      <MaterialIcons name="arrow-back" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingLeft: spacing.sm, paddingRight: spacing.md, paddingVertical: spacing.xs },
});
