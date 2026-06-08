// utils/settings.js - Updated
// Default settings structure
const defaultSettings = {
  transactionSettings: {
    allowDelete: false,
    deleteRequiresPassword: true
  },
  inventoryOptions: {
    categories: {},
    sizes: [],
    colors: []
  },
  shopInfo: {
    name: 'My Shop',
    address: '',
    contactNumber: '',
    email: '',
    phone: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    instagram: ''
  },
  theme: 'light',
  vatEnabled: false,
  vatRate: 13,
  pricingMode: 'fixed',
  billingFolder: '/bills',
  qrCodeImage: null,
  qrCodeData: ''
};

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://progress-tracker-backend-s2u6.onrender.com/api';

// Utility functions for handling settings
export const getShopSettings = async () => {
  try {
    const localSettings = localStorage.getItem('shopSettings');
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        console.log('Using settings from localStorage');
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.warn('Failed to parse localStorage settings:', e);
      }
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, using default settings');
      return defaultSettings;
    }
    
    console.log('Attempting to fetch settings from API...');
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API fetch response status:', response.status);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.warn('API returned non-JSON response:', text.substring(0, 100));
      return defaultSettings;
    }
    
    if (response.ok) {
      const data = await response.json();
      console.log('Settings fetched from API successfully');
      
      // Ensure QR code is properly formatted
      const settings = data.data?.settings || {};
      if (settings.qrCodeImage && typeof settings.qrCodeImage === 'string') {
        // Ensure it's a proper data URL
        if (!settings.qrCodeImage.startsWith('data:image/')) {
          settings.qrCodeImage = `data:image/png;base64,${settings.qrCodeImage}`;
        }
      }
      
      return { ...defaultSettings, ...settings };
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch settings from API:', response.status, errorData);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return defaultSettings;
  }
};

export const saveShopSettings = async (settings) => {
  try {
    localStorage.setItem('shopSettings', JSON.stringify(settings));
    console.log('Settings saved to localStorage');
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No auth token found, skipping API save');
      return settings;
    }
    
    try {
      console.log('Attempting to save to API...');
      
      // Prepare settings for API - handle QR code properly
      const apiSettings = { ...settings };
      
      // If QR code is a data URL, convert it to base64 string for API
      if (apiSettings.qrCodeImage && apiSettings.qrCodeImage.startsWith('data:image/')) {
        apiSettings.qrCodeImage = apiSettings.qrCodeImage.split(',')[1];
      }
      
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiSettings)
      });
      
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Settings saved to API successfully');
        
        // Convert QR code back to data URL for frontend
        const savedSettings = data.data?.settings || settings;
        if (savedSettings.qrCodeImage && typeof savedSettings.qrCodeImage === 'string') {
          if (!savedSettings.qrCodeImage.startsWith('data:image/')) {
            savedSettings.qrCodeImage = `data:image/png;base64,${savedSettings.qrCodeImage}`;
          }
        }
        
        return savedSettings;
      } else {
        const errorText = await response.text();
        console.warn('Failed to save settings to API:', response.status, errorText);
        return settings;
      }
    } catch (apiError) {
      console.warn('API save failed:', apiError);
      return settings;
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const saveQRCode = async (qrCodeImage, qrCodeContent, qrCodeImageType = 'png') => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, QR code not saved to API');
      return {};
    }
    
    let imageData = qrCodeImage;
    if (qrCodeImage.startsWith('data:image')) {
      imageData = qrCodeImage.split(',')[1];
    }
    
    const response = await fetch(`${API_BASE_URL}/api/settings/qr-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        qrCodeImage: imageData,
        qrCodeImageType,
        qrCodeContent
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Convert QR code back to data URL for frontend
      const savedSettings = data.data?.settings || {};
      if (savedSettings.qrCodeImage && typeof savedSettings.qrCodeImage === 'string') {
        if (!savedSettings.qrCodeImage.startsWith('data:image/')) {
          savedSettings.qrCodeImage = `data:image/png;base64,${savedSettings.qrCodeImage}`;
        }
      }
      
      return savedSettings;
    } else {
      console.error('Failed to save QR code to API');
      throw new Error('Failed to save QR code');
    }
  } catch (error) {
    console.error('Error saving QR code:', error);
    throw error;
  }
};

// Generate QR code from shop info
export const generateQRCodeFromShopInfo = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, cannot generate QR code');
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/settings/generate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to generate QR code:', data.message);
      throw new Error(data.message || 'Failed to generate QR code');
    }
    
    // Convert QR code to data URL for frontend
    const savedSettings = data.data?.settings || {};
    if (savedSettings.qrCodeImage && typeof savedSettings.qrCodeImage === 'string') {
      if (!savedSettings.qrCodeImage.startsWith('data:image/')) {
        savedSettings.qrCodeImage = `data:image/png;base64,${savedSettings.qrCodeImage}`;
      }
    }
    
    return savedSettings;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Get QR code image URL
export const getQRCodeImageUrl = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  return `${API_BASE_URL}/api/settings/qr-code/image?t=${Date.now()}`;
};

// Helper function to ensure QR code is properly formatted
export const ensureQRCodeFormat = (settings) => {
  const formattedSettings = { ...settings };
  
  if (formattedSettings.qrCodeImage && typeof formattedSettings.qrCodeImage === 'string') {
    if (!formattedSettings.qrCodeImage.startsWith('data:image/')) {
      formattedSettings.qrCodeImage = `data:image/png;base64,${formattedSettings.qrCodeImage}`;
    }
  }
  
  return formattedSettings;
};