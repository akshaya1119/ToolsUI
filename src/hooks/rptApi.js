/**
 * RPT API - Special axios instance for report generation API
 * 
 * Handles HTTPS/SSL certificate issues by:
 * - Using a proxy in development (vite dev server)
 * - Using direct HTTPS URL in production
 */

import axios from 'axios';

const isDevelopment = import.meta.env.DEV;

// In development, use the vite proxy to avoid SSL certificate issues
// In production, use the direct HTTPS URL
const getRptApiUrl = () => {
  if (isDevelopment) {
    // Use vite proxy path (avoids SSL certificate validation)
    return '/rpt-api';
  } else {
    // Production: use the configured URL
    return import.meta.env.VITE_RPT_API_URL || 'https://localhost:44346/api';
  }
};

// Create an Axios instance for RPT API
const RPT_API = axios.create({
  baseURL: getRptApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Timeout for long-running report generation
  timeout: 300000, // 5 minutes
});

// Add a request interceptor to attach the token to all requests
RPT_API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
RPT_API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific HTTP errors
      switch (error.response.status) {
        case 401:
          // Unauthorized: Clear token
          localStorage.removeItem('token');
          break;
        case 403:
          // Forbidden: Handle access denied
          console.error('RPT API Access denied');
          break;
        case 504:
          // Gateway Timeout
          console.error('RPT API Gateway Timeout - report generation may have timed out');
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default RPT_API;
