// src/components/PurchaseOrderManagement/PurchaseOrderEditForm.js
import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import '../styles/SupplierDashboard.css';

const PurchaseOrderEditForm = ({ purchaseOrder, suppliers, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    status: purchaseOrder?.status || 'Pending',
    cancellationReason: purchaseOrder?.cancellationReason || '',
    cancellationNotes: purchaseOrder?.cancellationNotes || '',
    cancellationSource: purchaseOrder?.cancellationSource || '',
    items: purchaseOrder?.items?.map(item => ({
      ...item,
      receivedQuantity: item.receivedQuantity || 0
    })) || []
  });

  const [errors, setErrors] = useState({});
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [deliveryPercentage, setDeliveryPercentage] = useState(0);

  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        status: purchaseOrder.status,
        cancellationReason: purchaseOrder.cancellationReason || '',
        cancellationNotes: purchaseOrder.cancellationNotes || '',
        cancellationSource: purchaseOrder.cancellationSource || '',
        items: purchaseOrder.items.map(item => ({
          ...item,
          receivedQuantity: item.receivedQuantity || 0
        }))
      });
    }
  }, [purchaseOrder]);

  // Calculate delivery percentage whenever items change
  useEffect(() => {
    const totalOrdered = formData.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = formData.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const percentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
    setDeliveryPercentage(percentage);
  }, [formData.items]);

  const handleStatusChange = (e) => {
    const { value } = e.target;
    
    if (value === 'Cancelled') {
      setShowCancellationDialog(true);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      status: value,
      // Reset cancellation fields if not cancelling
      ...(value !== 'Cancelled' && {
        cancellationReason: '',
        cancellationNotes: '',
        cancellationSource: ''
      })
    }));
  };

  const confirmCancellation = (reason, source, notes = '') => {
    setFormData(prev => ({
      ...prev,
      status: 'Cancelled',
      cancellationReason: reason,
      cancellationSource: source,
      cancellationNotes: notes
    }));
    setShowCancellationDialog(false);
  };

  const cancelCancellation = () => {
    setFormData(prev => ({
      ...prev,
      status: purchaseOrder.status // Revert to original status
    }));
    setShowCancellationDialog(false);
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      
      if (field === 'receivedQuantity') {
        value = parseInt(value) || 0;
        // Ensure received quantity doesn't exceed ordered quantity
        const maxQuantity = updatedItems[index].quantity;
        value = Math.min(value, maxQuantity);
      }
      
      updatedItems[index][field] = value;
      
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const handleSelectAllItems = () => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        receivedQuantity: item.quantity
      }))
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.status === 'Cancelled') {
      if (!formData.cancellationReason) {
        newErrors.cancellationReason = 'Cancellation reason is required';
      }
      if (!formData.cancellationSource) {
        newErrors.cancellationSource = 'Please specify who cancelled the order';
      }
    }
    
    if (formData.status === 'Partially Received') {
      formData.items.forEach((item, index) => {
        if (item.receivedQuantity > item.quantity) {
          newErrors[`item-${index}-receivedQuantity`] = 'Received quantity cannot exceed ordered quantity';
        }
        if (item.receivedQuantity <= 0) {
          newErrors[`item-${index}-receivedQuantity`] = 'Received quantity must be greater than 0 for partially received items';
        }
      });
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    // Auto-set status based on delivery completion
    const finalFormData = { ...formData };
    const isFullyReceived = formData.items.every(item => item.receivedQuantity === item.quantity);
    
    if (isFullyReceived && formData.status === 'Partially Received') {
      finalFormData.status = 'Received';
    }
    
    try {
      await onSave({
        ...finalFormData,
        _id: purchaseOrder._id
      });
    } catch (error) {
      console.error('Error saving purchase order:', error);
    }
  };

  const isFullyReceived = formData.items.every(item => item.receivedQuantity === item.quantity);

  return (
    <ErrorBoundary>
      <div className="purchase-order-edit-form">
        <h2>Edit Purchase Order: {purchaseOrder.poNumber}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Current Status: <span className={`status-${purchaseOrder.status.toLowerCase()}`}>
              {purchaseOrder.status}
            </span></h3>
            
            <div className="form-group">
              <label>Update Status *</label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleStatusChange}
                required
                disabled={purchaseOrder.status === 'Received' || purchaseOrder.status === 'Cancelled'}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Partially Received">Partially Received</option>
                <option value="Received">Fully Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              {(purchaseOrder.status === 'Received' || purchaseOrder.status === 'Cancelled') && (
                <p className="help-text">Cannot change status from {purchaseOrder.status}</p>
              )}
            </div>

            {formData.status === 'Cancelled' && (
              <div className="form-group">
                <label>Cancellation Details</label>
                <p><strong>Reason:</strong> {formData.cancellationReason}</p>
                <p><strong>Source:</strong> {formData.cancellationSource}</p>
                {formData.cancellationNotes && (
                  <>
                    <label>Cancellation Notes:</label>
                    <p>{formData.cancellationNotes}</p>
                  </>
                )}
              </div>
            )}

            {(formData.status === 'Partially Received' || formData.status === 'Received') && (
              <div className="form-group">
                <div className="delivery-header">
                  <h4>Received Items</h4>
                  {formData.status === 'Partially Received' && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handleSelectAllItems}
                    >
                      Mark All as Received
                    </button>
                  )}
                </div>
                
                <div className="items-grid">
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-info">
                        <h5>{item.product}</h5>
                        <p>Ordered: {item.quantity}</p>
                        {item.brand && <p>Brand: {item.brand}</p>}
                        {item.size && <p>Size: {item.size}</p>}
                      </div>
                      
                      <div className="item-received">
                        <label>Received Quantity:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={item.receivedQuantity}
                          onChange={(e) => handleItemChange(index, 'receivedQuantity', e.target.value)}
                          disabled={formData.status === 'Received'}
                          className={errors[`item-${index}-receivedQuantity`] ? 'error' : ''}
                        />
                        {errors[`item-${index}-receivedQuantity`] && (
                          <span className="error-text">{errors[`item-${index}-receivedQuantity`]}</span>
                        )}
                        
                        <div className="completion-status">
                          <div className="completion-bar">
                            <div 
                              className="completion-fill"
                              style={{ width: `${(item.receivedQuantity / item.quantity) * 100}%` }}
                            ></div>
                          </div>
                          <span>{Math.round((item.receivedQuantity / item.quantity) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="overall-progress">
                  <h5>Overall Delivery Progress: {Math.round(deliveryPercentage)}%</h5>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${deliveryPercentage}%` }}
                    ></div>
                  </div>
                  {isFullyReceived && (
                    <p className="success-text">All items fully received! Status will be set to "Fully Received".</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Update Purchase Order'}
            </button>
          </div>
        </form>

        {/* Cancellation Dialog */}
        {showCancellationDialog && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Cancel Purchase Order</h3>
              <p>Please select the reason and source for cancellation:</p>
              
              <div className="cancellation-options">
                <div className="cancellation-source">
                  <h4>Who cancelled the order?</h4>
                  <div className="source-buttons">
                    <button 
                      className="btn btn-warning"
                      onClick={() => {
                        const reason = prompt('Please enter cancellation reason:', 'By Mistake');
                        if (reason) {
                          const notes = prompt('Additional notes:', '');
                          confirmCancellation(reason, 'Customer', notes);
                        }
                      }}
                    >
                      By Our Mistake
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => {
                        const reason = prompt('Please enter cancellation reason:', 'Supplier Issue');
                        if (reason) {
                          const notes = prompt('Additional notes:', '');
                          confirmCancellation(reason, 'Supplier', notes);
                        }
                      }}
                    >
                      By Supplier
                    </button>
                  </div>
                </div>
                
                <button 
                  className="btn btn-secondary"
                  onClick={cancelCancellation}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PurchaseOrderEditForm;
