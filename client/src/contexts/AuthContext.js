import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('AuthProvider mounted, token exists:', !!token);
      
      if (token) {
        try {
          // Set the token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token is valid
          const response = await authAPI.getMe();
          console.log('User data fetched successfully:', response);
          
          if (response && response.data && response.data.user) {
            setCurrentUser(response.data.user);
          } else if (response && response.user) {
            setCurrentUser(response.user);
          } else {
            console.log('No user data in response, clearing token');
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log('AuthContext.login called with email:', email);
      
      const response = await authAPI.login(email, password);
      console.log('Login API response received:', response);
      
      // Check different response structures
      const token = response?.token || response?.data?.token;
      const user = response?.data?.user || response?.user;
      
      if (token) {
        // Save token to localStorage
        localStorage.setItem('token', token);
        console.log('Token saved to localStorage');
        
        // Set the token in axios default headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Authorization header set on axios instance');
        
        // Set user data
        if (user) {
          setCurrentUser(user);
        } else {
          // Try to fetch user data
          try {
            const userResponse = await authAPI.getMe();
            if (userResponse && userResponse.data && userResponse.data.user) {
              setCurrentUser(userResponse.data.user);
            } else if (userResponse && userResponse.user) {
              setCurrentUser(userResponse.user);
            }
          } catch (userError) {
            console.error('Could not fetch user after login:', userError);
            setCurrentUser({ id: 'temp', email: email });
          }
        }
        
        return { success: true };
      } else {
        console.error('Login failed - no token in response');
        throw new Error(response?.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.signup(userData);
      const token = response?.token || response?.data?.token;
      
      if (token) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const user = response?.data?.user || response?.user;
        if (user) {
          setCurrentUser(user);
        }
      }
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out, clearing token');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('shopSettings');
    localStorage.removeItem('heldBills');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};