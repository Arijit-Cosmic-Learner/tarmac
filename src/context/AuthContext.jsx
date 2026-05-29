import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { syncGuestAnalytics, trackEvent } from '../lib/analytics';

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

// Local storage key for extended user details (phone, company, role, linkedin)
const getExtendedDetailsKey = (userId) => `tarmac_extended_${userId}`;

const loadExtendedDetails = (userId) => {
  try {
    const stored = localStorage.getItem(getExtendedDetailsKey(userId));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveExtendedDetails = (userId, details) => {
  try {
    localStorage.setItem(getExtendedDetailsKey(userId), JSON.stringify(details));
  } catch {
    // ignore storage errors
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(GUEST_USER);
  const [profile, setProfile] = useState(GUEST_PROFILE);
  const [extendedDetails, setExtendedDetails] = useState({});
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
        // Profile does not exist, create it
        const fullName = userObj.user_metadata?.full_name || userObj.email?.split('@')[0] || 'User';
        const newProfile = {
          id: userObj.id,
          full_name: fullName,
          is_paid: false,
          streak_count: 0,
          last_active_date: null,
          streak_history: {}
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

  const initUser = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(GUEST_USER);
      setProfile(GUEST_PROFILE);
      setExtendedDetails({});
      return;
    }
    setUser(sessionUser);
    // Load extended details from local storage immediately (instant)
    const stored = loadExtendedDetails(sessionUser.id);
    
    setExtendedDetails(stored);
    
    // Sync guest analytics to DB
    syncGuestAnalytics(sessionUser.id);

    // Fetch profile from DB (creates it if it doesn't exist)
    const userProfile = await fetchProfile(sessionUser);
    setProfile(userProfile);

    // Now that the profile is guaranteed to exist, sync the captured phone number if we have one
    const capturedPhone = localStorage.getItem('tarmac_captured_phone_number');
    if (capturedPhone && !stored.phone) {
      stored.phone = capturedPhone;
      saveExtendedDetails(sessionUser.id, stored);
      setExtendedDetails({ ...stored }); // trigger re-render with new phone
      
      try {
        let history = { dates: [], visits: 0, journey: [], payment_attempts: 0 };
        if (userProfile?.streak_history) {
          const rawHistory = typeof userProfile.streak_history === 'string' 
            ? JSON.parse(userProfile.streak_history) 
            : userProfile.streak_history;
            
          // If it's an array (from old initialization bug), convert it
          if (Array.isArray(rawHistory)) {
            history.dates = rawHistory;
          } else if (rawHistory && typeof rawHistory === 'object') {
            history = { ...history, ...rawHistory };
          }
        }
        
        history.phone = capturedPhone;
        await supabase.from('profiles').update({ streak_history: history }).eq('id', sessionUser.id);
        
        // Update local profile state
        setProfile(prev => prev ? { ...prev, streak_history: history } : prev);
      } catch (err) {
        console.error('Failed to sync captured phone:', err);
      }
    }
  }, []);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Set loading false IMMEDIATELY once we know whether user is logged in or not.
      // Do NOT await initUser — profile fetch happens in the background.
      initUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      // Immediately resolve loading so route guards never hang
      setLoading(false);
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        initUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        setUser(GUEST_USER);
        setProfile(GUEST_PROFILE);
        setExtendedDetails({});
      } else if (event === 'USER_UPDATED') {
        // Just update the raw user object, don't re-fetch profile
        if (session?.user) {
          setUser(session.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initUser]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    setUser(data.user);
    const stored = loadExtendedDetails(data.user.id);
    setExtendedDetails(stored);
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
    // Clear localStorage tokens
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
    
    // Optimistically clear React state
    setUser(GUEST_USER);
    setProfile(GUEST_PROFILE);
    setExtendedDetails({});

    // Fire and forget the network request
    supabase.auth.signOut().catch(err => console.error('Error during sign out:', err));
  };

  /**
   * BULLETPROOF updateUserMetadata:
   * - full_name is saved to the `profiles` table directly (always works)
   * - phone, company, role, linkedin are saved to localStorage immediately (always works)
   * - supabase.auth.updateUser is attempted in the background (fire-and-forget) for sync
   * - The UI never hangs waiting for auth.updateUser
   */
  const updateUserMetadata = async (metadata) => {
    const currentUserId = user?.id;
    if (!currentUserId || currentUserId === GUEST_USER.id) {
      throw new Error('You must be logged in to update your details.');
    }

    // 1. Read the existing streak_history from the DB and safely parse it
    //    regardless of what shape it is (null, {}, [], proper object, string)
    let updatedHistoryObj = {
      dates: [],
      visits: 0,
      journey: [],
      payment_attempts: 0,
      phone: '',
      company: '',
      role: '',
      linkedin: '',
    };

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('streak_history')
        .eq('id', currentUserId)
        .maybeSingle();

      if (existingProfile?.streak_history) {
        let raw = existingProfile.streak_history;

        // If stored as a JSON string, parse it first
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch { raw = null; }
        }

        // If it's a legacy array, convert it to an object with dates
        if (Array.isArray(raw)) {
          updatedHistoryObj.dates = raw;
        } else if (raw && typeof raw === 'object') {
          // Merge field-by-field so we never lose existing analytics data
          updatedHistoryObj = {
            ...updatedHistoryObj,      // defaults first
            ...raw,                    // existing DB values second
            // Always guarantee arrays / numbers are the right type
            dates: Array.isArray(raw.dates) ? raw.dates : [],
            journey: Array.isArray(raw.journey) ? raw.journey : [],
            visits: typeof raw.visits === 'number' ? raw.visits : 0,
            payment_attempts: typeof raw.payment_attempts === 'number' ? raw.payment_attempts : 0,
          };
        }
        // If raw is null / false / empty string → keep the safe defaults above
      }
    } catch (err) {
      console.warn('Failed to retrieve current streak_history — writing with safe defaults:', err);
    }

    // 2. Overlay only the metadata fields the user is changing
    //    Coerce everything to string to prevent downstream type-errors
    if (metadata.phone    !== undefined) updatedHistoryObj.phone    = String(metadata.phone    ?? '');
    if (metadata.company  !== undefined) updatedHistoryObj.company  = String(metadata.company  ?? '');
    if (metadata.role     !== undefined) updatedHistoryObj.role     = String(metadata.role     ?? '');
    if (metadata.linkedin !== undefined) updatedHistoryObj.linkedin = String(metadata.linkedin ?? '');

    // 3. Write back to the profiles table
    const profileUpdates = { streak_history: updatedHistoryObj };
    if (metadata.full_name !== undefined) {
      profileUpdates.full_name = String(metadata.full_name ?? '');
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', currentUserId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw new Error('Failed to update details in profile. Please try again.');
    }

    if (metadata.full_name !== undefined) {
      setProfile(prev => prev ? { ...prev, full_name: metadata.full_name } : prev);
    }

    // 4. Save extended details to localStorage immediately (local fallback cache)
    const extended = {
      phone:    String(metadata.phone    ?? ''),
      company:  String(metadata.company  ?? ''),
      role:     String(metadata.role     ?? ''),
      linkedin: String(metadata.linkedin ?? ''),
    };
    saveExtendedDetails(currentUserId, extended);
    setExtendedDetails(extended);

    // 5. Update in-memory user state so the UI reflects changes immediately
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        user_metadata: { ...(prev.user_metadata || {}), ...metadata },
      };
    });

    // 6. Track phone capture event
    if (metadata.phone) {
      trackEvent('phone_documented', { phone: metadata.phone }, currentUserId);
    }

    // 7. Fire-and-forget background sync to supabase.auth (non-critical)
    supabase.auth.updateUser({ data: metadata })
      .then(({ error }) => {
        if (error) console.warn('Background auth.updateUser failed (non-critical):', error.message);
        else       console.log('Background auth.updateUser succeeded.');
      })
      .catch(err => console.warn('Background auth.updateUser exception:', err));

    console.log('updateUserMetadata: saved successfully to profiles DB + localStorage');
    return { ...metadata };
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
      name: profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
      avatar: user.user_metadata?.avatar_url,
      // Extended details: localStorage takes priority, then auth metadata
      phone: extendedDetails.phone ?? user.user_metadata?.phone ?? '',
      company: extendedDetails.company ?? user.user_metadata?.company ?? '',
      role: extendedDetails.role ?? user.user_metadata?.role ?? '',
      linkedin: extendedDetails.linkedin ?? user.user_metadata?.linkedin ?? '',
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
