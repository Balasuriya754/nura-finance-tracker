import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData);
    localStorage.setItem('token', response.data.access_token);
    setUser(response.data.user);
  };

  const adminLogin = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/admin-login', formData);
    localStorage.setItem('token', response.data.access_token);
    setUser(response.data.user);
  };

  const register = async (name, email, password, phone, otp) => {
    const response = await api.post('/auth/register', { name, email, password, phone, otp });
    return response.data;
  };

  const sendOtp = async (email) => {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, register, sendOtp, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
