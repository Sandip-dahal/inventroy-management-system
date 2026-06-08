// src/components/PurchaseOrderManagement/PurchaseOrderDetails.js
import React from 'react';

const PurchaseOrderDetails = ({ purchaseOrder, onBack }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-NP', {
      year: 'numeric',
      month: 'long',
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

  const getSupplierName = (supplier) => {
    if (typeof supplier === 'object') {
      return supplier.name || supplier.companyName || 'Unknown Supplier';
    }
    return 'Unknown Supplier';
  };

  return (
    <div className="purchase-order-details">
      <div className="details-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to List
        </button>
        <h2>Purchase Order Details</h2>
        {/* Removed Edit button from details view */}
      </div>

      <div className="details-card">
        <div className="card-header">
          <h3>{purchaseOrder.poNumber}</h3>
          <span className={`status-badge ${getStatusBadgeClass(purchaseOrder.status)}`}>
            {purchaseOrder.status}
          </span>
        </div>

        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <label>Supplier:</label>
              <span>{getSupplierName(purchaseOrder.supplier)}</span>
            </div>
            <div className="info-item">
              <label>Order Date:</label>
              <span>{formatDate(purchaseOrder.orderDate)}</span>
            </div>
            <div className="info-item">
              <label>Expected Delivery:</label>
              <span>{formatDate(purchaseOrder.expectedDeliveryDate)}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={`status-badge ${getStatusBadgeClass(purchaseOrder.status)}`}>
                {purchaseOrder.status}
              </span>
            </div>
          </div>

          {purchaseOrder.cancellationReason && (
            <div className="cancellation-info">
              <label>Cancellation Reason:</label>
              <span>{purchaseOrder.cancellationReason}</span>
              {purchaseOrder.cancellationNotes && (
                <>
                  <label>Cancellation Notes:</label>
                  <p>{purchaseOrder.cancellationNotes}</p>
                </>
              )}
            </div>
          )}

          {purchaseOrder.notes && (
            <div className="notes-section">
              <label>Notes:</label>
              <p>{purchaseOrder.notes}</p>
            </div>
          )}

          <div className="items-section">
            <h4>Items</h4>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered Qty</th>
                  <th>Received Qty</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder.items.map((item, index) => {
                  const completion = item.quantity > 0 
                    ? Math.round((item.receivedQuantity / item.quantity) * 100) 
                    : 0;
                  
                  return (
                    <tr key={index}>
                      <td>{item.product}</td>
                      <td>{item.quantity}</td>
                      <td>{item.receivedQuantity || 0}</td>
                      <td>
                        <div className="completion-bar">
                          <div 
                            className="completion-fill"
                            style={{ width: `${completion}%` }}
                          ></div>
                          <span>{completion}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="communication-status">
            <h4>Communication</h4>
            <div className="status-grid">
              <div className="status-item">
                <label>WhatsApp Sent:</label>
                <span>{purchaseOrder.whatsappSent ? 'Yes' : 'No'}</span>
              </div>
              <div className="status-item">
                <label>Email Sent:</label>
                <span>{purchaseOrder.emailSent ? 'Yes' : 'No'}</span>
              </div>
              {purchaseOrder.sentAt && (
                <div className="status-item">
                  <label>Sent At:</label>
                  <span>{formatDate(purchaseOrder.sentAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetails;