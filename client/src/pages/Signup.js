import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { nepalLocations } from '../utils/nepalLocations';
import '../styles/Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeType: '',
    address: {
      province: '',
      district: '',
      municipality: '',
      wardNo: '',
      street: ''
    },
    panVatNumber: '',
    productKey: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset all form fields when component mounts
  useEffect(() => {
    resetForm();
  }, [location.key]); // Reset when navigation key changes (e.g., coming from login page)

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
      storeName: '',
      storeType: '',
      address: {
        province: '',
        district: '',
        municipality: '',
        wardNo: '',
        street: ''
      },
      panVatNumber: '',
      productKey: ''
    });
    setCurrentSection(0);
    setError('');
    setPasswordStrength({ score: 0, feedback: '' });
    setPasswordMatch(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let score = 0;
    let feedback = [];
    
    if (!password) {
      return { score: 0, feedback: '' };
    }
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Lowercase letters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Uppercase letters');
    
    // Number check
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Numbers');
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Special characters');
    
    return {
      score,
      feedback: feedback.length > 0 ? `Missing: ${feedback.join(', ')}` : 'Strong password!'
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Check password strength when password changes
      if (name === 'password') {
        setPasswordStrength(checkPasswordStrength(value));
      }
      
      // Check if passwords match when either password or confirm password changes
      if (name === 'password' || name === 'confirmPassword') {
        const password = name === 'password' ? value : formData.password;
        const confirm = name === 'confirmPassword' ? value : formData.confirmPassword;
        setPasswordMatch(!password || !confirm || password === confirm);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setLoading(true);
      await signup(formData);
      resetForm(); // Reset form after successful signup
      navigate('/retaildashboard');
    } catch (err) {
      setError('Failed to create account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDistricts = () => {
    if (!formData.address.province) return [];
    return Object.keys(nepalLocations.provinces[formData.address.province]?.districts || {});
  };

  const getMunicipalities = () => {
    if (!formData.address.province || !formData.address.district) return [];
    return nepalLocations.provinces[formData.address.province]?.districts[formData.address.district] || [];
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const sections = [
    {
      title: "Personal Information",
      fields: (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName} 
                onChange={handleChange} 
                required 
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <div className="phone-input">
                <span className="country-code">+977</span>
                <input 
                  type="tel" 
                  name="phoneNumber"
                  value={formData.phoneNumber} 
                  onChange={handleChange}
                  placeholder="98XXXXXXX"
                  pattern="[0-9]{10}"
                  required 
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleChange} 
                required 
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>PAN/VAT Number (Optional)</label>
              <input 
                type="text" 
                name="panVatNumber"
                value={formData.panVatNumber} 
                onChange={handleChange} 
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  autoComplete="off"
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg className="eye-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg className="eye-icon eye-slash" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-meter">
                    <div 
                      className={`strength-bar ${passwordStrength.score >= 1 ? 'active' : ''}`}
                      data-score="1"
                    ></div>
                    <div 
                      className={`strength-bar ${passwordStrength.score >= 2 ? 'active' : ''}`}
                      data-score="2"
                    ></div>
                    <div 
                      className={`strength-bar ${passwordStrength.score >= 3 ? 'active' : ''}`}
                      data-score="3"
                    ></div>
                    <div 
                      className={`strength-bar ${passwordStrength.score >= 4 ? 'active' : ''}`}
                      data-score="4"
                    ></div>
                    <div 
                      className={`strength-bar ${passwordStrength.score >= 5 ? 'active' : ''}`}
                      data-score="5"
                    ></div>
                  </div>
                  <div className={`strength-feedback ${passwordStrength.score >= 3 ? 'strong' : 'weak'}`}>
                    {passwordStrength.feedback}
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="password-input-wrapper">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  name="confirmPassword"
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  autoComplete="off"
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={toggleConfirmPasswordVisibility}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? (
                    <svg className="eye-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg className="eye-icon eye-slash" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className={`password-match ${passwordMatch ? 'match' : 'no-match'}`}>
                  {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>
          </div>
        </>
      )
    },
    {
      title: "Store Information",
      fields: (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Store Name *</label>
              <input 
                type="text" 
                name="storeName"
                value={formData.storeName} 
                onChange={handleChange} 
                required 
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Store Type *</label>
              <select name="storeType" value={formData.storeType} onChange={handleChange} required>
                <option value="">Select Store Type</option>
                <option value="Clothing">Clothing</option>
                <option value="Footwear">Footwear</option>
                <option value="General">General Store</option>
                <option value="Electronics">Electronics</option>
                <option value="Grocery">Grocery</option>
                <option value="Hardware">Hardware</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Address Information",
      fields: (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Province *</label>
              <select name="address.province" value={formData.address.province} onChange={handleChange} required>
                <option value="">Select Province</option>
                {Object.entries(nepalLocations.provinces).map(([id, province]) => (
                  <option key={id} value={id}>{province.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>District *</label>
              <select name="address.district" value={formData.address.district} onChange={handleChange} required disabled={!formData.address.province}>
                <option value="">Select District</option>
                {getDistricts().map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Municipality *</label>
              <select name="address.municipality" value={formData.address.municipality} onChange={handleChange} required disabled={!formData.address.district}>
                <option value="">Select Municipality</option>
                {getMunicipalities().map(municipality => (
                  <option key={municipality} value={municipality}>{municipality}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ward No. *</label>
              <input 
                type="number" 
                name="address.wardNo"
                value={formData.address.wardNo} 
                onChange={handleChange}
                min="1"
                max="35"
                required 
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Street/Tole *</label>
            <input 
              type="text" 
              name="address.street"
              value={formData.address.street} 
              onChange={handleChange} 
              required 
              autoComplete="off"
            />
          </div>
        </>
      )
    },
    {
      title: "Product Key",
      fields: (
        <div className="form-group">
          <label>Product Key *</label>
          <input 
            type="text" 
            name="productKey"
            value={formData.productKey} 
            onChange={handleChange} 
            placeholder="Enter your product key"
            required 
            autoComplete="off"
          />
          <small>You need a valid product key to create an account</small>
        </div>
      )
    }
  ];

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-header">
          <h1>Create Your Store Account</h1>
          <p>Join thousands of shopkeepers using our POS system</p>
        </div>
        
        <div className="progress-bar">
          <div className="progress-track">
            {sections.map((_, index) => (
              <div 
                key={index} 
                className={`progress-step ${index <= currentSection ? 'active' : ''} ${index < currentSection ? 'completed' : ''}`}
              >
                <div className="step-number">{index + 1}</div>
                {index < sections.length - 1 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-section active">
            <h3>{sections[currentSection].title}</h3>
            {sections[currentSection].fields}
          </div>

          <div className="form-navigation">
            {currentSection > 0 && (
              <button type="button" onClick={prevSection} className="btn-secondary">
                Previous
              </button>
            )}
            
            {currentSection < sections.length - 1 ? (
              <button type="button" onClick={nextSection} className="btn-primary">
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>

        <div className="login-redirect">
          Already have an account? <a href="/login">Log-in</a>
        </div>
      </div>
    </div>
  );
};

export default Signup;