// src/components/PurchaseOrderManagement/PurchaseOrderList.js
import React, { useState } from 'react';
import { purchaseOrderAPI } from '../services/api';

const PurchaseOrderList = ({ purchaseOrders, suppliers, onAddPurchaseOrder, onRefresh, onSelectPO, onEditPO }) => {
  const [deletingId, setDeletingId] = useState(null);

  const getSupplierName = (supplierId) => {
    if (!supplierId) return 'Unknown Supplier';
    
    if (typeof supplierId === 'object') {
      return supplierId.name || supplierId.companyName || 'Unknown Supplier';
    }
    
    const supplier = suppliers.find(s => s._id === supplierId);
    return supplier ? supplier.name || supplier.companyName : 'Unknown Supplier';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'received': return 'status-received';
      case 'cancelled': return 'status-cancelled';
      case 'partially received': return 'status-partial';
      default: return 'status-pending';
    }
  };

  const canEditPO = (po) => {
    // Only allow editing if status is Pending or Approved
    return po.status === 'Pending' || po.status === 'Approved';
  };

  const canDeletePO = (po) => {
    // Only allow deletion if status is Pending
    return po.status === 'Pending';
  };

  const handleDelete = async (poId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;
    
    try {
      setDeletingId(poId);
      await purchaseOrderAPI.deletePurchaseOrder(poId);
      alert('Purchase order deleted successfully!');
      onRefresh();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      alert('Failed to delete purchase order. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

const handleEdit = (po, e) => {
  e.stopPropagation();
  console.log('Edit button clicked for PO:', po._id); // Debug log
  if (onEditPO && canEditPO(po)) {
    onEditPO(po);
  } else {
    console.log('Cannot edit PO or onEditPO not provided');
  }
};

  return (
    <div className="purchase-order-list">
      <div className="table-header">
        <h2>Purchase Orders</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onRefresh}>
            ↻ Refresh
          </button>
          <button className="btn btn-primary" onClick={onAddPurchaseOrder}>
            + Create New PO
          </button>
        </div>
      </div>

      <div className="table-container">
        {purchaseOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Purchase Orders</h3>
            <p>Create your first purchase order to get started.</p>
            <button className="btn btn-primary" onClick={onAddPurchaseOrder}>
              Create Purchase Order
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map(po => (
                <tr key={po._id} onClick={() => onSelectPO && onSelectPO(po)} className="clickable-row">
                  <td className="po-number">{po.poNumber}</td>
                  <td>{getSupplierName(po.supplier)}</td>
                  <td>{formatDate(po.orderDate)}</td>
                  <td>{formatDate(po.expectedDeliveryDate)}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPO && onSelectPO(po);
                        }}
                        title="View Details"
                      >
                        👁️ View
                      </button>
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={(e) => handleEdit(po, e)}
                        title="Edit PO"
                        disabled={!canEditPO(po)}
                      >
                        {!canEditPO(po) ? '🔒 Edit' : '✏️ Edit'}
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={(e) => handleDelete(po._id, e)}
                        title="Delete PO"
                        disabled={!canDeletePO(po) || deletingId === po._id}
                      >
                        {deletingId === po._id ? '⏳' : '🗑️'} Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderList;