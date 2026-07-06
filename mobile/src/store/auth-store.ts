import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profiles, UserRole } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profiles | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  needsSetup: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profiles) => void;
  checkRoleSetup: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  isAuthenticated: false,
  needsSetup: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profile) {
        const needsSetup = await checkRoleRecord(profile);
        set({
          session, user: session.user, profile,
          isAuthenticated: true, isLoading: false, isInitialized: true,
          needsSetup,
        });
        return;
      }
    }
    set({ isLoading: false, isInitialized: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          const needsSetup = await checkRoleRecord(profile);
          set({ session, user: session.user, profile, isAuthenticated: true, needsSetup });
        }
      } else {
        set({ session: null, user: null, profile: null, isAuthenticated: false, needsSetup: false });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!profile) {
        await supabase.auth.signOut();
        return { error: 'No profile found. Please sign up first.' };
      }
    }

    return {};
  },

  signUp: async (email: string, password: string, fullName: string, role: UserRole, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Failed to create account' };

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      role,
      full_name: fullName,
      phone: phone ?? null,
    });
    if (profileError) return { error: profileError.message };

    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isAuthenticated: false, needsSetup: false });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profile) {
      const needsSetup = await checkRoleRecord(profile);
      set({ profile, needsSetup });
    }
  },

  setProfile: (profile: Profiles) => set({ profile }),

  checkRoleSetup: async () => {
    const { profile } = get();
    if (!profile) return true;
    return checkRoleRecord(profile);
  },
}));

async function checkRoleRecord(profile: Profiles): Promise<boolean> {
  if (profile.role === 'admin') return false;

  const table = profile.role === 'store' ? 'stores' : profile.role === 'driver' ? 'drivers' : 'customers';
  const filterColumn = profile.role === 'store' ? 'owner_id' : 'profile_id';
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(filterColumn, profile.id);

  return count === 0;
}
