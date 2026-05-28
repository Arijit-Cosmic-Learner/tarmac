import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const GUEST_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'guest@tarmac.com',
  user_metadata: { full_name: 'Guest Candidate' },
  created_at: new Date().toISOString(),
};

const GUEST_PROFILE = {
  id: '00000000-0000-0000-0000-000000000000',
  full_name: 'Guest Candidate',
  is_paid: true,
  streak_count: 3,
  last_active_date: new Date().toISOString().split('T')[0],
  streak_history: []
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(GUEST_USER);
  const [profile, setProfile] = useState(GUEST_PROFILE);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userObj) => {
    if (!userObj) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data) {
        // Profile does not exist, let's create it!
        const fullName = userObj.user_metadata?.full_name || userObj.email?.split('@')[0] || 'User';
        const newProfile = {
          id: userObj.id,
          full_name: fullName,
          is_paid: false,
          streak_count: 0,
          last_active_date: null,
          streak_history: []
        };
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
          return null;
        }
        return insertedData;
      }
      return data;
    } catch (err) {
      console.error('Profile fetch error:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const userProfile = await fetchProfile(session.user);
        setProfile(userProfile);
      } else {
        setUser(GUEST_USER);
        setProfile(GUEST_PROFILE);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange: Auth event received:', event);
      if (session?.user) {
        setUser(session.user);
        // Only fetch/create profile on SIGNED_IN or INITIAL_SESSION
        // Avoid doing it on USER_UPDATED to prevent database call deadlock during updateUser
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          console.log('onAuthStateChange: Fetching user profile from DB...');
          const userProfile = await fetchProfile(session.user);
          setProfile(userProfile);
        }
      } else {
        setUser(GUEST_USER);
        setProfile(GUEST_PROFILE);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    setUser(data.user);
    const userProfile = await fetchProfile(data.user);
    setProfile(userProfile);
    
    return data.user;
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) throw error;
    return data;
  };

  const signup = async (email, name, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    // 1. Forcefully clear any stuck Supabase tokens from localStorage synchronously
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('localStorage clear error', e);
    }
    
    // 2. Optimistically clear the React state
    setUser(GUEST_USER);
    setProfile(GUEST_PROFILE);

    // 3. Fire and forget the network request
    supabase.auth.signOut().catch(err => console.error('Error during sign out:', err));
  };

  const updateUserMetadata = async (metadata) => {
    try {
      console.log('updateUserMetadata: updating user metadata with:', metadata);
      
      // Wrap the updateUser call with a 5-second timeout safety net
      const updatePromise = supabase.auth.updateUser({
        data: metadata
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Update request timed out. Please try again.")), 5000)
      );

      const { data, error } = await Promise.race([updatePromise, timeoutPromise]);
      
      if (error) {
        console.error('updateUserMetadata: auth.updateUser error:', error);
        throw error;
      }
      
      console.log('updateUserMetadata: auth.updateUser success:', data);

      // Sync display name change to profiles table in the database (non-blocking)
      if (metadata.full_name) {
        console.log('updateUserMetadata: syncing full_name to profiles table (non-blocking):', metadata.full_name);
        supabase
          .from('profiles')
          .update({ full_name: metadata.full_name })
          .eq('id', data.user.id)
          .then(({ error: profileError }) => {
            if (profileError) {
              console.error('updateUserMetadata: profile sync error:', profileError);
            } else {
              console.log('updateUserMetadata: profile sync success');
              setProfile(prev => prev ? { ...prev, full_name: metadata.full_name } : prev);
            }
          })
          .catch(err => {
            console.error('updateUserMetadata: profile sync exception:', err);
          });
      }

      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('updateUserMetadata failed:', err);
      throw err;
    }
  };

  const upgradeToPaid = async () => {
    if (!user) return;
    if (user.id === GUEST_USER.id) {
      setProfile(p => p ? { ...p, is_paid: true } : GUEST_PROFILE);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_paid: true })
      .eq('id', user.id);
    
    if (error) throw error;
    setProfile(p => p ? { ...p, is_paid: true } : null);
  };

  const isRealUser = user && user.id !== GUEST_USER.id;

  const value = {
    user: isRealUser ? {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || profile?.full_name || user.email.split('@')[0],
      avatar: user.user_metadata?.avatar_url,
      phone: user.user_metadata?.phone || '',
      company: user.user_metadata?.company || '',
      role: user.user_metadata?.role || '',
      linkedin: user.user_metadata?.linkedin || '',
      plan: profile?.is_paid ? 'paid' : 'free',
      joinedAt: user.created_at,
    } : null,
    loading,
    isPaid: !!profile?.is_paid,
    isAuthenticated: isRealUser,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateUserMetadata,
    upgradeToPaid,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
