import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/auth-store';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';

interface ProfileSignOutProps {
  title?: string;
}

export function ProfileSignOut({ title = 'Sign Out' }: ProfileSignOutProps) {
  const colors = useColors();
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = () => {
    Alert.alert('Confirm Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: colors.danger + '40' }]}
      onPress={handleSignOut}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: colors.danger }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { marginHorizontal: spacing.md, marginTop: spacing.md, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.lg, borderWidth: 1 },
  text: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
