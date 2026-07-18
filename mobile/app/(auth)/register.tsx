import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../src/constants/icons';
import { useColors } from '../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../src/theme/spacing';
import { UserRole } from '../../src/types/database';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const colors = useColors();
  const styles = useStyles();

  const roles: { value: UserRole; label: string; icon: keyof typeof ICONS }[] = [
    { value: 'customer', label: 'Customer', icon: 'packageIcon' },
    { value: 'driver', label: 'Driver', icon: 'car' },
    { value: 'store', label: 'Store', icon: 'store' },
  ];

  const handleRegister = async () => {
    setError('');
    if (!fullName || !email || !password || !role) {
      setError('Please fill in all required fields and select a role');
      return;
    }
    setLoading(true);
    const result = await signUp(email, password, fullName, role, phone || undefined);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Choose your role and sign up</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Phone (for delivery contact)</Text>
        <TextInput
          style={styles.input}
          placeholder="+1234567890"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
            >
              <MaterialIcons name={ICONS[r.icon]} size={fontSize.xxl} color={role === r.value ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </Link>
      </View>
    </View>
  );
}

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  form: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, backgroundColor: colors.surface },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleCard: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', backgroundColor: colors.surface },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginTop: spacing.xs },
  roleLabelActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  error: { color: colors.danger, fontSize: fontSize.sm },
  button: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  link: { alignItems: 'center', marginTop: spacing.md },
  linkText: { color: colors.primary, fontSize: fontSize.sm },
}), [colors]);
}
