import { auth as firebaseAuth } from '../firebase/client';

/**
 * Returns authorization headers containing the active user's Firebase ID token
 * or their local demo identifier.
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (firebaseAuth && firebaseAuth.currentUser) {
    try {
      // Force refresh of the token to ensure it isn't expired
      const token = await firebaseAuth.currentUser.getIdToken(true);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.error('[API Helper] Error getting Firebase ID token:', e);
    }
  } else {
    // Fallback for role switching / local demo sessions
    const savedId = localStorage.getItem('ei_hub_active_user_id');
    if (savedId) {
      headers['Authorization'] = `Bearer ${savedId}`;
    }
  }
  
  return headers;
};

/**
 * Makes an authenticated request to the Python backend
 */
export const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const headers = await getAuthHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  };
  
  const response = await fetch(url, mergedOptions);
  if (!response.ok) {
    const errorText = await response.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorText);
    } catch {
      parsedError = { detail: errorText };
    }
    throw new Error(parsedError.detail || `HTTP Error ${response.status}`);
  }
  
  return response.json();
};
