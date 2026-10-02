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

export async function generateOrEditServiceImage(data: {
  prompt: string;
  base64Image?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1';
}): Promise<{ success: boolean; imageUrl?: string; error?: string; isQuota?: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/gemini/generate-or-edit-image', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({ success: false, error: 'Error de conexión con el servidor' }));
  if (!response.ok || !resData.success) {
    return {
      success: false,
      error: resData.error || `HTTP error ${response.status}`,
      isQuota: resData.isQuota || response.status === 402,
    };
  }
  return resData;
}

