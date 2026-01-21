// API Configuration for External Backend Server
// Update this URL to point to your external backend server
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' // Change this to your external backend URL
  : 'https://your-external-backend-url.com'; // Change this to your production backend URL

// Example: If your external backend is at https://api.example.com
// export const API_BASE_URL = 'https://api.example.com';
