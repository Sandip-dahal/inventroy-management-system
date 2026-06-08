import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';

const ProductModal = ({ product, onSave, onClose, categories, sizes, colors, inventoryOptions, allProducts }) => {
  const [formData, setFormData] = useState({
    name: '',
    nepaliName: '',
    description: '',
    category: '',
    subcategory: '',
    size: '',
    color: '',
    cost: '',
    price: '',
    stock: '',
    lowStockAlert: '5',
    sku: '',
    barcode: '',
    supplier: '',
    countryOfOrigin: 'Nepal',
    material: 'Cotton'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [skuGenerated, setSkuGenerated] = useState(false);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const [originalProductData, setOriginalProductData] = useState(null);

  useEffect(() => {
    // Set default values based on available options
    const defaultCategory = Object.keys(categories)[0] || '';
    const defaultSubcategory = categories[defaultCategory] ? categories[defaultCategory][0] : '';
    const defaultSize = sizes[0] || '';
    const defaultColor = colors[0] || '';

    if (product) {
      // Editing existing product - store original data for comparison
      const originalData = {
        name: product.name || '',
        nepaliName: product.nepaliName || '',
        description: product.description || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        size: product.size || '',
        color: product.color || '',
        cost: product.cost?.toString() || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '',
        lowStockAlert: product.lowStockAlert?.toString() || '5',
        supplier: product.supplier || '',
        countryOfOrigin: product.countryOfOrigin || 'Nepal',
        material: product.material || 'Cotton',
        sku: product.sku || '',
        barcode: product.barcode || ''
      };
      
      setOriginalProductData(originalData);
      
      setFormData({
        ...originalData
      });
      
      // Set generated flags
      setSkuGenerated(!!product.sku);
      setBarcodeGenerated(!!product.barcode);
    } else {
      // Adding new product - use defaults from available options
      setFormData(prev => ({
        ...prev,
        category: defaultCategory,
        subcategory: defaultSubcategory,
        size: defaultSize,
        color: defaultColor
      }));
      
      setOriginalProductData(null);
      setSkuGenerated(false);
      setBarcodeGenerated(false);
    }
  }, [product, categories, sizes, colors]);

  // Check if any field has been modified during editing
  const hasFormChanged = () => {
    if (!product || !originalProductData) return false;
    
    // Don't consider SKU changes as form changes since we regenerate it
    const fieldsToCheck = Object.keys(originalProductData).filter(
      key => key !== 'sku' && key !== 'barcode'
    );
    
    return fieldsToCheck.some(key => {
      return formData[key] !== originalProductData[key];
    });
  };

  // Check if product matches exactly with any existing product
  const findIdenticalProduct = (productData) => {
    // Add safety check for allProducts
    if (!allProducts || !Array.isArray(allProducts)) return null;
    
    return allProducts.find(existingProduct => {
      // Skip the current product when editing
      if (product && existingProduct._id === product._id) return false;
      
      // Compare all relevant fields (excluding SKU and barcode)
      return (
        existingProduct.name === productData.name &&
        existingProduct.nepaliName === (productData.nepaliName || '') &&
        existingProduct.category === productData.category &&
        existingProduct.subcategory === productData.subcategory &&
        existingProduct.size === productData.size &&
        existingProduct.color === productData.color &&
        existingProduct.cost === parseFloat(productData.cost || 0) &&
        existingProduct.price === parseFloat(productData.price || 0) &&
        existingProduct.supplier === (productData.supplier || '') &&
        existingProduct.countryOfOrigin === productData.countryOfOrigin &&
        existingProduct.material === (productData.material || '')
      );
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If category changes, update subcategory to the first option of the new category
    if (name === 'category') {
      const newSubcategory = categories[value] ? categories[value][0] : '';
      setFormData(prev => ({
        ...prev,
        subcategory: newSubcategory
      }));
    }
    
    // If editing and any field changes (except SKU/barcode), regenerate SKU only
    if (product && hasFormChanged() && (name !== 'sku' && name !== 'barcode')) {
      setSkuGenerated(false);
      setFormData(prev => ({
        ...prev,
        sku: ''
      }));
      // Keep the original barcode - don't regenerate it
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Check required fields
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) 
      newErrors.price = 'Valid price is required';
    if (!formData.cost || isNaN(formData.cost) || parseFloat(formData.cost) < 0) 
      newErrors.cost = 'Valid cost is required';
    if (!formData.stock || isNaN(formData.stock) || parseInt(formData.stock) < 0) 
      newErrors.stock = 'Valid stock quantity is required';
    if (!formData.lowStockAlert || isNaN(formData.lowStockAlert) || parseInt(formData.lowStockAlert) < 0) 
      newErrors.lowStockAlert = 'Valid low stock alert is required';
    
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.subcategory) newErrors.subcategory = 'Subcategory is required';
    if (!formData.size) newErrors.size = 'Size is required';
    if (!formData.color) newErrors.color = 'Color is required';
    
    // Only check for identical products if allProducts is available
    if (allProducts && Array.isArray(allProducts)) {
      const identicalProduct = findIdenticalProduct(formData);
      if (identicalProduct) {
        newErrors.identical = `Product already exists in inventory with SKU: ${identicalProduct.sku}. Please edit the existing product instead.`;
        
        // If identical product exists, SKU and barcode must match
        if (formData.sku !== identicalProduct.sku) {
          newErrors.sku = 'SKU must match the existing identical product';
        }
        
        if (formData.barcode !== identicalProduct.barcode) {
          newErrors.barcode = 'Barcode must match the existing identical product';
        }
      } else {
        // If no identical product, SKU is required and must be unique
        if (!formData.sku) {
          newErrors.sku = 'SKU is required';
        } else {
          // Check if SKU is already used by a different product
          const skuExists = allProducts.some(p => 
            p.sku === formData.sku && (!product || p._id !== product._id)
          );
          
          if (skuExists) {
            newErrors.sku = 'SKU already exists for a different product';
          }
        }
        
        // Check if barcode is already used by a different product
        if (formData.barcode) {
          const barcodeExists = allProducts.some(p => 
            p.barcode === formData.barcode && (!product || p._id !== product._id)
          );
          
          if (barcodeExists) {
            newErrors.barcode = 'Barcode already exists for a different product';
          }
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert string values to numbers for the API
      const processedData = {
        name: formData.name.trim(),
        nepaliName: formData.nepaliName.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        subcategory: formData.subcategory,
        size: formData.size,
        color: formData.color,
        cost: parseFloat(formData.cost) || 0,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        lowStockAlert: parseInt(formData.lowStockAlert) || 5,
        sku: formData.sku.trim() || null,
        barcode: formData.barcode.trim() || null,
        supplier: formData.supplier.trim() || null,
        countryOfOrigin: formData.countryOfOrigin,
        material: formData.material.trim() || null
      };
      
      console.log('Sending data to API:', processedData);
      
      // Call the onSave function passed from parent
      await onSave(processedData);
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      if (error.response?.data) {
        console.error('API Response:', error.response.data);
        if (error.response.data.message) {
          setApiError(error.response.data.message);
        } else if (error.response.data.errors) {
          const validationErrors = error.response.data.errors;
          const errorMessages = Object.values(validationErrors).flat().join(', ');
          setApiError(`Validation errors: ${errorMessages}`);
        } else {
          setApiError('Failed to save product. Please check the data and try again.');
        }
      } else {
        setApiError('Failed to save product. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const generateSku = () => {
    if (!formData.category || !formData.color || !formData.size) {
      alert('Please select category, color, and size first');
      return;
    }
    
    const categoryAbbr = formData.category.substring(0, 3).toUpperCase();
    const colorAbbr = formData.color.substring(0, 3).toUpperCase();
    const sizeAbbr = formData.size.toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    
    const newSku = `${categoryAbbr}-${colorAbbr}-${sizeAbbr}-${random}`;
    
    setFormData(prev => ({
      ...prev,
      sku: newSku
    }));
    
    setSkuGenerated(true);
  };

  const generateBarcode = () => {
    // Only allow barcode generation for new products, not when editing
    if (product) {
      alert('Barcode cannot be changed when editing a product');
      return;
    }
    
    const newBarcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    
    setFormData(prev => ({
      ...prev,
      barcode: newBarcode
    }));
    
    setBarcodeGenerated(true);
  };

  // Check if we're editing an existing product
  const isEditing = !!product;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h2 style={{ fontSize: '24px', color: '#2c3e50' }}>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
          <button 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer', 
              color: '#7f8c8d' 
            }} 
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        {/* API Error Display */}
        {apiError && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#ffebee', 
            borderBottom: '1px solid #e57373',
            color: '#c62828',
            fontSize: '14px'
          }}>
            Error: {apiError}
          </div>
        )}
        
        {/* Identical Product Error */}
        {allProducts && errors.identical && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fff3e0', 
            borderBottom: '1px solid #ffb74d',
            color: '#f57c00',
            fontSize: '14px'
          }}>
            {errors.identical}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#2c3e50' }}>Basic Information</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.name ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.name}</span>
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '##2c3e50' }}>
                  Product Name (Nepali)
                </label>
                <input
                  type="text"
                  name="nepaliName"
                  value={formData.nepaliName}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="उत्पादनको नाम"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Category *
                </label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.category ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">Select Category</option>
                  {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.category}</span>
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Subcategory *
                </label>
                <select 
                  name="subcategory" 
                  value={formData.subcategory} 
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.subcategory ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">Select Subcategory</option>
                  {categories[formData.category]?.map(subcat => (
                    <option key={subcat} value={subcat}>{subcat}</option>
                  ))}
                </select>
                {errors.subcategory && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.subcategory}</span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Size *
                </label>
                <select 
                  name="size" 
                  value={formData.size} 
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.size ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">Select Size</option>
                  {sizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                {errors.size && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.size}</span>
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Color *
                </label>
                <select 
                  name="color" 
                  value={formData.color} 
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.color ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">Select Color</option>
                  {colors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                {errors.color && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.color}</span>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#2c3e50' }}>Pricing & Inventory</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Cost Price (NPR) *
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.cost ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.cost && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.cost}</span>
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Selling Price (NPR) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.price ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.price && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.price}</span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.stock ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                  min="0"
                  placeholder="0"
                />
                {errors.stock && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.stock}</span>
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Low Stock Alert *
                </label>
                <input
                  type="number"
                  name="lowStockAlert"
                  value={formData.lowStockAlert}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: errors.lowStockAlert ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                  min="0"
                  placeholder="5"
                />
                {errors.lowStockAlert && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.lowStockAlert}</span>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#2c3e50' }}>Identification & Additional Info</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  SKU Code {allProducts && !findIdenticalProduct(formData) && '*'}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: errors.sku ? '2px solid red' : '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: skuGenerated ? '#f0f0f0' : 'white'
                    }}
                    placeholder="Will be auto-generated"
                    disabled={isSubmitting || (allProducts && findIdenticalProduct(formData) && formData.sku)}
                    readOnly={skuGenerated || (allProducts && findIdenticalProduct(formData) && formData.sku)}
                  />
                  {allProducts && !findIdenticalProduct(formData) && (
                    <button 
                      type="button" 
                      onClick={generateSku}
                      style={{
                        padding: '10px',
                        backgroundColor: skuGenerated ? '#95a5a6' : '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: skuGenerated ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: skuGenerated ? 0.6 : 1
                      }}
                      disabled={isSubmitting || skuGenerated}
                      title={skuGenerated ? "SKU already generated" : "Generate SKU"}
                    >
                      {skuGenerated ? 'Generated' : 'Generate'}
                    </button>
                  )}
                </div>
                {errors.sku && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.sku}</span>
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Barcode {!isEditing && allProducts && !findIdenticalProduct(formData) && '*'}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: errors.barcode ? '2px solid red' : '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: (barcodeGenerated || isEditing) ? '#f0f0f0' : 'white'
                    }}
                    placeholder="Will be auto-generated"
                    disabled={isSubmitting || (allProducts && findIdenticalProduct(formData) && formData.barcode) || isEditing}
                    readOnly={(barcodeGenerated || isEditing) || (allProducts && findIdenticalProduct(formData) && formData.barcode)}
                  />
                  {!isEditing && allProducts && !findIdenticalProduct(formData) && (
                    <button 
                      type="button" 
                      onClick={generateBarcode}
                      style={{
                        padding: '10px',
                        backgroundColor: barcodeGenerated ? '#95a5a6' : '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: barcodeGenerated ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: barcodeGenerated ? 0.6 : 1
                      }}
                      disabled={isSubmitting || barcodeGenerated}
                      title={barcodeGenerated ? "Barcode already generated" : "Generate barcode"}
                    >
                      {barcodeGenerated ? 'Generated' : 'Generate'}
                    </button>
                  )}
                </div>
                {errors.barcode && (
                  <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.barcode}</span>
                )}
                {isEditing && (
                  <span style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px' }}>
                    Barcode cannot be changed when editing a product
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                />
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                  Country of Origin
                </label>
                <select 
                  name="countryOfOrigin" 
                  value={formData.countryOfOrigin} 
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  disabled={isSubmitting}
                >
                  <option value="Nepal">Nepal</option>
                  <option value="India">India</option>
                  <option value="China">China</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                Material
              </label>
              <input
                type="text"
                name="material"
                value={formData.material}
                onChange={handleChange}
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%'
                }}
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500', color: '#2c3e50' }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%',
                  resize: 'vertical'
                }}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px', 
            marginTop: '24px', 
            paddingTop: '16px', 
            borderTop: '1px solid #e0e0e0' 
          }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '10px 16px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{
                padding: '10px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              disabled={isSubmitting || (allProducts && !!errors.identical)}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add') + ' Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;