import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true, // Set to true if using session/cookie auth; false for JWT only
  headers: {
    'Content-Type': 'application/json',
  },
});

// Example: Add interceptors for auth tokens if needed
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('access_token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

export default axiosInstance; 