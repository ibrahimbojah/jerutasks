// Base URL of the PHP REST API. Set VITE_API_URL in a .env file (see .env.example).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost/jerutasks/backend').replace(/\/$/, '');
