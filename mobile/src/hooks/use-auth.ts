import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/auth-store';

export function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, needsSetup } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetup = segments[0] === '(setup)';
    const role = profile?.role;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated && role) {
      if (needsSetup && !inSetup) {
        router.replace('/(setup)');
        return;
      }
      if (inAuthGroup || (inSetup && !needsSetup)) {
        const target = roleMap[role] ?? '/(app)/(customer)';
        router.replace(target);
        return;
      }
    }
  }, [isAuthenticated, isLoading, segments, profile, needsSetup]);
}

const roleMap: Record<string, string> = {
  store: '/(app)/(store)',
  driver: '/(app)/(driver)',
  customer: '/(app)/(customer)',
  admin: '/(app)/(store)',
};
