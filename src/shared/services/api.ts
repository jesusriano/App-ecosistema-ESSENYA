// Shared ESSENYA API Services for AI Concierge, Matching and Post-Care
import { auth } from '../../lib/firebase';


async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Could not retrieve Firebase ID token:', err);
  }
  return headers;
}

export async function fetchAiConciergeRecommendation(data: {
  userQuery?: string;
  userPreferences?: Record<string, any>;
  muscleTension?: string;
  occasion?: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/concierge', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function fetchTherapistMatch(data: {
  customerLocation?: string;
  selectedService?: string;
  duration?: number;
  genderPreference?: string;
  therapists?: any[];
}) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/match-therapist', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function fetchPostCareProtocol(data: {
  ritualName: string;
  therapistNotes?: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/post-care', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  return response.json();
}

