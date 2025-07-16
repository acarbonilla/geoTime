import axios from 'axios';

const getToken = () => localStorage.getItem('access_token');

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

// Add a request interceptor to include the token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance; 