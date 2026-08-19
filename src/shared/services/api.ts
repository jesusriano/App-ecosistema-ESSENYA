// Shared ESSENYA API Services for AI Concierge, Matching and Post-Care

export async function fetchAiConciergeRecommendation(data: {
  userQuery?: string;
  userPreferences?: Record<string, any>;
  muscleTension?: string;
  occasion?: string;
}) {
  const response = await fetch('/api/gemini/concierge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function fetchTherapistMatch(data: {
  customerLocation?: string;
  selectedService?: string;
  duration?: number;
  genderPreference?: string;
  therapists?: any[];
}) {
  const response = await fetch('/api/gemini/match-therapist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function fetchPostCareProtocol(data: {
  ritualName: string;
  therapistNotes?: string;
}) {
  const response = await fetch('/api/gemini/post-care', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
