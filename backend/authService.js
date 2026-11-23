const API_BASE = 'http://localhost:5000/api';

export const registerUser = async (data) => {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return { ...result, status: response.status };
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result;
};

export const logoutUser = async () => {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include' // If using cookies
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear client-side session
    sessionStorage.removeItem('authSession');
    localStorage.removeItem('rememberMe');
  }
};

// SECURITY: Check if user is authenticated
export const isAuthenticated = () => {
  const session = sessionStorage.getItem('authSession');
  if (!session) return false;
  
  try {
    const parsed = JSON.parse(session);
    return parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
};

// SECURITY: Get current user from session
export const getCurrentUser = () => {
  const session = sessionStorage.getItem('authSession');
  if (!session) return null;
  
  try {
    const parsed = JSON.parse(session);
    if (parsed.expiresAt > Date.now()) {
      return parsed.user;
    }
    return null;
  } catch {
    return null;
  }
};