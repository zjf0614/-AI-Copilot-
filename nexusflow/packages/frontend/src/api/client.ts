const BASE = '/api/v1';

let token: string | null = localStorage.getItem('nf_token');

export function setToken(t: string | null) { token = t; if (t) localStorage.setItem('nf_token', t); else localStorage.removeItem('nf_token'); }
export function getToken() { return token; }

async function request(path: string, opts: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((opts.headers as any) || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `HTTP ${res.status}`); }
  return res.json();
}

// Auth
export const auth = {
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

// Health
export const health = {
  all: async () => {
    const svcs = [3000,3001,3002,3003,3004,3005,3006,3007,3008,3009];
    const results = await Promise.allSettled(svcs.map(p => fetch(`http://localhost:${p}/health`).then(r => r.json()).catch(() => null)));
    return svcs.map((p, i) => ({ port: p, ...(results[i]!.status === 'fulfilled' ? results[i]!.value : { status: 'offline' }) }));
  }
};

export default { auth, health, setToken, getToken };
