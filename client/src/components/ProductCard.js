import React from 'react';

const ProductCard = ({ product, onEdit, onDelete, canEditDelete }) => {
  const getStatus = () => {
    if (product.stock === 0) return 'Out of Stock';
    if (product.stock <= (product.lowStockAlert || 5)) return 'Low Stock';
    return 'In Stock';
  };

  const statusClass = () => {
    if (product.stock === 0) return 'status-out-of-stock';
    if (product.stock <= (product.lowStockAlert || 5)) return 'status-low-stock';
    return 'status-in-stock';
  };

  // Format numbers with commas
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
  };

  return (
    <div className="product-card">
      <div className="product-header">
        <h3 title={product.name}>{product.name}</h3>
        <span className={`status-badge ${statusClass()}`}>{getStatus()}</span>
      </div>
      
      {product.nepaliName && (
        <p className="nepali-name" title={product.nepaliName}>{product.nepaliName}</p>
      )}
      
      <div className="product-details">
        <div className="detail-row">
          <span>SKU:</span>
          <span>{product.sku || 'N/A'}</span>
        </div>
        <div className="detail-row">
          <span>Barcode:</span>
          <span>{product.barcode || 'N/A'}</span>
        </div>
        <div className="detail-row">
          <span>Category:</span>
          <span>
            {product.category || 'N/A'}
            {product.subcategory ? ` / ${product.subcategory}` : ''}
          </span>
        </div>
        <div className="detail-row">
          <span>Size/Color:</span>
          <span>
            {product.size || 'N/A'} / {product.color || 'N/A'}
          </span>
        </div>
        <div className="detail-row">
          <span>Stock:</span>
          <span>{formatNumber(product.stock)} units</span>
        </div>
        <div className="detail-row">
          <span>Cost/Price:</span>
          <span>NPR {formatNumber(product.cost)} / NPR {formatNumber(product.price)}</span>
        </div>
      </div>
      
      <div className="product-actions">
        <button 
          className="btn-edit" 
          onClick={() => onEdit(product)}
          disabled={!canEditDelete}
          title={!canEditDelete ? "Edit disabled in settings" : "Edit product"}
        >
          Edit
        </button>
        <button 
          className="btn-delete" 
          onClick={() => onDelete(product._id)}
          disabled={!canEditDelete}
          title={!canEditDelete ? "Delete disabled in settings" : "Delete product"}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ProductCard;