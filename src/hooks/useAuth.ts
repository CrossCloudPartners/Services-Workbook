import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/index';
import { getOrCreateUserProfile, updateLastLogin } from '../lib/tenancy';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user).then((profile) => {
          setState({ user: session.user, session, profile, loading: false });
        });
      } else {
        setState({ user: null, session: null, profile: null, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          if (event === 'SIGNED_IN') {
            await updateLastLogin(session.user.id);
          }
          const profile = await loadProfile(session.user);
          setState({ user: session.user, session, profile, loading: false });
        } else {
          setState({ user: null, session: null, profile: null, loading: false });
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(user: User): Promise<UserProfile | null> {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('uid', user.id)
        .maybeSingle();
      return data as UserProfile | null;
    } catch {
      return null;
    }
  }

  async function signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    companyName: string
  ) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message?.toLowerCase().includes('already registered') || (error as { code?: string }).code === 'user_already_exists') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      throw error;
    }
    if (!data.user) throw new Error('No user returned');

    const profile = await getOrCreateUserProfile(
      data.user.id,
      email,
      firstName,
      lastName,
      companyName
    );
    setState((s) => ({ ...s, profile }));
    return profile;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (!state.user) return;
    const profile = await loadProfile(state.user);
    setState((s) => ({ ...s, profile }));
  }

  return {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };
}
