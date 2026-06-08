import React, { useState, useEffect } from 'react';
import '../styles/TransactionForm.css'; // We'll create this CSS file

const TransactionForm = ({ transaction, suppliers, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    supplier: transaction?.supplier?._id || transaction?.supplier || '',
    type: transaction?.type || 'Payment',
    amount: transaction?.amount || '',
    paymentMode: transaction?.paymentMode || 'Cash',
    paymentDate: transaction?.paymentDate ? 
      new Date(transaction.paymentDate).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0],
    referenceNumber: transaction?.referenceNumber || '',
    description: transaction?.description || ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // If transaction type is Credit, disable payment mode
    if (formData.type === 'Credit') {
      setFormData(prev => ({
        ...prev,
        paymentMode: ''
      }));
    } else if (!formData.paymentMode) {
      // Set default payment mode for non-Credit transactions
      setFormData(prev => ({
        ...prev,
        paymentMode: 'Cash'
      }));
    }
  }, [formData.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.supplier) newErrors.supplier = 'Supplier is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (formData.type !== 'Credit' && !formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required for this transaction type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Convert amount to number and ensure proper date format
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        paymentDate: new Date(formData.paymentDate).toISOString()
      };
      
      // For credit transactions, ensure paymentMode is empty
      if (formData.type === 'Credit') {
        submitData.paymentMode = '';
      }
      
      onSubmit(submitData);
    }
  };

  return (
    <div className="transaction-form-container">
      <h2>{transaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-group">
          <label>Supplier *</label>
          <select
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            className={errors.supplier ? 'error' : ''}
          >
            <option value="">Select Supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name} - {supplier.companyName}
              </option>
            ))}
          </select>
          {errors.supplier && <span className="error-text">{errors.supplier}</span>}
        </div>
        
        <div className="form-group">
          <label>Transaction Type *</label>
          <select 
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="Payment">Payment</option>
            <option value="Credit">Credit</option>
            <option value="Refund">Refund</option>
            <option value="Advance">Advance</option>
          </select>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Amount (NPR) *</label>
            <input 
              type="number" 
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={errors.amount ? 'error' : ''}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            {errors.amount && <span className="error-text">{errors.amount}</span>}
          </div>
          
          <div className="form-group">
            <label>Payment Date *</label>
            <input 
              type="date" 
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              className={errors.paymentDate ? 'error' : ''}
            />
            {errors.paymentDate && <span className="error-text">{errors.paymentDate}</span>}
          </div>
        </div>
        
        <div className="form-group">
          <label>Payment Mode {formData.type !== 'Credit' && '*'}</label>
          <select 
            name="paymentMode"
            value={formData.paymentMode}
            onChange={handleChange}
            className={errors.paymentMode ? 'error' : ''}
            disabled={formData.type === 'Credit'}
          >
            <option value="">Select Payment Mode</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Esewa">Esewa</option>
            <option value="Khalti">Khalti</option>
            <option value="ConnectIPS">ConnectIPS</option>
            <option value="Cheque">Cheque</option>
          </select>
          {errors.paymentMode && <span className="error-text">{errors.paymentMode}</span>}
          {formData.type === 'Credit' && (
            <span className="help-text">Payment mode is disabled for credit transactions</span>
          )}
        </div>
        
        <div className="form-group">
          <label>Reference Number</label>
          <input 
            type="text" 
            name="referenceNumber"
            value={formData.referenceNumber}
            onChange={handleChange}
            placeholder="Optional reference number"
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea 
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            placeholder="Transaction description (optional)"
          />
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Save Transaction')}
          </button>
        </div> 
      </form>
    </div>
  );
};

export default TransactionForm;