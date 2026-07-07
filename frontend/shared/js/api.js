// URL de base de l'API
const API_URL = 'http://localhost:5000/api';

// ─── Fonction centrale pour tous les appels API ───
const api = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('token');

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erreur serveur');
  }

  return data;
};