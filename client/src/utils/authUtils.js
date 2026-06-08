// utils/authUtils.js - Client-side password verification utility function
const verifyPassword = async (password) => {
  try {
    console.log('Verifying password...');
    
    // Get token from localStorage or wherever it's stored
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found');
      return false;
    }
    
    // Make API call to verify password
    const response = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });
    
    const result = await response.json();
    console.log('Password verification result:', result);
    
    // Check the response structure
    if (result.status === 'success' && result.isValid) {
      console.log('Password is valid');
      return true;
    }
    
    console.log('Password is invalid');
    return false;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

module.exports = { verifyPassword };