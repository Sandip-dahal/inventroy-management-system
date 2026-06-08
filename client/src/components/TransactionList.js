import React, { useState, useEffect } from 'react';
import { getShopSettings } from '../utils/settings';
import { authAPI } from '../services/api'; // Import your authAPI
import ErrorBoundary from './ErrorBoundary';

const TransactionList = ({ 
  transactions, 
  suppliers, 
  onAddTransaction, 
  onEditTransaction, 
  onDeleteTransaction, 
  onRefresh 
}) => {
  const [settings, setSettings] = useState({});
  const [allowDelete, setAllowDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const shopSettings = await getShopSettings();
        setSettings(shopSettings);
        setAllowDelete(shopSettings.transactionSettings?.allowDelete || false);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings({});
        setAllowDelete(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Helper function to get supplier name
  const getSupplierName = (transaction) => {
    // Handle null or undefined supplier
    if (!transaction.supplier) {
      return 'No Supplier Assigned';
    }
    
    // If supplier is populated as an object
    if (typeof transaction.supplier === 'object' && transaction.supplier !== null) {
      return transaction.supplier.name || transaction.supplier.companyName || 'Unknown Supplier';
    }
    
    // If supplier is an ID string, find in suppliers array
    if (typeof transaction.supplier === 'string' && suppliers && suppliers.length > 0) {
      const supplier = suppliers.find(s => s._id === transaction.supplier);
      return supplier ? supplier.name || supplier.companyName : `Supplier ID: ${transaction.supplier}`;
    }
    
    return 'Unknown Supplier';
  };

  const handleDeleteClick = (transactionId) => {
    setShowDeleteConfirm(transactionId);
  };

  const handleDeleteConfirm = async (transactionId) => {
    if (!allowDelete) {
      alert('Delete functionality is disabled in settings');
      setShowDeleteConfirm(null);
      return;
    }

    if (settings.transactionSettings?.deleteRequiresPassword) {
      const password = prompt('Please enter your password to confirm deletion:');
      if (!password) {
        setShowDeleteConfirm(null);
        return;
      }
      
      const isValid = await verifyPassword(password);
      if (!isValid) {
        alert('Invalid password. Deletion cancelled.');
        setShowDeleteConfirm(null);
        return;
      }
    }

    setDeletingId(transactionId);
    try {
      await onDeleteTransaction(transactionId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const verifyPassword = async (password) => {
    try {
      // Use your authAPI service for password verification
      const result = await authAPI.verifyPassword(password);
      
      // Check the response structure - adjust based on your actual API response
      if (result.success || result.isValid || result.status === 'success') {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  };

  if (isLoading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <ErrorBoundary>
      {/* Debug info - remove or set display: 'none' after debugging */}


      <div className="transaction-list-container">
        <div className="transaction-header">
          <h2>Transactions</h2>
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={onAddTransaction}>
              Add Transaction
            </button>
            <button className="btn btn-secondary" onClick={onRefresh}>
              Refresh
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Amount (NPR)</th>
                <th>Payment Mode</th>
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions && transactions.length > 0 ? (
                transactions.map(transaction => (
                  <tr key={transaction._id} className={deletingId === transaction._id ? 'deleting' : ''}>
                    <td>{new Date(transaction.paymentDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${transaction.type?.toLowerCase() || 'unknown'}`}>
                        {transaction.type || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      {getSupplierName(transaction)}
                      {!transaction.supplier && (
                        <span style={{color: 'red', fontSize: '12px', marginLeft: '5px'}}>
                          (Please edit to assign supplier)
                        </span>
                      )}
                    </td>
                    <td>{transaction.amount?.toLocaleString('en-NP') || '0'}</td>
                    <td>{transaction.paymentMode || '-'}</td>
                    <td>{transaction.referenceNumber || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => onEditTransaction(transaction)}
                          disabled={deletingId === transaction._id}
                        >
                          Edit
                        </button>
                        {allowDelete && (
                          showDeleteConfirm === transaction._id ? (
                            <div className="delete-confirmation">
                              <span>Confirm?</span>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteConfirm(transaction._id)}
                                disabled={deletingId === transaction._id}
                              >
                                {deletingId === transaction._id ? 'Deleting...' : 'Yes'}
                              </button>
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={handleDeleteCancel}
                                disabled={deletingId === transaction._id}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteClick(transaction._id)}
                              disabled={deletingId === transaction._id}
                            >
                              Delete
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .transaction-list-container {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .transaction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background-color: #3498db;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: #2980b9;
        }
        
        .btn-secondary {
          background-color: #ecf0f1;
          color: #7f8c8d;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background-color: #bdc3c7;
        }
        
        .btn-danger {
          background-color: #e74c3c;
          color: white;
        }
        
        .btn-danger:hover:not(:disabled) {
          background-color: #c0392b;
        }
        
        .btn-sm {
          padding: 5px 10px;
          font-size: 12px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table th,
        .table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        .table th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-payment {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-credit {
          background-color: #fff3e0;
          color: #ef6c00;
        }
        
        .status-refund {
          background-color: #e3f2fd;
          color: #1565c0;
        }
        
        .status-advance {
          background-color: #f3e5f5;
          color: #7b1fa2;
        }
        
        .status-unknown {
          background-color: #f5f5f5;
          color: #616161;
        }
        
        .text-center {
          text-align: center;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }
        
        .delete-confirmation {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        
        .delete-confirmation span {
          font-size: 12px;
          color: #7f8c8d;
        }
        
        .deleting {
          opacity: 0.6;
          background-color: #fff9f9;
        }
      `}</style>
    </ErrorBoundary>
  );
};

export default TransactionList;