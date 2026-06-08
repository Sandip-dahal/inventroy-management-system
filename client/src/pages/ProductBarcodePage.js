// ProductBarcodePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { productsAPI } from '../services/api';
import '../styles/ProductBarcodePage.css';

const ProductBarcodePage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    size: '',
    color: '',
    minPrice: '',
    maxPrice: '',
    inStock: false
  });
  const [loading, setLoading] = useState(true);
  const [barcodeImage, setBarcodeImage] = useState(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    subcategories: [],
    sizes: [],
    colors: []
  });
  const barcodeRef = useRef(null);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Extract filter options from products
  useEffect(() => {
    if (products.length > 0) {
      const categories = [...new Set(products.map(p => p.category))].sort();
      const subcategories = [...new Set(products.map(p => p.subcategory))].sort();
      const sizes = [...new Set(products.map(p => p.size))].sort();
      const colors = [...new Set(products.map(p => p.color))].sort();
      
      setFilterOptions({
        categories,
        subcategories,
        sizes,
        colors
      });
    }
  }, [products]);

  // Filter products when search term or filters change
  useEffect(() => {
    filterProducts();
  }, [searchTerm, filters, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProducts();
      setProducts(response.data.products);
      setFilteredProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        (product.nepaliName && product.nepaliName.toLowerCase().includes(term)) ||
        (product.description && product.description.toLowerCase().includes(term)) ||
        (product.sku && product.sku.toLowerCase().includes(term)) ||
        (product.barcode && product.barcode.toLowerCase().includes(term)) ||
        (product.productId && product.productId.toLowerCase().includes(term))
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Apply subcategory filter
    if (filters.subcategory) {
      filtered = filtered.filter(product => product.subcategory === filters.subcategory);
    }

    // Apply size filter
    if (filters.size) {
      filtered = filtered.filter(product => product.size === filters.size);
    }

    // Apply color filter
    if (filters.color) {
      filtered = filtered.filter(product => product.color === filters.color);
    }

    // Apply price filters
    if (filters.minPrice) {
      filtered = filtered.filter(product => product.price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(product => product.price <= parseFloat(filters.maxPrice));
    }

    // Apply stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => product.stock > 0);
    }

    setFilteredProducts(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      size: '',
      color: '',
      minPrice: '',
      maxPrice: '',
      inStock: false
    });
    setSearchTerm('');
  };

  const generateBarcode = async (product) => {
    if (!product.barcode) {
      alert('This product does not have a barcode assigned.');
      return;
    }

    setGeneratingBarcode(true);
    setSelectedProduct(product);
    
    try {
      // Using JsBarcode to generate barcode on the client side
      // In a real implementation, you would use a barcode library
      const JsBarcode = window.JsBarcode;
      const canvas = document.createElement('canvas');
      
      JsBarcode(canvas, product.barcode, {
        format: "CODE128",
        displayValue: false, // No text below barcode
        width: 2,
        height: 100,
        margin: 10
      });
      
      setBarcodeImage(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Error generating barcode:', error);
      alert('Error generating barcode. Please try again.');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const saveBarcodeImage = () => {
    if (!barcodeImage) return;
    
    const link = document.createElement('a');
    link.href = barcodeImage;
    link.download = `${selectedProduct.name}_barcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printBarcode = () => {
    if (!barcodeImage) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { 
              text-align: center; 
              margin: 0; 
              padding: 10px;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            img { 
              max-width: 100%; 
              height: auto;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <img src="${barcodeImage}" alt="Barcode" />
        </body>
      </html>
    `);
    printWindow.document.close();
    
    printWindow.onload = function() {
      printWindow.print();
      printWindow.afterprint = function() {
        printWindow.close();
      };
    };
  };

  return (
    <div className="product-barcode-page">
      <div className="page-header">
        <h1>Product Barcode Generator</h1>
        <p>Generate barcodes for your products</p>
      </div>

      <div className="content-container">
        {/* Search and Filters Section */}
        <div className="search-filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products by name, SKU, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="filters-container">
            <div className="filter-group">
              <label>Category</label>
              <select 
                name="category" 
                value={filters.category} 
                onChange={handleFilterChange}
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Subcategory</label>
              <select 
                name="subcategory" 
                value={filters.subcategory} 
                onChange={handleFilterChange}
              >
                <option value="">All Subcategories</option>
                {filterOptions.subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Size</label>
              <select 
                name="size" 
                value={filters.size} 
                onChange={handleFilterChange}
              >
                <option value="">All Sizes</option>
                {filterOptions.sizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Color</label>
              <select 
                name="color" 
                value={filters.color} 
                onChange={handleFilterChange}
              >
                <option value="">All Colors</option>
                {filterOptions.colors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Min Price</label>
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleFilterChange}
                placeholder="Min"
                min="0"
              />
            </div>

            <div className="filter-group">
              <label>Max Price</label>
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="Max"
                min="0"
              />
            </div>

            <div className="filter-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="inStock"
                  checked={filters.inStock}
                  onChange={handleFilterChange}
                />
                In Stock Only
              </label>
            </div>

            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Products List and Barcode Preview */}
        <div className="main-content">
          {/* Products List */}
          <div className="products-section">
            <h2>Products ({filteredProducts.length})</h2>
            
            {loading ? (
              <div className="loading">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="no-products">
                No products found. Try adjusting your search criteria.
              </div>
            ) : (
              <div className="products-list">
                {filteredProducts.map(product => (
                  <div 
                    key={product._id} 
                    className={`product-card ${selectedProduct?._id === product._id ? 'selected' : ''}`}
                    onClick={() => generateBarcode(product)}
                  >
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      {product.nepaliName && <p className="nepali-name">{product.nepaliName}</p>}
                      <div className="product-details">
                        <span className="product-id">ID: {product.productId}</span>
                        {product.sku && <span className="sku">SKU: {product.sku}</span>}
                        {product.barcode && <span className="barcode">Barcode: {product.barcode}</span>}
                      </div>
                      <div className="product-specs">
                        <span className="category">{product.category} / {product.subcategory}</span>
                        <span className="size-color">{product.size}, {product.color}</span>
                      </div>
                      <div className="product-pricing">
                        <span className="price">Rs. {product.price}</span>
                        <span className={`stock ${product.stock === 0 ? 'out-of-stock' : product.stock <= product.lowStockAlert ? 'low-stock' : 'in-stock'}`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button 
                        className="generate-barcode-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateBarcode(product);
                        }}
                        disabled={!product.barcode}
                      >
                        {!product.barcode ? 'No Barcode' : 'Generate Barcode'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barcode Preview Section */}
          <div className="barcode-section">
            <h2>Barcode Preview</h2>
            
            {generatingBarcode ? (
              <div className="barcode-loading">Generating barcode...</div>
            ) : barcodeImage ? (
              <div className="barcode-preview">
                <div className="barcode-image-container">
                  <img 
                    src={barcodeImage} 
                    alt="Product barcode" 
                    ref={barcodeRef}
                    className="barcode-image"
                  />
                </div>
                
                <div className="barcode-actions">
                  <button onClick={saveBarcodeImage} className="action-btn save-btn">
                    Save Image
                  </button>
                  <button onClick={printBarcode} className="action-btn print-btn">
                    Print
                  </button>
                </div>
                
                <div className="barcode-info">
                  <p><strong>Product:</strong> {selectedProduct.name}</p>
                  <p><strong>Barcode Number:</strong> {selectedProduct.barcode}</p>
                  <p className="scan-info">When scanned, this barcode will return: {selectedProduct.barcode}</p>
                </div>
              </div>
            ) : (
              <div className="barcode-placeholder">
                <div className="placeholder-icon">📷</div>
                <p>Select a product to generate its barcode</p>
                <small>Note: Only products with barcode information can generate barcodes</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBarcodePage;