import React, { useState } from 'react';

const SupplierForm = ({ supplier, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    companyName: supplier?.companyName || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    province: supplier?.province || '',
    district: supplier?.district || '',
    city: supplier?.city || '',
    streetAddress: supplier?.streetAddress || '',
    panVatNumber: supplier?.panVatNumber || '',
    bankAccountDetails: supplier?.bankAccountDetails || {
      bankName: '',
      accountNumber: '',
      accountHolder: ''
    },
    notes: supplier?.notes || ''
  });

  const [errors, setErrors] = useState({});

  // Nepal districts by province
  const nepaliDistrictsByProvince = {
    'Province 1': [
      'Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 
      'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum', 'Udayapur'
    ],
    'Madhesh': [
      'Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha'
    ],
    'Bagmati': [
      'Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 
      'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'
    ],
    'Gandaki': [
      'Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 
      'Nawalpur', 'Parbat', 'Syangja', 'Tanahun'
    ],
    'Lumbini': [
      'Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Gulmi', 'Kapilvastu', 'Parasi', 
      'Palpa', 'Pyuthan', 'Rolpa', 'Rukum East', 'Rupandehi'
    ],
    'Karnali': [
      'Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 
      'Rukum West', 'Salyan', 'Surkhet'
    ],
    'Sudurpashchim': [
      'Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 
      'Doti', 'Kailali', 'Kanchanpur'
    ]
  };

  const nepaliProvinces = Object.keys(nepaliDistrictsByProvince);
  const [availableDistricts, setAvailableDistricts] = useState(
    formData.province ? nepaliDistrictsByProvince[formData.province] || [] : []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If province changes, update available districts
    if (name === 'province') {
      setAvailableDistricts(nepaliDistrictsByProvince[value] || []);
      // Reset district when province changes
      setFormData(prev => ({
        ...prev,
        district: ''
      }));
    }
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBankDetailChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      bankAccountDetails: {
        ...prev.bankAccountDetails,
        [name]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Supplier name is required';
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.province) newErrors.province = 'Province is required';
    if (!formData.district) newErrors.district = 'District is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    
    // Basic phone validation for Nepal
    const phoneRegex = /^[9][6-8][0-9]{8}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid Nepali phone number (98XXXXXXXX)';
    }
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="form-container">
      <h2>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Supplier Name *</label>
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter supplier name"
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>
        
        <div className="form-group">
          <label>Company Name *</label>
          <input 
            type="text" 
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className={errors.companyName ? 'error' : ''}
            placeholder="Enter company name"
          />
          {errors.companyName && <span className="error-text">{errors.companyName}</span>}
        </div>
        
        <div className="form-group">
          <label>Contact Person *</label>
          <input 
            type="text" 
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            className={errors.contactPerson ? 'error' : ''}
            placeholder="Enter contact person name"
          />
          {errors.contactPerson && <span className="error-text">{errors.contactPerson}</span>}
        </div>
        
        <div className="form-group">
          <label>Phone Number *</label>
          <input 
            type="text" 
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="98XXXXXXXX"
            maxLength="10"
          />
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="supplier@example.com"
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label>Province *</label>
          <select 
            name="province"
            value={formData.province}
            onChange={handleChange}
            className={errors.province ? 'error' : ''}
          >
            <option value="">Select Province</option>
            {nepaliProvinces.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
          {errors.province && <span className="error-text">{errors.province}</span>}
        </div>
        
        <div className="form-group">
          <label>District *</label>
          <select 
            name="district"
            value={formData.district}
            onChange={handleChange}
            className={errors.district ? 'error' : ''}
            disabled={!formData.province}
          >
            <option value="">Select District</option>
            {availableDistricts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
          {errors.district && <span className="error-text">{errors.district}</span>}
        </div>
        
        <div className="form-group">
          <label>City/Municipality *</label>
          <input 
            type="text" 
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={errors.city ? 'error' : ''}
            placeholder="Enter city or municipality"
          />
          {errors.city && <span className="error-text">{errors.city}</span>}
        </div>
        
        <div className="form-group">
          <label>Street Address</label>
          <input 
            type="text" 
            name="streetAddress"
            value={formData.streetAddress}
            onChange={handleChange}
            placeholder="Enter street address"
          />
        </div>
        
        <div className="form-group">
          <label>PAN/VAT Number</label>
          <input 
            type="text" 
            name="panVatNumber"
            value={formData.panVatNumber}
            onChange={handleChange}
            placeholder="Enter PAN/VAT number"
          />
        </div>
        
        <div className="form-section">
          <h3>Bank Account Details (Optional)</h3>
          <div className="form-group">
            <label>Bank Name</label>
            <input 
              type="text" 
              name="bankName"
              value={formData.bankAccountDetails.bankName}
              onChange={handleBankDetailChange}
              placeholder="Enter bank name"
            />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input 
              type="text" 
              name="accountNumber"
              value={formData.bankAccountDetails.accountNumber}
              onChange={handleBankDetailChange}
              placeholder="Enter account number"
            />
          </div>
          <div className="form-group">
            <label>Account Holder</label>
            <input 
              type="text" 
              name="accountHolder"
              value={formData.bankAccountDetails.accountHolder}
              onChange={handleBankDetailChange}
              placeholder="Enter account holder name"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Notes</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="Additional notes (optional)"
          />
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;