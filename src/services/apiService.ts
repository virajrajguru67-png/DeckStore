const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiService = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  },

  async get(endpoint: string) {
    return this.fetch(endpoint, { method: 'GET' });
  },

  async post(endpoint: string, body: any) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async upload(endpoint: string, formData: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }
};
