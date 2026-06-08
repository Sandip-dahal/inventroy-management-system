import React, { useState, useEffect } from 'react';
import ProductModal from '../components/ProductModal';
import ProductCard from '../components/ProductCard';
import { inventoryAPI } from '../services/api';
import '../styles/Inventory.css';
import { useLocation } from 'react-router-dom';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    outOfStock: 0,
    lowStock: 0
  });
  const [viewMode, setViewMode] = useState('grid');
  const [retryCount, setRetryCount] = useState(0);
  const [settings, setSettings] = useState(null);
  const [canEditDelete, setCanEditDelete] = useState(true);

  const location = useLocation();

  useEffect(() => {
    const savedSettings = localStorage.getItem('shopSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      setCanEditDelete(
        parsedSettings.inventorySettings?.allowEditDelete !== undefined 
          ? parsedSettings.inventorySettings.allowEditDelete 
          : true
      );
    }
  }, []);

  useEffect(() => {
    const handleSettingsUpdated = (event) => {
      const newSettings = event.detail;
      setSettings(newSettings);
      setCanEditDelete(
        newSettings.inventorySettings?.allowEditDelete !== undefined 
          ? newSettings.inventorySettings.allowEditDelete 
          : true
      );
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdated);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    if (status) {
      setStatusFilter(status);
      setSearchTerm('');
      setCategoryFilter('all');
      setSubcategoryFilter('all');
      setSizeFilter('all');
      setColorFilter('all');
    }
  }, []);

  const categories = {
    "Men's Clothing": ["T-Shirts", "Shirts", "Pants", "Traditional", "Jackets", "Innerwear"],
    "Women's Clothing": ["Kurtas", "Sarees", "Blouses", "Dresses", "Pants", "Traditional"],
    "Kids' Clothing": ["Boys", "Girls", "Infants", "School Uniforms"],
    "Accessories": ["Bags", "Jewelry", "Hats", "Belts", "Watches"],
    "Footwear": ["Shoes", "Sandals", "Slippers", "Sports Shoes"]
  };

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
  const colors = ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Brown", "Gray", "Multi"];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
    calculateStats();
  }, [products, searchTerm, categoryFilter, subcategoryFilter, sizeFilter, colorFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching products...');
      const response = await inventoryAPI.getProducts();
      console.log('Products response:', response);
      
      if (response && response.products) {
        setProducts(response.products || []);
      } else if (response && response.data && response.data.products) {
        setProducts(response.data.products || []);
      } else if (Array.isArray(response)) {
        setProducts(response);
      } else {
        console.error('Unexpected response format:', response);
        setError('Unexpected response format from server');
      }
      
      setLoading(false);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching products:', error);
      console.error('Error details:', error.response);
      
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(retryCount + 1);
          fetchProducts();
        }, 2000);
        setError(`Failed to load products. Retrying... (${retryCount + 1}/3)`);
      } else {
        if (error.response) {
          setError(`Server error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          setError('Network error: Could not connect to server');
        } else {
          setError('Failed to load products. Please try again.');
        }
      }
      
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }
    
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && product.barcode.includes(searchTerm)) ||
        (product.nepaliName && product.nepaliName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter(product => product.subcategory === subcategoryFilter);
    }

    if (sizeFilter !== 'all') {
      filtered = filtered.filter(product => product.size === sizeFilter);
    }

    if (colorFilter !== 'all') {
      filtered = filtered.filter(product => product.color === colorFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'in_stock') {
        filtered = filtered.filter(product => product.stock > 0);
      } else if (statusFilter === 'low_stock') {
        filtered = filtered.filter(product => product.stock > 0 && product.stock <= (product.lowStockAlert || 5));
      } else if (statusFilter === 'out_of_stock') {
        filtered = filtered.filter(product => product.stock === 0);
      }
    }

    setFilteredProducts(filtered);
  };

  const calculateStats = () => {
    if (!Array.isArray(products)) return;
    
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + ((product.cost || 0) * (product.stock || 0)), 0);
    const outOfStock = products.filter(product => product.stock === 0).length;
    const lowStock = products.filter(product => (product.stock || 0) > 0 && (product.stock || 0) <= (product.lowStockAlert || 5)).length;
    
    setStats({ totalProducts, totalValue, outOfStock, lowStock });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    if (!canEditDelete) {
      alert('Edit functionality is disabled in settings');
      return;
    }
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        await inventoryAPI.updateProduct(editingProduct._id, productData);
      } else {
        await inventoryAPI.createProduct(productData);
      }
      fetchProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Failed to save product: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!canEditDelete) {
      alert('Delete functionality is disabled in settings');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await inventoryAPI.deleteProduct(id);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleExport = () => {
    const headers = "SKU,Name,Nepali Name,Category,Subcategory,Size,Color,Cost Price,Selling Price,Stock,Low Stock Alert,Status\n";
    const csvContent = filteredProducts.map(product => 
      `"${product.sku || ''}","${product.name || ''}","${product.nepaliName || ''}","${product.category || ''}","${product.subcategory || ''}","${product.size || ''}","${product.color || ''}",${product.cost || 0},${product.price || 0},${product.stock || 0},${product.lowStockAlert || 5},"${product.stock === 0 ? 'Out of Stock' : product.stock <= (product.lowStockAlert || 5) ? 'Low Stock' : 'In Stock'}"`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusClass = (stock, lowStockAlert = 5) => {
    if (stock === 0) return 'status-out-of-stock';
    if (stock <= lowStockAlert) return 'status-low-stock';
    return 'status-in-stock';
  };

  const getStatusText = (stock, lowStockAlert = 5) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= lowStockAlert) return 'Low Stock';
    return 'In Stock';
  };

  if (loading) {
    return <div className="loading">Loading inventory...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
        <button 
          onClick={fetchProducts}
          style={{marginLeft: '10px', padding: '5px 10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px'}}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <div className="header-actions">
          <div className="view-switch">
            <span className={viewMode === 'grid' ? 'active' : ''}>
              <i style={{ fontStyle: 'normal' }}>◫</i> Grid
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={viewMode === 'list'}
                onChange={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              />
              <span className="slider"></span>
            </label>
            <span className={viewMode === 'list' ? 'active' : ''}>
              <i style={{ fontStyle: 'normal' }}>≡</i> List
            </span>
          </div>
          <button className="btn-secondary" onClick={handleExport}>
            Export CSV
          </button>
          <button className="btn-primary" onClick={handleAddProduct}>
            + Add Product
          </button>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="inventory-stats">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p>{stats.totalProducts}</p>
        </div>
        <div className="stat-card">
          <h3>Inventory Value</h3>
          <p>NPR {stats.totalValue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Out of Stock</h3>
          <p className={stats.outOfStock > 0 ? 'warning' : ''}>{stats.outOfStock}</p>
        </div>
        <div className="stat-card">
          <h3>Low Stock</h3>
          <p className={stats.lowStock > 0 ? 'warning' : ''}>{stats.lowStock}</p>
        </div>
      </div>

      {/* Edit/Delete Status Indicator */}
      {!canEditDelete && (
        <div className="edit-delete-status">
          <i className="fas fa-info-circle"></i>
          <span>Edit and Delete functions are currently disabled in settings</span>
        </div>
      )}

      {/* Filters */}
      <div className="inventory-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, SKU, barcode, or Nepali name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>Category</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter('all');
            }}
          >
            <option value="all">All Categories</option>
            {Object.keys(categories).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Subcategory</label>
          <select 
            value={subcategoryFilter} 
            onChange={(e) => setSubcategoryFilter(e.target.value)}
            disabled={categoryFilter === 'all'}
          >
            <option value="all">All Subcategories</option>
            {categoryFilter !== 'all' && categories[categoryFilter].map(subcat => (
              <option key={subcat} value={subcat}>{subcat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Size</label>
          <select 
            value={sizeFilter} 
            onChange={(e) => setSizeFilter(e.target.value)}
          >
            <option value="all">All Sizes</option>
            {sizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Color</label>
          <select 
            value={colorFilter} 
            onChange={(e) => setColorFilter(e.target.value)}
          >
            <option value="all">All Colors</option>
            {colors.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Display - Grid or List based on viewMode */}
      {viewMode === 'grid' ? (
        <div className="products-grid">
          {!Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
            <div className="empty-state">
              <p>No products found. {products.length === 0 ? 'Add your first product!' : 'Try changing your filters.'}</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                canEditDelete={canEditDelete}
              />
            ))
          )}
        </div>
      ) : (
        <div className="products-list">
          {!Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
            <div className="empty-state">
              <p>No products found. {products.length === 0 ? 'Add your first product!' : 'Try changing your filters.'}</p>
            </div>
          ) : (
            <table className="products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product._id} className="product-list-item">
                    <td>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="product-thumbnail" />
                      ) : (
                        <div className="product-thumbnail placeholder">No Image</div>
                      )}
                    </td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      {product.nepaliName && (
                        <div className="nepali-name">{product.nepaliName}</div>
                      )}
                    </td>
                    <td>{product.sku || 'N/A'}</td>
                    <td>{product.barcode || 'N/A'}</td>
                    <td>
                      <div>{product.category || 'N/A'}</div>
                      <div className="subcategory">{product.subcategory || ''}</div>
                    </td>
                    <td>{product.size || 'N/A'}</td>
                    <td>
                      {product.color ? (
                        <div className="color-display">
                          <span 
                            className="color-swatch" 
                            style={{backgroundColor: product.color.toLowerCase()}}
                            title={product.color}
                          ></span>
                          {product.color}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="stock-quantity">{product.stock || 0}</td>
                    <td className="price">NPR {product.price || 0}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(product.stock, product.lowStockAlert)}`}>
                        {getStatusText(product.stock, product.lowStockAlert)}
                      </span>
                    </td>
                    <td>
                      <div className="product-actions">
                        <button 
                          className="btn-edit" 
                          onClick={() => handleEditProduct(product)}
                          disabled={!canEditDelete}
                          title={!canEditDelete ? "Edit disabled in settings" : "Edit product"}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDeleteProduct(product._id)}
                          disabled={!canEditDelete}
                          title={!canEditDelete ? "Delete disabled in settings" : "Delete product"}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          categories={categories}
          sizes={sizes}
          colors={colors}
          allProducts={products}
        />
      )}
    </div>
  );
};

export default Inventory;