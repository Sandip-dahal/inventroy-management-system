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
      validateTokenAndFetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // New function to validate token before fetching user
  const validateTokenAndFetchUser = async () => {
    try {
      const response = await authAPI.getMe();
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Invalid or expired token:', error);
      // Clear invalid token and all related data
      localStorage.removeItem('token');
      localStorage.removeItem('shopSettings');
      localStorage.removeItem('heldBills');
      setCurrentUser(null);
      
      // Redirect to login if not already there
      const publicPaths = ['/login', '/signup', '/forgotpassword'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('shopSettings');
      localStorage.removeItem('heldBills');
      setCurrentUser(null);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.token);
      setCurrentUser(response.data.user);
      console.log('Logged in user:', response.data.user);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authAPI.signup(userData);
      localStorage.setItem('token', response.token);
      setCurrentUser(response.data.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // FIXED logout function - clears everything and redirects
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('shopSettings');
    localStorage.removeItem('heldBills');
    setCurrentUser(null);
    // Redirect to login page
    window.location.href = '/login';
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