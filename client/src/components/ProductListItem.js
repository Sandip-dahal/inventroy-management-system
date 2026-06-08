import React from 'react';

const ProductListItem = ({ product, onEdit, onDelete, canEditDelete }) => {
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

  return (
    <tr className="product-list-item">
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
      </td>
    </tr>
  );
};

export default ProductListItem;