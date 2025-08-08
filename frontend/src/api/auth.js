import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Login failed. Try again.';
  }
};

export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/register`, { username, email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed.';
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};

