import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ default_filters: [], custom_filters: [] });

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          await loadFilters();
        } catch (error) {
          console.error('Failed to load user:', error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const loadFilters = async () => {
    try {
      const response = await axios.get(`${API}/filters`);
      setFilters(response.data);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    await loadFilters();
    
    return userData;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    await loadFilters();
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setFilters({ default_filters: [], custom_filters: [] });
  };

  const updateUser = async (data) => {
    const response = await axios.put(`${API}/auth/me`, data);
    setUser(response.data);
    return response.data;
  };

  const addCustomFilter = async (name, color) => {
    const response = await axios.post(`${API}/filters`, { name, color });
    await loadFilters();
    return response.data;
  };

  const deleteCustomFilter = async (filterId) => {
    await axios.delete(`${API}/filters/${filterId}`);
    await loadFilters();
  };

  const getAllFilters = () => {
    return [...filters.default_filters, ...filters.custom_filters];
  };

  const value = {
    user,
    token,
    loading,
    filters,
    login,
    register,
    logout,
    updateUser,
    addCustomFilter,
    deleteCustomFilter,
    getAllFilters,
    loadFilters,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
