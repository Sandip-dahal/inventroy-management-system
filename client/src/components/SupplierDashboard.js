// src/components/SupplierManagement/SupplierDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { supplierAPI, transactionAPI, purchaseOrderAPI } from '../services/api';
import SupplierList from './SupplierList';
import SupplierForm from './SupplierForm';
import SupplierDetails from './SupplierDetails';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderForm from './PurchaseOrderForm';
import SimpleEditForm from './SimpleEditForm';
import PurchaseOrderEditForm from './PurchaseOrderEditForm';
import PurchaseOrderDetails from './PurchaseOrderDetails';
import SupplierReports from './SupplierReports';
import '../styles/SupplierDashboard.css';

const SupplierDashboard = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showPurchaseOrderEditForm, setShowPurchaseOrderEditForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalPayable: 0, totalReceivable: 0 });
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
// Add this component to your SupplierDashboard.js file
const TestForm = ({ onClose }) => {
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
      <h2>Test Form</h2>
      <p>If you can see this, the overlay is working!</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

// Add this state
const [showTestForm, setShowTestForm] = useState(false);

// Add this to your form overlays section
{showTestForm && (
  <div className="form-overlay">
    <TestForm onClose={() => setShowTestForm(false)} />
  </div>
)}

// Add a test button
<button 
  onClick={() => setShowTestForm(true)}
  style={{
    position: 'fixed',
    bottom: '60px',
    right: '20px',
    zIndex: 2000,
    padding: '10px',
    background: 'green',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }}
>
  Test Overlay
</button>
  // Fetch all data on component mount
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [suppliersResponse, transactionsResponse, purchaseOrdersResponse] = await Promise.all([
        supplierAPI.getSuppliers(),
        transactionAPI.getTransactions().catch(error => {
          console.error('Error fetching transactions:', error);
          return { data: { transactions: [] } };
        }),
        purchaseOrderAPI.getPurchaseOrders().catch(error => {
          console.error('Error fetching purchase orders:', error);
          return { data: { purchaseOrders: [] } };
        })
      ]);
      
      setSuppliers(suppliersResponse.data.suppliers || []);
      setTransactions(transactionsResponse.data.transactions || []);
      setPurchaseOrders(purchaseOrdersResponse.data.purchaseOrders || []);
      
      await fetchSummary(transactionsResponse.data.transactions || []);
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      const fallbackSummary = calculateLocalSummary(transactions);
      setSummary(fallbackSummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchTransactions = useCallback(async () => {
    try {
      const transactionsResponse = await transactionAPI.getTransactions();
      setTransactions(transactionsResponse.data.transactions || []);
      await fetchSummary(transactionsResponse.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions');
    }
  }, []);

  // Fetch only specific data when tab changes
  useEffect(() => {
    if (dataLoaded) {
      if (activeTab === 'transactions') {
        fetchTransactions();
      } else if (activeTab === 'purchase-orders') {
        fetchPurchaseOrders();
      }
    }
  }, [activeTab, dataLoaded, fetchTransactions]);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const purchaseOrdersResponse = await purchaseOrderAPI.getPurchaseOrders();
      setPurchaseOrders(purchaseOrdersResponse.data.purchaseOrders || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setError('Failed to load purchase orders');
    }
  }, []);

  const fetchSummary = useCallback(async (transactionsData = null) => {
    try {
      const summaryResponse = await transactionAPI.getTransactionSummary();
      setSummary(summaryResponse.data || { totalPayable: 0, totalReceivable: 0 });
    } catch (error) {
      console.error('Error fetching transaction summary:', error);
      const transactionsToUse = transactionsData || transactions;
      const fallbackSummary = calculateLocalSummary(transactionsToUse);
      setSummary(fallbackSummary);
    }
  }, [transactions]);

  const calculateLocalSummary = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return { totalPayable: 0, totalReceivable: 0 };
    }
    
    const supplierBalances = {};
    
    transactions.forEach(transaction => {
      if (!transaction.supplier) return;
      
      const supplierId = typeof transaction.supplier === 'object' 
        ? transaction.supplier._id 
        : transaction.supplier;
      
      if (!supplierBalances[supplierId]) {
        supplierBalances[supplierId] = transaction.balanceAfter || 0;
      }
    });
    
    let totalPayable = 0;
    let totalReceivable = 0;
    
    Object.values(supplierBalances).forEach(balance => {
      if (balance > 0) {
        totalPayable += balance;
      } else if (balance < 0) {
        totalReceivable += Math.abs(balance);
      }
    });
    
    return { totalPayable, totalReceivable };
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    setActiveTab('details');
  };

  const handlePurchaseOrderSelect = (purchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setActiveTab('po-details');
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setShowSupplierForm(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleSaveSupplier = async (supplierData) => {
    try {
      setLoading(true);
      let response;
      if (editingSupplier) {
        response = await supplierAPI.updateSupplier(editingSupplier._id, supplierData);
      } else {
        response = await supplierAPI.createSupplier(supplierData);
      }
      
      if (response.status === 'success') {
        setShowSupplierForm(false);
        setEditingSupplier(null);
        await fetchAllData();
        alert('Supplier saved successfully!');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error saving supplier. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      setLoading(true);
      await supplierAPI.deleteSupplier(supplierId);
      await fetchAllData();
      if (selectedSupplier && selectedSupplier._id === supplierId) {
        setSelectedSupplier(null);
        setActiveTab('suppliers');
      }
      alert('Supplier deleted successfully!');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error deleting supplier. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionForm(true);
  };

  const handleEditTransaction = (transaction) => {
    const transactionToEdit = {
      ...transaction,
      supplier: transaction.supplier?._id || transaction.supplier
    };
    
    setEditingTransaction(transactionToEdit);
    setShowTransactionForm(true);
  };

  const handleSaveTransaction = async (transactionData) => {
    try {
      setLoading(true);
      let response;
      if (editingTransaction) {
        const updateData = {
          type: transactionData.type,
          amount: parseFloat(transactionData.amount),
          paymentMode: transactionData.paymentMode,
          paymentDate: new Date(transactionData.paymentDate).toISOString(),
          referenceNumber: transactionData.referenceNumber,
          description: transactionData.description,
          supplier: transactionData.supplier
        };
        
        response = await transactionAPI.updateTransaction(editingTransaction._id, updateData);
      } else {
        const createData = {
          ...transactionData,
          amount: parseFloat(transactionData.amount),
          paymentMode: transactionData.type === 'Credit' ? undefined : transactionData.paymentMode,
          supplier: transactionData.supplier
        };
        
        response = await transactionAPI.createTransaction(createData);
      }
      
      if (response.status === 'success') {
        setShowTransactionForm(false);
        setEditingTransaction(null);
        await fetchAllData();
        alert('Transaction saved successfully!');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      const errorMessage = error.response?.data?.message || error.message;
      alert(`Error saving transaction: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      setLoading(true);
      await transactionAPI.deleteTransaction(transactionId);
      await fetchAllData();
      alert('Transaction deleted successfully!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert(`Error deleting transaction: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPurchaseOrder = () => {
    setSelectedPurchaseOrder(null);
    setShowPurchaseOrderForm(true);
  };

  const handleEditPurchaseOrder = (purchaseOrder) => {
    console.log('Editing purchase order:', purchaseOrder);
    setEditingPurchaseOrder(purchaseOrder);
    setShowPurchaseOrderEditForm(true);
  };

  const handleSavePurchaseOrder = async (orderData) => {
    try {
      setLoading(true);
      let response;
      if (orderData._id) {
        response = await purchaseOrderAPI.updatePurchaseOrder(orderData._id, orderData);
      } else {
        response = await purchaseOrderAPI.createPurchaseOrder(orderData);
      }
      
      if (response.status === 'success') {
        setEditingPurchaseOrder(null);
        setShowPurchaseOrderEditForm(false);
        setShowPurchaseOrderForm(false);
        await fetchAllData();
        alert('Purchase order saved successfully!');
      }
    } catch (error) {
      console.error('Error saving purchase order:', error);
      alert('Error saving purchase order. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dataLoaded) {
    return <div className="loading">Loading Dashboard...</div>;
  }
  // Add this right before the return statement in SupplierDashboard.js
console.log('DEBUG - Form states:', {
  showPurchaseOrderEditForm,
  editingPurchaseOrder: editingPurchaseOrder ? editingPurchaseOrder._id : null,
  showSupplierForm,
  showTransactionForm,
  showPurchaseOrderForm
});

// Add this test button to force show the form
<div style={{position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000}}>
  <button 
    onClick={() => {
      if (purchaseOrders.length > 0) {
        setEditingPurchaseOrder(purchaseOrders[0]);
        setShowPurchaseOrderEditForm(true);
        console.log('DEBUG - Forcing form to show with PO:', purchaseOrders[0]._id);
      }
    }}
    style={{
      padding: '10px',
      background: 'red',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    DEBUG: Show Edit Form
  </button>
</div>


  return (
    <div className="supplier-dashboard">
      <div className="dashboard-header">
        <h1>Supplier Management</h1>
        <div className="summary-cards">
          <div className="summary-card payable">
            <h3>Total Payable</h3>
            <p>NPR {summary.totalPayable.toLocaleString('en-NP')}</p>
            <div className="icon">💰</div>
          </div>
          <div className="summary-card receivable">
            <h3>Total Receivable</h3>
            <p>NPR {summary.totalReceivable.toLocaleString('en-NP')}</p>
            <div className="icon">💸</div>
          </div>
          <div className="summary-card suppliers">
            <h3>Total Suppliers</h3>
            <p>{suppliers.length}</p>
            <div className="icon">🏢</div>
          </div>
          <div className="summary-card orders">
            <h3>Purchase Orders</h3>
            <p>{purchaseOrders.length}</p>
            <div className="icon">📋</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Render forms as overlays */}
      {showSupplierForm && (
        <div className="form-overlay">
          <div className="form-container">
            <SupplierForm
              supplier={editingSupplier}
              onSubmit={handleSaveSupplier}
              onCancel={() => {
                setShowSupplierForm(false);
                setEditingSupplier(null);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {showTransactionForm && (
        <div className="form-overlay">
          <div className="form-container">
            <TransactionForm
              transaction={editingTransaction}
              suppliers={suppliers}
              onSubmit={handleSaveTransaction}
              onCancel={() => {
                setShowTransactionForm(false);
                setEditingTransaction(null);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {showPurchaseOrderForm && (
        <div className="form-overlay">
          <div className="form-container">
            <PurchaseOrderForm
              purchaseOrder={selectedPurchaseOrder}
              suppliers={suppliers}
              onSubmit={handleSavePurchaseOrder}
              onCancel={() => {
                setShowPurchaseOrderForm(false);
                setSelectedPurchaseOrder(null);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {showPurchaseOrderEditForm && editingPurchaseOrder && (
        
  <div className="form-overlay">
    
    <SimpleEditForm
      purchaseOrder={editingPurchaseOrder}
      onSave={handleSavePurchaseOrder}
      onCancel={() => {
        setShowPurchaseOrderEditForm(false);
        setEditingPurchaseOrder(null);
      }}
      loading={loading}
    />
  </div>
)}

      <div className="tabs">
        <button 
          className={activeTab === 'suppliers' ? 'active' : ''} 
          onClick={() => setActiveTab('suppliers')}
          disabled={showSupplierForm || showTransactionForm || showPurchaseOrderForm || showPurchaseOrderEditForm}
        >
          Suppliers
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''} 
          onClick={() => setActiveTab('transactions')}
          disabled={showSupplierForm || showTransactionForm || showPurchaseOrderForm || showPurchaseOrderEditForm}
        >
          Transactions
        </button>
        <button 
          className={activeTab === 'purchase-orders' ? 'active' : ''} 
          onClick={() => setActiveTab('purchase-orders')}
          disabled={showSupplierForm || showTransactionForm || showPurchaseOrderForm || showPurchaseOrderEditForm}
        >
          Purchase Orders
        </button>
        <button 
          className={activeTab === 'reports' ? 'active' : ''} 
          onClick={() => setActiveTab('reports')}
          disabled={showSupplierForm || showTransactionForm || showPurchaseOrderForm || showPurchaseOrderEditForm}
        >
          Reports
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'suppliers' && (
          <SupplierList
            suppliers={suppliers}
            onSupplierSelect={handleSupplierSelect}
            onAddSupplier={handleAddSupplier}
            onEditSupplier={handleEditSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onRefresh={fetchAllData}
          />
        )}
        
        {activeTab === 'details' && selectedSupplier && (
          <SupplierDetails
            supplier={selectedSupplier}
            onBack={() => setActiveTab('suppliers')}
            onEdit={() => handleEditSupplier(selectedSupplier)}
            onDelete={() => handleDeleteSupplier(selectedSupplier._id)}
          />
        )}
        
        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            suppliers={suppliers}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onRefresh={fetchTransactions}
          />
        )}
        
        {activeTab === 'purchase-orders' && (
          <PurchaseOrderList
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            onAddPurchaseOrder={handleAddPurchaseOrder}
            onSelectPO={handlePurchaseOrderSelect}
            onEditPO={handleEditPurchaseOrder}
            onRefresh={fetchPurchaseOrders}
          />
        )}
        
        {activeTab === 'po-details' && selectedPurchaseOrder && (
          <PurchaseOrderDetails
            purchaseOrder={selectedPurchaseOrder}
            onBack={() => setActiveTab('purchase-orders')}
          />
        )}
        
        {activeTab === 'reports' && (
          <SupplierReports
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            transactions={transactions}
            summary={summary}
          />
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;