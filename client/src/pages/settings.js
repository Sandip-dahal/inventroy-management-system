import React, { useState, useEffect } from 'react';
import { getShopSettings, saveShopSettings, saveQRCode, generateQRCodeFromShopInfo, getQRCodeImageUrl } from '../utils/settings';
import '../styles/Settings.css';

// Default inventory options with hierarchical subcategories
const defaultInventoryOptions = {
  categories: {
    "Men's Clothing": ["T-Shirts", "Shirts", "Pants", "Jackets", "Traditional"],
    "Women's Clothing": ["Dresses", "Blouses", "Skirts", "Sarees", "Kurtas"],
    "Kids' Clothing": ["Onesies", "Kids T-Shirts", "Kids Pants", "Kids Dresses"],
    "Accessories": ["Bags", "Hats", "Belts", "Watches", "Jewelry"],
    "Footwear": ["Shoes", "Sandals", "Boots", "Slippers"]
  },
  sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"],
  colors: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Brown", "Gray", "Multi"]
};

const Settings = () => {
  // State for all settings
  const [settings, setSettings] = useState({
    transactionSettings: {
      allowDelete: false,
      deleteRequiresPassword: true
    },
    inventorySettings: {
      allowEditDelete: true // NEW: Add this setting for inventory edit/delete
    },
    inventoryOptions: defaultInventoryOptions,
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
    billingFolder: '/bills'
  });
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [previousShopInfo, setPreviousShopInfo] = useState(null);

  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState({ category: '', name: '' });
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');

  // Generate QR code content using proper vCard format for iOS and Android
  const generateQRContent = () => {
    const { shopInfo } = settings;
    
    // Create proper vCard format that works on both iOS and Android
    let content = 'BEGIN:VCARD\r\n';
    content += 'VERSION:3.0\r\n';
    content += `FN:${shopInfo.name || 'My Shop'}\r\n`;
    content += `ORG:${shopInfo.name || 'My Shop'}\r\n`;
    
    if (shopInfo.contactNumber) content += `TEL;TYPE=CELL,VOICE:${formatPhoneNumber(shopInfo.contactNumber)}\r\n`;
    if (shopInfo.phone) content += `TEL;TYPE=WORK,VOICE:${formatPhoneNumber(shopInfo.phone)}\r\n`;
    if (shopInfo.email) content += `EMAIL:${shopInfo.email}\r\n`;
    if (shopInfo.address) content += `ADR;TYPE=WORK:;;${shopInfo.address};;;\r\n`;
    
    // Social media links - iOS prefers these in the NOTE field
    let socialMediaNote = '';
    if (shopInfo.facebook) socialMediaNote += `Facebook: ${shopInfo.facebook}\n`;
    if (shopInfo.youtube) socialMediaNote += `YouTube: ${shopInfo.youtube}\n`;
    if (shopInfo.tiktok) socialMediaNote += `TikTok: https://tiktok.com/${shopInfo.tiktok.replace('@', '')}\n`;
    if (shopInfo.instagram) socialMediaNote += `Instagram: ${shopInfo.instagram}\n`;
    
    if (socialMediaNote) content += `NOTE:${socialMediaNote}\r\n`;
    
    // Add URL field (iOS recognizes this)
    if (shopInfo.facebook) content += `URL:${shopInfo.facebook}\r\n`;
    
    content += 'END:VCARD';
    
    return content;
  };

  // Format phone number for vCard
  const formatPhoneNumber = (phone) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  // Add this function to handle QR code download
  const downloadQRCode = () => {
    if (!qrCodeImage) return;
    
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = `${settings.shopInfo.name || 'shop'}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if shop info has changed
  const hasShopInfoChanged = () => {
    if (!previousShopInfo) return true;
    
    const currentShopInfoString = JSON.stringify(settings.shopInfo);
    const previousShopInfoString = JSON.stringify(previousShopInfo);
    
    return currentShopInfoString !== previousShopInfoString;
  };

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getShopSettings();
        setSettings(prev => ({
          ...prev,
          ...savedSettings,
          // Ensure transactionSettings exists with proper structure
          transactionSettings: {
            allowDelete: savedSettings.transactionSettings?.allowDelete || false,
            deleteRequiresPassword: savedSettings.transactionSettings?.deleteRequiresPassword || true
          },
          // Ensure inventorySettings exists with proper structure
          inventorySettings: {
            allowEditDelete: savedSettings.inventorySettings?.allowEditDelete !== undefined 
              ? savedSettings.inventorySettings.allowEditDelete 
              : true
          },
          // Ensure inventoryOptions has proper structure
          inventoryOptions: {
            categories: savedSettings.inventoryOptions?.categories || defaultInventoryOptions.categories,
            sizes: savedSettings.inventoryOptions?.sizes || defaultInventoryOptions.sizes,
            colors: savedSettings.inventoryOptions?.colors || defaultInventoryOptions.colors
          }
        }));
        
        // Store previous shop info for comparison
        setPreviousShopInfo(savedSettings.shopInfo);
        
        // Load QR code image if it exists
        if (savedSettings.qrCodeImage) {
          setQrCodeImage(savedSettings.qrCodeImage);
        } else {
          // Generate initial QR code if none exists
          generateAndSaveQRCode();
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Regenerate QR code when shop info changes
  useEffect(() => {
    if (previousShopInfo && hasShopInfoChanged()) {
      // Debounce the QR code generation to avoid too many requests
      const timer = setTimeout(() => {
        generateAndSaveQRCode();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [settings.shopInfo, previousShopInfo]);

  // Generate and save QR code - IMPROVED VERSION
  const generateAndSaveQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      const qrContent = generateQRContent();
      
      // If no meaningful content is available
      const emptyVCard = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:My Shop\r\nORG:My Shop\r\nEND:VCARD';
      if (!qrContent || qrContent === emptyVCard) {
        console.warn('No shop information available to generate QR code');
        setQrCodeImage('');
        return;
      }
      
      // Try server-side generation first
      try {
        const result = await generateQRCodeFromShopInfo();
        
        if (result.qrCodeImage) {
          setQrCodeImage(result.qrCodeImage);
          setSettings(prev => ({
            ...prev,
            qrCodeImage: result.qrCodeImage,
            qrCodeContent: qrContent
          }));
          return;
        }
      } catch (serverError) {
        console.warn('Server-side QR generation failed, falling back to client-side:', serverError);
      }
      
      // Client-side generation with better options
      try {
        const QRCode = (await import('qrcode')).default;
        
        // Create higher quality QR code
        const options = {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H', // Highest error correction
          type: 'image/png',
          quality: 1
        };
        
        // Generate data URL directly
        const pngDataUrl = await QRCode.toDataURL(qrContent, options);
        setQrCodeImage(pngDataUrl);
        
        // Save to database
        await saveQRCode(pngDataUrl, qrContent, 'png');
        
        // Update the settings with the new QR code
        setSettings(prev => ({
          ...prev,
          qrCodeImage: pngDataUrl,
          qrCodeContent: qrContent
        }));
        
      } catch (clientError) {
        console.error('Client-side QR generation failed:', clientError);
        // Fallback to simple QR code
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 300;
        
        // Draw a simple QR code
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText('QR Code Generation Failed', 50, 150);
        
        const pngDataUrl = canvas.toDataURL('image/png');
        setQrCodeImage(pngDataUrl);
      }
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please check your shop information and try again.');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Save settings to localStorage and API - UPDATED VERSION
  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      const settingsToSave = {
        ...settings,
        qrCodeContent: generateQRContent()
      };
      
      const savedSettings = await saveShopSettings(settingsToSave);
      
      // Update previous shop info
      setPreviousShopInfo(savedSettings.shopInfo);
      
      // Always regenerate QR code when saving (not just when shop info changes)
      try {
        await generateAndSaveQRCode();
      } catch (qrError) {
        console.warn('QR code regeneration failed:', qrError);
        // Continue with the save even if QR code generation fails
      }
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: settingsToSave
      }));
      
      // Save to localStorage for immediate access
      localStorage.setItem('shopSettings', JSON.stringify(settingsToSave));
      
      setIsSaving(false);
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setIsSaving(false);
      alert('Failed to save settings. Please try again.');
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('shopInfo.')) {
      const field = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        shopInfo: {
          ...prev.shopInfo,
          [field]: value
        }
      }));
    } else if (name.startsWith('transactionSettings.')) {
      // Handle transaction settings changes
      const field = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        transactionSettings: {
          ...prev.transactionSettings,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.startsWith('inventorySettings.')) {
      // Handle inventory settings changes
      const field = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        inventorySettings: {
          ...prev.inventorySettings,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Add new category
  const addCategory = () => {
    if (newCategory.trim() && !settings.inventoryOptions.categories[newCategory.trim()]) {
      setSettings(prev => ({
        ...prev,
        inventoryOptions: {
          ...prev.inventoryOptions,
          categories: {
            ...prev.inventoryOptions.categories,
            [newCategory.trim()]: []
          }
        }
      }));
      setNewCategory('');
    }
  };

  // Remove category
  const removeCategory = (category) => {
    const newCategories = { ...settings.inventoryOptions.categories };
    delete newCategories[category];
    
    setSettings(prev => ({
      ...prev,
      inventoryOptions: {
        ...prev.inventoryOptions,
        categories: newCategories
      }
    }));
  };

  // Add new subcategory
  const addSubcategory = () => {
    if (newSubcategory.category && newSubcategory.name.trim()) {
      const category = newSubcategory.category;
      const subcategoryName = newSubcategory.name.trim();
      
      // Ensure the category exists and has an array of subcategories
      if (!settings.inventoryOptions.categories[category]) {
        setSettings(prev => ({
          ...prev,
          inventoryOptions: {
            ...prev.inventoryOptions,
            categories: {
              ...prev.inventoryOptions.categories,
              [category]: []
            }
          }
        }));
      }
      
      if (!settings.inventoryOptions.categories[category].includes(subcategoryName)) {
        setSettings(prev => ({
          ...prev,
          inventoryOptions: {
            ...prev.inventoryOptions,
            categories: {
              ...prev.inventoryOptions.categories,
              [category]: [...(prev.inventoryOptions.categories[category] || []), subcategoryName]
            }
          }
        }));
        
        setNewSubcategory({ category: '', name: '' });
      }
    }
  };

  // Remove subcategory
  const removeSubcategory = (category, subcategory) => {
    setSettings(prev => ({
      ...prev,
      inventoryOptions: {
        ...prev.inventoryOptions,
        categories: {
          ...prev.inventoryOptions.categories,
          [category]: (prev.inventoryOptions.categories[category] || []).filter(sc => sc !== subcategory)
        }
      }
    }));
  };

  // Add new size
  const addSize = () => {
    if (newSize.trim() && !settings.inventoryOptions.sizes.includes(newSize.trim())) {
      setSettings(prev => ({
        ...prev,
        inventoryOptions: {
          ...prev.inventoryOptions,
          sizes: [...prev.inventoryOptions.sizes, newSize.trim()]
        }
      }));
      setNewSize('');
    }
  };

  // Remove size
  const removeSize = (size) => {
    setSettings(prev => ({
      ...prev,
      inventoryOptions: {
        ...prev.inventoryOptions,
        sizes: prev.inventoryOptions.sizes.filter(s => s !== size)
      }
    }));
  };

  // Add new color
  const addColor = () => {
    if (newColor.trim() && !settings.inventoryOptions.colors.includes(newColor.trim())) {
      setSettings(prev => ({
        ...prev,
        inventoryOptions: {
          ...prev.inventoryOptions,
          colors: [...prev.inventoryOptions.colors, newColor.trim()]
        }
      }));
      setNewColor('');
    }
  };

  // Remove color
  const removeColor = (color) => {
    setSettings(prev => ({
      ...prev,
      inventoryOptions: {
        ...prev.inventoryOptions,
        colors: prev.inventoryOptions.colors.filter(c => c !== color)
      }
    }));
  };

  // Handle folder selection
  const handleFolderSelect = () => {
    const folderPath = prompt('Enter billing folder path:');
    if (folderPath) {
      setSettings(prev => ({
        ...prev,
        billingFolder: folderPath
      }));
    }
  };

  // Tab navigation
  const renderTabContent = () => {
    switch(activeTab) {
      case 'general':
        return (
          <>
            <div className="settings-section">
              <h2>Theme Settings</h2>
              <div className="theme-options">
                <div className="theme-option">
                  <input
                    type="radio"
                    id="theme-light"
                    name="theme"
                    value="light"
                    checked={settings.theme === 'light'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="theme-light" className="theme-card">
                    <div className="theme-preview light-preview">
                      <div className="preview-header"></div>
                      <div className="preview-content">
                        <div className="preview-item"></div>
                        <div className="preview-item"></div>
                        <div className="preview-item"></div>
                      </div>
                    </div>
                    <span>Day Mode</span>
                  </label>
                </div>
                <div className="theme-option">
                  <input
                    type="radio"
                    id="theme-dark"
                    name="theme"
                    value="dark"
                    checked={settings.theme === 'dark'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="theme-dark" className="theme-card">
                    <div className="theme-preview dark-preview">
                      <div className="preview-header"></div>
                      <div className="preview-content">
                        <div className="preview-item"></div>
                        <div className="preview-item"></div>
                        <div className="preview-item"></div>
                      </div>
                    </div>
                    <span>Night Mode</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h2>VAT Settings</h2>
              <div className="toggle-switch">
                <input
                    type="checkbox"
                    id="vatEnabled"
                    name="vatEnabled"
                    checked={settings.vatEnabled}
                    onChange={(e) => {
                      setSettings(prev => ({
                        ...prev,
                        vatEnabled: e.target.checked,
                        vatRate: e.target.checked ? (prev.vatRate || 13) : 0
                      }));
                    }}
                  />
                  <label htmlFor="vatEnabled" className="toggle-slider">
                    <span className="toggle-text">Enable VAT</span>
                  </label>
                </div>
                {settings.vatEnabled && (
                  <div className="vat-details">
                    <label>
                      VAT Rate (%):
                      <input
                        type="number"
                        name="vatRate"
                        value={settings.vatRate}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          vatRate: parseFloat(e.target.value) || 0
                        }))}
                        min="0"
                        max="30"
                        step="0.1"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h2>Pricing Mode</h2>
                <div className="pricing-options">
                  <div className="pricing-option">
                    <input
                      type="radio"
                      id="pricing-fixed"
                      name="pricingMode"
                      value="fixed"
                      checked={settings.pricingMode === 'fixed'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="pricing-fixed" className="pricing-card">
                      <div className="pricing-icon">💰</div>
                      <span>Fixed Pricing</span>
                      <p>Sellers cannot change prices during billing</p>
                    </label>
                  </div>
                  <div className="pricing-option">
                    <input
                      type="radio"
                      id="pricing-variable"
                      name="pricingMode"
                      value="variable"
                      checked={settings.pricingMode === 'variable'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="pricing-variable" className="pricing-card">
                      <div className="pricing-icon">📊</div>
                      <span>Variable Pricing</span>
                      <p>Sellers can adjust prices during billing</p>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h2>Billing Settings</h2>
                <div className="folder-selector">
                  <label>Bills Storage Location:</label>
                  <div className="folder-path">{settings.billingFolder}</div>
                  <button type="button" onClick={handleFolderSelect} className="animated-button">
                    <span>Change Folder</span>
                  </button>
                </div>
              </div>

              {/* Transaction Settings Section */}
              <div className="settings-section">
                <h2>Transaction Settings</h2>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="allowDelete"
                    name="transactionSettings.allowDelete"
                    checked={settings.transactionSettings?.allowDelete || false}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="allowDelete" className="toggle-slider">
                    <span className="toggle-text">Allow Transaction Deletion</span>
                  </label>
                </div>
                
                {settings.transactionSettings?.allowDelete && (
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="deleteRequiresPassword"
                      name="transactionSettings.deleteRequiresPassword"
                      checked={settings.transactionSettings?.deleteRequiresPassword || false}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="deleteRequiresPassword" className="toggle-slider">
                      <span className="toggle-text">Require Password for Deletion</span>
                    </label>
                  </div>
                )}
              </div>

              {/* NEW: Inventory Settings Section */}
              <div className="settings-section">
                <h2>Inventory Settings</h2>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="allowEditDelete"
                    name="inventorySettings.allowEditDelete"
                    checked={settings.inventorySettings?.allowEditDelete !== undefined 
                      ? settings.inventorySettings.allowEditDelete 
                      : true}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="allowEditDelete" className="toggle-slider">
                    <span className="toggle-text">Allow Product Edit & Delete</span>
                  </label>
                </div>
                <p className="setting-description">
                  When disabled, users will not be able to edit or delete products from the inventory.
                </p>
              </div>
            </>
          );
        case 'shop':
          return (
            <div className="settings-section">
              <h2>Shop Information</h2>
              <div className="shop-info-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Shop Name:</label>
                    <input
                      type="text"
                      name="shopInfo.name"
                      value={settings.shopInfo.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number:</label>
                    <input
                      type="text"
                      name="shopInfo.contactNumber"
                      value={settings.shopInfo.contactNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Address:</label>
                  <textarea
                    name="shopInfo.address"
                    value={settings.shopInfo.address}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number:</label>
                    <input
                      type="text"
                      name="shopInfo.phone"
                      value={settings.shopInfo.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      name="shopInfo.email"
                      value={settings.shopInfo.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="social-media-section">
                  <h3>Social Media Links</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <i className="fab fa-facebook"></i> Facebook Page:
                      </label>
                      <input
                        type="url"
                        name="shopInfo.facebook"
                        value={settings.shopInfo.facebook}
                        onChange={handleInputChange}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <i className="fab fa-youtube"></i> YouTube Channel:
                      </label>
                      <input
                        type="url"
                        name="shopInfo.youtube"
                        value={settings.shopInfo.youtube}
                        onChange={handleInputChange}
                        placeholder="https://youtube.com/yourchannel"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <i className="fab fa-tiktok"></i> TikTok ID:
                      </label>
                      <input
                        type="text"
                        name="shopInfo.tiktok"
                        value={settings.shopInfo.tiktok}
                        onChange={handleInputChange}
                        placeholder="@yourusername"
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <i className="fab fa-instagram"></i> Instagram:
                      </label>
                      <input
                        type="url"
                        name="shopInfo.instagram"
                        value={settings.shopInfo.instagram}
                        onChange={handleInputChange}
                        placeholder="https://instagram.com/yourprofile"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        case 'inventory':
          return (
            <div className="settings-section">
              <h2>Inventory Options</h2>
              
              <div className="inventory-option">
                <h3>Categories</h3>
                <div className="input-group">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add new category"
                  />
                  <button type="button" onClick={addCategory} className="animated-button">
                    <span>Add</span>
                  </button>
                </div>
                <div className="items-list">
                  {Object.keys(settings.inventoryOptions.categories || {}).map((category, index) => (
                    <div key={index} className="item-tag">
                      {category}
                      <button type="button" onClick={() => removeCategory(category)} className="remove-btn">
                        <span>×</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="inventory-option">
                <h3>Subcategories</h3>
                <div className="input-group">
                  <select
                    value={newSubcategory.category}
                    onChange={(e) => setNewSubcategory({...newSubcategory, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {Object.keys(settings.inventoryOptions.categories || {}).map((category, index) => (
                      <option key={index} value={category}>{category}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSubcategory.name}
                    onChange={(e) => setNewSubcategory({...newSubcategory, name: e.target.value})}
                    placeholder="Add new subcategory"
                  />
                  <button type="button" onClick={addSubcategory} className="animated-button">
                    <span>Add</span>
                  </button>
                </div>
                {Object.entries(settings.inventoryOptions.categories || {}).map(([category, subcategories]) => (
                  <div key={category} className="subcategory-group">
                    <h4>{category}</h4>
                    <div className="items-list">
                      {Array.isArray(subcategories) && subcategories.map((subcategory, index) => (
                        <div key={index} className="item-tag">
                          {subcategory}
                          <button type="button" onClick={() => removeSubcategory(category, subcategory)} className="remove-btn">
                            <span>×</span>
                          </button>
                        </div>
                      ))}
                    </div>
                </div>
              ))}
            </div>

            <div className="inventory-option">
              <h3>Sizes</h3>
              <div className="input-group">
                <input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="Add new size"
                />
                <button type="button" onClick={addSize} className="animated-button">
                  <span>Add</span>
                </button>
              </div>
              <div className="items-list">
                {Array.isArray(settings.inventoryOptions.sizes) && settings.inventoryOptions.sizes.map((size, index) => (
                  <div key={index} className="item-tag">
                    {size}
                    <button type="button" onClick={() => removeSize(size)} className="remove-btn">
                      <span>×</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="inventory-option">
              <h3>Colors</h3>
              <div className="input-group">
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="Add new color"
                />
                <button type="button" onClick={addColor} className="animated-button">
                  <span>Add</span>
                </button>
              </div>
              <div className="items-list">
                {Array.isArray(settings.inventoryOptions.colors) && settings.inventoryOptions.colors.map((color, index) => (
                  <div key={index} className="item-tag">
                    {color}
                    <button type="button" onClick={() => removeColor(color)} className="remove-btn">
                      <span>×</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'qr':
        return (
          <div className="settings-section">
            <h2>QR Code Generator</h2>
            <div className="qr-generator">
              <div className="qr-preview">
                {qrCodeImage ? (
                  <div className="qr-code-container">
                    <img 
                      src={qrCodeImage} 
                      alt="Shop QR Code" 
                      className="qr-code-image"
                      style={{ width: '250px', height: '250px' }}
                    />
                    <div className="qr-test-instructions">
                      <p><strong>Test this QR code:</strong></p>
                      <p>1. Open your phone's camera or QR scanner app</p>
                      <p>2. Point it at this QR code</p>
                      <p>3. It should prompt you to save contact information</p>
                    </div>
                    <div className="qr-actions">
                      <button 
                        onClick={generateAndSaveQRCode} 
                        disabled={isGeneratingQR}
                        className="animated-button"
                      >
                        {isGeneratingQR ? 'Generating...' : 'Regenerate QR'}
                      </button>
                      <button 
                        onClick={downloadQRCode}
                        className="animated-button"
                      >
                        Download QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="qr-placeholder">
                    <div className="placeholder-icon">
                      <i className="fas fa-qrcode"></i>
                    </div>
                    <p>No QR code generated yet</p>
                    <button 
                      onClick={generateAndSaveQRCode}
                      disabled={isGeneratingQR}
                      className="animated-button"
                    >
                      {isGeneratingQR ? 'Generating...' : 'Generate QR Code'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="qr-info">
                <h3>QR Code Information</h3>
                <div className="qr-content-preview">
                  <pre>{generateQRContent()}</pre>
                </div>
                <p className="qr-help-text">
                  This QR code uses the standard vCard format. When scanned with a phone's camera or QR scanner app, it will:
                </p>
                <ul className="qr-info-list">
                  <li>Prompt to save contact information to your address book</li>
                  <li>Include all your shop details in the proper contact fields</li>
                  <li>Provide clickable links to your social media profiles</li>
                </ul>
                
                <div className="qr-troubleshooting">
                  <h4>Not scanning? Try these tips:</h4>
                  <ul>
                    <li>Ensure good lighting when scanning</li>
                    <li>Hold your phone steady about 6-12 inches from the screen</li>
                    <li>Make sure the entire QR code is visible in your camera view</li>
                    <li>Try using a dedicated QR scanner app if your camera doesn't work</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`settings-page-wrapper ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <div className="settings-container">
        <div className="settings-header">
          <h1>Shop Settings</h1>
          <p>Customize your shop preferences and information</p>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <i className="fas fa-cog"></i>
            <span>General</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <i className="fas fa-store"></i>
            <span>Shop Info</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <i className="fas fa-boxes"></i>
            <span>Inventory</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <i className="fas fa-qrcode"></i>
            <span>QR Code</span>
          </button>
        </div>
        
        <div className="settings-content">
          {renderTabContent()}
        </div>

        <div className="settings-actions">
          <button 
            type="button" 
            onClick={saveSettings} 
            className={`save-btn ${isSaving ? 'saving' : ''} ${saveSuccess ? 'success' : ''}`}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="spinner"></div>
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <i className="fas fa-check"></i>
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;