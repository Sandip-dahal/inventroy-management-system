// SimpleEditForm.js - Create this new file
import React, { useState, useEffect } from 'react';

const SimpleEditForm = ({ purchaseOrder, onSave, onCancel, loading }) => {
  const [status, setStatus] = useState(purchaseOrder.status);

  useEffect(() => {
    setStatus(purchaseOrder.status);
  }, [purchaseOrder]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...purchaseOrder,
      status: status,
      _id: purchaseOrder._id
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1001,
      width: '400px'
    }}>
      <h2>Edit PO: {purchaseOrder.poNumber}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom: '15px'}}>
          <label>Status: </label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            style={{marginLeft: '10px', padding: '5px'}}
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
          <button 
            type="button" 
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimpleEditForm;