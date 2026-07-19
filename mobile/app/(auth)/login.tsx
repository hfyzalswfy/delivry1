import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { useColors } from '../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../src/theme/spacing';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const colors = useColors();
  const styles = useStyles();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (!mountedRef.current) return;
      setLoading(false);
      if (result.error) { setError(result.error); return; }
    } catch (e) {
      if (mountedRef.current) setLoading(false);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FullDelivery</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/register" style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, backgroundColor: colors.surface },
  error: { color: colors.danger, fontSize: fontSize.sm },
  button: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  link: { alignItems: 'center', marginTop: spacing.md },
  linkText: { color: colors.primary, fontSize: fontSize.sm },
}), [colors]);
}
