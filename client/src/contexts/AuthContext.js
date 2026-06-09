import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app load
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response && response.data && response.data.user) {
        setCurrentUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Only clear token if it's a 401 authentication error
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('shopSettings');
        localStorage.removeItem('heldBills');
        setCurrentUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      if (response && response.token) {
        localStorage.setItem('token', response.token);
        setCurrentUser(response.data.user);
        console.log('Logged in user:', response.data.user);
        return response;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authAPI.signup(userData);
      if (response && response.token) {
        localStorage.setItem('token', response.token);
        setCurrentUser(response.data.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('shopSettings');
    localStorage.removeItem('heldBills');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    signup,
    logout,
    fetchCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};