import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';

export function LoadingScreen() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
