const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('aulalive_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('aulalive_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('aulalive_token');
  localStorage.removeItem('aulalive_user');
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; [key: string]: any }> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición al servidor');
  }

  return data;
}

export const API = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: any) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),

  // Quizzes
  getTeacherQuizzes: () => apiRequest('/quizzes'),
  getQuizById: (id: string) => apiRequest(`/quizzes/${id}`),
  createQuiz: (quizData: any) =>
    apiRequest('/quizzes', { method: 'POST', body: JSON.stringify(quizData) }),
  updateQuiz: (id: string, quizData: any) =>
    apiRequest(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(quizData) }),
  deleteQuiz: (id: string) => apiRequest(`/quizzes/${id}`, { method: 'DELETE' }),
  duplicateQuiz: (id: string) => apiRequest(`/quizzes/${id}/duplicate`, { method: 'POST' }),

  // Sessions
  createSession: (quizId: string) =>
    apiRequest('/sessions', { method: 'POST', body: JSON.stringify({ quizId }) }),
  joinSession: (data: { pinCode: string; nickname: string; studentIdentifier?: string }) =>
    apiRequest('/sessions/join', { method: 'POST', body: JSON.stringify(data) }),
  getSessionState: (sessionId: string) => apiRequest(`/sessions/${sessionId}/state`),
  getQuestionLiveStats: (sessionId: string, questionId: string) =>
    apiRequest(`/sessions/${sessionId}/stats/${questionId}`),
  updateSessionStatus: (sessionId: string, statusData: any) =>
    apiRequest(`/sessions/${sessionId}/status`, { method: 'PATCH', body: JSON.stringify(statusData) }),

  // Admin
  getSystemStats: () => apiRequest('/admin/stats'),
  getAdminUsers: () => apiRequest('/admin/users'),
  toggleUserStatus: (userId: string) =>
    apiRequest(`/admin/users/${userId}/toggle-status`, { method: 'PATCH' }),
  getAuditLogs: () => apiRequest('/admin/audit-logs'),

  // Export URLs
  getExcelExportUrl: (sessionId: string) => `${API_BASE_URL}/reports/${sessionId}/excel`,
  getCSVExportUrl: (sessionId: string) => `${API_BASE_URL}/reports/${sessionId}/csv`,
  getPDFExportUrl: (sessionId: string) => `${API_BASE_URL}/reports/${sessionId}/pdf`,
};

