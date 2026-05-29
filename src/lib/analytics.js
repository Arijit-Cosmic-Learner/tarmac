import { supabase } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'tarmac_guest_analytics';

// Safely retrieve guest actions from localStorage
const getGuestAnalytics = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { visits: 0, journey: [], payment_attempts: 0 };
  } catch {
    return { visits: 0, journey: [], payment_attempts: 0 };
  }
};

// Save guest actions to localStorage
const saveGuestAnalytics = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save guest analytics to local storage:', e);
  }
};

// Format a journey entry
const makeJourneyEntry = (type, details) => ({
  type,
  time: new Date().toISOString(),
  ...details
});

/**
 * Clean/limit the journey log to prevent DB column size overflow
 */
const limitJourney = (journey = []) => {
  const maxEvents = 60;
  if (journey.length <= maxEvents) return journey;
  return journey.slice(-maxEvents);
};

/**
 * Automated tracking functions
 */
export const trackPageView = async (pathname, userId) => {
  if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
    // Guest tracking
    const data = getGuestAnalytics();
    data.visits = (data.visits || 0) + 1;
    data.journey = limitJourney([
      ...(data.journey || []),
      makeJourneyEntry('page_view', { path: pathname })
    ]);
    saveGuestAnalytics(data);
    return;
  }

  // Authenticated user tracking
  try {
    // 1. Fetch current profile to merge/update
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('streak_history')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Error fetching profile for tracking:', fetchErr);
      return;
    }

    let parsed = { dates: [], visits: 0, journey: [], payment_attempts: 0 };
    if (profile?.streak_history) {
      const raw = typeof profile.streak_history === 'string'
        ? JSON.parse(profile.streak_history)
        : profile.streak_history;
      
      if (Array.isArray(raw)) {
        parsed.dates = raw;
      } else if (raw && typeof raw === 'object') {
        parsed = {
          dates: Array.isArray(raw.dates) ? raw.dates : [],
          visits: raw.visits || 0,
          journey: Array.isArray(raw.journey) ? raw.journey : [],
          payment_attempts: raw.payment_attempts || 0,
          ...raw
        };
      }
    }

    // 2. Append new event
    parsed.visits = (parsed.visits || 0) + 1;
    parsed.journey = limitJourney([
      ...(parsed.journey || []),
      makeJourneyEntry('page_view', { path: pathname })
    ]);

    // 3. Save back
    await supabase
      .from('profiles')
      .update({ streak_history: parsed })
      .eq('id', userId);
  } catch (err) {
    console.error('Failed to log page view:', err);
  }
};

export const trackEvent = async (eventName, eventData, userId) => {
  if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
    // Guest tracking
    const data = getGuestAnalytics();
    if (eventName === 'payment_attempt') {
      data.payment_attempts = (data.payment_attempts || 0) + 1;
    }
    data.journey = limitJourney([
      ...(data.journey || []),
      makeJourneyEntry('event', { name: eventName, data: eventData })
    ]);
    saveGuestAnalytics(data);
    return;
  }

  // Authenticated user tracking
  try {
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('streak_history')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr) return;

    let parsed = { dates: [], visits: 0, journey: [], payment_attempts: 0 };
    if (profile?.streak_history) {
      const raw = typeof profile.streak_history === 'string'
        ? JSON.parse(profile.streak_history)
        : profile.streak_history;
      
      if (Array.isArray(raw)) {
        parsed.dates = raw;
      } else if (raw && typeof raw === 'object') {
        parsed = {
          dates: Array.isArray(raw.dates) ? raw.dates : [],
          visits: raw.visits || 0,
          journey: Array.isArray(raw.journey) ? raw.journey : [],
          payment_attempts: raw.payment_attempts || 0,
          ...raw
        };
      }
    }

    // Update
    if (eventName === 'payment_attempt') {
      parsed.payment_attempts = (parsed.payment_attempts || 0) + 1;
    }
    parsed.journey = limitJourney([
      ...(parsed.journey || []),
      makeJourneyEntry('event', { name: eventName, data: eventData })
    ]);

    await supabase
      .from('profiles')
      .update({ streak_history: parsed })
      .eq('id', userId);
  } catch (err) {
    console.error('Failed to log event:', err);
  }
};

/**
 * Merge local guest journey to user profile upon logging in/signing up
 */
export const syncGuestAnalytics = async (userId) => {
  if (!userId || userId === '00000000-0000-0000-0000-000000000000') return;
  const guestData = getGuestAnalytics();
  
  // If no guest interactions tracked, skip
  if (!guestData.visits && guestData.journey.length === 0) return;

  try {
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('streak_history')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr) return;

    let parsed = { dates: [], visits: 0, journey: [], payment_attempts: 0 };
    if (profile?.streak_history) {
      const raw = typeof profile.streak_history === 'string'
        ? JSON.parse(profile.streak_history)
        : profile.streak_history;
      
      if (Array.isArray(raw)) {
        parsed.dates = raw;
      } else if (raw && typeof raw === 'object') {
        parsed = {
          dates: Array.isArray(raw.dates) ? raw.dates : [],
          visits: raw.visits || 0,
          journey: Array.isArray(raw.journey) ? raw.journey : [],
          payment_attempts: raw.payment_attempts || 0,
          ...raw
        };
      }
    }

    // Merge guest data
    parsed.visits = (parsed.visits || 0) + (guestData.visits || 0);
    parsed.payment_attempts = (parsed.payment_attempts || 0) + (guestData.payment_attempts || 0);
    parsed.journey = limitJourney([
      ...(parsed.journey || []),
      ...guestData.journey.map(e => ({ ...e, merged_from_guest: true }))
    ]);

    await supabase
      .from('profiles')
      .update({ streak_history: parsed })
      .eq('id', userId);

    // Clear guest cache
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to sync guest analytics:', err);
  }
};
