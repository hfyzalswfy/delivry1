import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/auth-store';

export function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, needsSetup } = useAuthStore();

  useEffect(() => {
    console.log('AUTH_FLOW: USE_AUTH_GUARD', { isAuthenticated, isLoading, segment: segments[0], role: profile?.role, needsSetup });
    if (isLoading) { console.log('AUTH_FLOW: GUARD_LOADING_SKIP'); return; }

    const inAuthGroup = segments[0] === '(auth)';
    const inSetup = segments[0] === '(setup)';
    const role = profile?.role;

    if (!isAuthenticated && !inAuthGroup) {
      console.log('AUTH_FLOW: GUARD_REDIRECTING_TO_LOGIN');
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated && role) {
      if (needsSetup && !inSetup) {
        console.log('AUTH_FLOW: GUARD_REDIRECTING_TO_SETUP');
        router.replace('/(setup)');
        return;
      }
      if (inAuthGroup || (inSetup && !needsSetup)) {
        const target = roleMap[role] ?? '/(app)/(customer)';
        console.log('AUTH_FLOW: GUARD_REDIRECTING_TO_ROLE', { target, role });
        router.replace(target);
        return;
      }
    }
    console.log('AUTH_FLOW: GUARD_NO_ACTION');
  }, [isAuthenticated, isLoading, segments, profile, needsSetup]);
}

const roleMap: Record<string, string> = {
  store: '/(app)/(store)',
  driver: '/(app)/(driver)',
  customer: '/(app)/(customer)',
  admin: '/(app)/(store)',
};
