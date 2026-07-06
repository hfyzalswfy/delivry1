import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../store/auth-store';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/spacing';

export function SignOutButton({ onPress }: { onPress?: () => void }) {
  const signOut = useAuthStore((s) => s.signOut);

  const handlePress = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
    onPress?.();
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>Sign Out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 12, paddingVertical: 6 },
  text: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
});
