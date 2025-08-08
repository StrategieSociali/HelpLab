import React, { createContext, useState, useEffect } from 'react';
import { login as loginApi, logout as logoutApi } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ token }); // In un caso reale, potremmo verificare il token con il backend
    }
  }, []);

  const login = async (username, password) => {
    try {
      const data = await loginApi(username, password);
      localStorage.setItem('token', data.token);
      setUser({ token: data.token });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

