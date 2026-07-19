import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/auth-store';
import { useAuthGuard } from '../src/hooks/use-auth';
import { ActivityIndicator, View } from 'react-native';
import { useSettingsStore } from '../src/store/settings-store';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import '../src/i18n/i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  return <>{children}</>;
}

function RootLayoutInner() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => { initialize(); }, []);

  useEffect(() => { loadSettings(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="dark" />
      </AuthGate>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}
