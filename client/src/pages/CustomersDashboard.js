import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingAPI } from '../services/api';
import '../styles/CustomerDashboard.css';

const CustomerDashboard = () => {
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedBill, setSelectedBill] = useState(null);
  const [splitPayment, setSplitPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('customers');

  const navigate = useNavigate();

  // Fetch credit customers data
  useEffect(() => {
    fetchCreditCustomers();
  }, []);

  const fetchCreditCustomers = async () => {
    try {
      setLoading(true);
      const response = await billingAPI.getCreditCustomers();
      
      if (response.success) {
        const filtered = response.customers
          .map(customer => ({
            ...customer,
            bills: customer.bills.filter(bill => 
              bill.payment?.outstandingAmount > 0 // Only include bills with outstanding amount > 0
            )
          }))
          .filter(customer => 
            customer.totalDue > 0 && customer.bills.length > 0 // Only include customers with outstanding bills
          );
        setCreditCustomers(filtered);
        setFilteredCustomers(filtered);
      }
    } catch (error) {
      console.error('Error fetching credit customers:', error);
      await fetchCreditCustomersFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditCustomersFallback = async () => {
    try {
      const response = await billingAPI.getBills(1, 1000);
      if (response.success) {
        const creditBills = response.bills.filter(bill => 
          bill.payment?.methods?.some(method => method.method === 'credit') && 
          bill.customer && 
          bill.customer.phone && 
          bill.payment?.outstandingAmount > 0 // Only include bills with outstanding amount > 0
        );
        
        const customersMap = new Map();
        
        creditBills.forEach(bill => {
          const customerKey = bill.customer.phone;
          
          if (!customersMap.has(customerKey)) {
            customersMap.set(customerKey, {
              ...bill.customer,
              bills: [],
              totalDue: 0
            });
          }
          
          const customer = customersMap.get(customerKey);
          const outstandingAmount = bill.payment.outstandingAmount;
          
          customer.bills.push({
            ...bill,
            outstandingAmount: outstandingAmount
          });
          customer.totalDue += outstandingAmount;
        });
        
        const customers = Array.from(customersMap.values()).filter(customer => 
          customer.totalDue > 0 && customer.bills.length > 0 // Only include customers with outstanding bills
        );
        setCreditCustomers(customers);
        setFilteredCustomers(customers);
      }
    } catch (error) {
      console.error('Error in fallback fetch:', error);
    }
  };

  // Handle search filtering
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    const filtered = creditCustomers.filter(customer => 
      customer.name?.toLowerCase().includes(term) || 
      customer.phone?.toLowerCase().includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilteredCustomers(creditCustomers);
  };

  const handlePayment = (customer, bill = null) => {
    setSelectedCustomer(customer);
    setSelectedBill(bill);
    const amountDue = bill ? bill.payment.outstandingAmount : customer.totalDue;
    setPaymentAmount(amountDue);
    setPaymentModal(true);
    setSplitPayment(false);
  };

  const processPayment = async () => {
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const dueAmount = selectedBill ? getOutstandingAmount(selectedBill) : selectedCustomer.totalDue;
    
    if (!splitPayment && paymentAmount !== dueAmount) {
      alert('For full payment, amount must equal the total due. Enable split payment for partial amounts.');
      return;
    }

    if (paymentAmount > dueAmount) {
      alert('Payment amount cannot exceed the due amount.');
      return;
    }

    setProcessing(true);
    try {
      const paymentData = {
        customerPhone: selectedCustomer.phone,
        payments: [{
          method: paymentMethod,
          amount: paymentAmount,
          transactionId: ''
        }],
        isSplitPayment: splitPayment
      };

      if (selectedBill) {
        paymentData.billId = selectedBill._id;
      }

      const response = await billingAPI.processCreditPayment(paymentData);
      
      if (response.success) {
        alert(`Payment of Rs. ${paymentAmount.toLocaleString()} processed successfully!`);
        setPaymentModal(false);
        setPaymentAmount(0);
        setPaymentMethod('cash');
        setSplitPayment(false);
        await fetchCreditCustomers();
      } else {
        throw new Error(response.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      alert(`Payment failed: ${error.message || 'An error occurred while processing the payment'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'credit': return '#ff6b6b';
      case 'cash': return '#51cf66';
      case 'card': return '#339af0';
      case 'ewallet': return '#cc5de8';
      case 'split': return '#f1c40f';
      default: return '#868e96';
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'credit': return 'Credit (बाकी)';
      case 'cash': return 'Cash (नगद)';
      case 'card': return 'Card (कार्ड)';
      case 'ewallet': return 'E-Wallet (ई-वालेट)';
      case 'split': return 'Split Payment (आंशिक भुक्तानी)';
      default: return method;
    }
  };

  const getOutstandingAmount = (bill) => {
    return bill.payment.outstandingAmount !== undefined ? bill.payment.outstandingAmount : bill.total;
  };

  if (loading) {
    return (
      <div className="customer-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading customer data...</p>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {/* Navigation and other UI components remain unchanged */}
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button 
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              color: activeView === 'overview' ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              borderBottom: activeView === 'overview' ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={() => {
              setActiveView('overview');
              navigate('/retaildashboard');
            }}
            onMouseOver={(e) => {
              if (activeView !== 'overview') {
                e.currentTarget.style.color = '#3b82f6';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (activeView !== 'overview') {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Overview
          </button>
          <button 
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              color: activeView === 'sales' ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              borderBottom: activeView === 'sales' ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={() => {
              setActiveView('sales');
              navigate('/salesdashboard');
            }}
            onMouseOver={(e) => {
              if (activeView !== 'sales') {
                e.currentTarget.style.color = '#3b82f6';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (activeView !== 'sales') {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Sales
          </button>
          <button 
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              color: activeView === 'customers' ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              borderBottom: activeView === 'customers' ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={() => {
              setActiveView('customers');
              navigate('/customersdashboard');
            }}
            onMouseOver={(e) => {
              if (activeView !== 'customers') {
                e.currentTarget.style.color = '#3b82f6';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (activeView !== 'customers') {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'none';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8517 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Customers
          </button>
        </div>
      </nav>

      {/* Header Section */}
      <div className="dashboard-header">
        <h1>🧔 Outstanding Dues Management</h1>
        <p>Manage customer credit payments and outstanding balances</p>
        <div className="header-stats">
          <span>Total Credit Customers: <strong>{creditCustomers.length}</strong></span>
          <span>Total Outstanding: <strong>Rs. {creditCustomers.reduce((sum, customer) => sum + customer.totalDue, 0).toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>Total Credit Customers</h3>
            <p className="card-value">{creditCustomers.length}</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Total Outstanding</h3>
            <p className="card-value">
              Rs. {creditCustomers.reduce((sum, customer) => sum + customer.totalDue, 0).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>Pending Bills</h3>
            <p className="card-value">
              {creditCustomers.reduce((sum, customer) => sum + customer.bills.length, 0)}
            </p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">⏰</div>
          <div className="card-content">
            <h3>Oldest Due</h3>
            <p className="card-value">
              {creditCustomers.length > 0 ? 
                new Date(Math.min(...creditCustomers.flatMap(c => c.bills.map(b => new Date(b.createdAt)))))
                  .toLocaleDateString('ne-NP') : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="customers-section">
        <div className="section-header">
          <h2>Credit Customers List</h2>
          <div className="filter-controls">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="clear-search-btn">
                Clear
              </button>
            )}
            <button onClick={fetchCreditCustomers} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {filteredCustomers.length === 0 ? (
          <div className="no-customers">
            <div className="no-customers-icon">🎉</div>
            <h3>{searchTerm ? 'No Matching Customers' : 'No Outstanding Dues'}</h3>
            <p>{searchTerm ? 'No customers match your search criteria.' : 'All customers have cleared their payments!'}</p>
          </div>
        ) : (
          filteredCustomers.map((customer, index) => (
            <div key={customer.phone || index} className="customer-card">
              <div className="customer-header">
                <div className="customer-info">
                  <h3>{customer.name || 'Unknown Customer'}</h3>
                  <p>📞 {customer.phone}</p>
                  <span className="total-due">Total Due: Rs. {customer.totalDue.toLocaleString()}</span>
                </div>
                <button 
                  className="pay-all-btn"
                  onClick={() => handlePayment(customer)}
                >
                  Pay All Bills
                </button>
              </div>

              {/* Customer's Bills */}
              <div className="bills-list">
                {customer.bills.map((bill, billIndex) => (
                  <div key={bill._id || billIndex} className="bill-item">
                    <div className="bill-header">
                      <div className="bill-info">
                        <span className="bill-number">Bill #: {bill.billNumber}</span>
                        <span className="bill-date">Date: {new Date(bill.createdAt).toLocaleDateString('ne-NP')}</span>
                        <span className="payment-status" style={{ color: getPaymentMethodColor(bill.payment.type === 'split' ? 'split' : bill.payment.methods[0]?.method) }}>
                          {bill.payment.type === 'split' ? 'Split Payment' : getPaymentMethodLabel(bill.payment.methods[0]?.method || 'credit')}
                        </span>
                        {bill.payment.totalPaid > 0 && (
                          <span className="partial-payment">
                            Paid: Rs. {bill.payment.totalPaid.toLocaleString()}
                          </span>
                        )}
                        {bill.payment.outstandingAmount > 0 && (
                          <span className="outstanding-amount">
                            Outstanding: Rs. {bill.payment.outstandingAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="bill-actions">
                        <button 
                          className="pay-btn"
                          onClick={() => handlePayment(customer, bill)}
                        >
                          {bill.payment.outstandingAmount < bill.total ? 'Pay Balance' : 'Pay Bill'}
                        </button>
                      </div>
                    </div>

                    {/* Display Payment Methods for Split Payments */}
                    {bill.payment.type === 'split' && bill.payment.methods.length > 0 && (
                      <div className="payment-methods-list">
                        <h4>Payment Methods:</h4>
                        {bill.payment.methods.map((method, methodIndex) => (
                          <div key={methodIndex} className="payment-method-item">
                            <span style={{ color: getPaymentMethodColor(method.method) }}>
                              {getPaymentMethodLabel(method.method)}: Rs. {method.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Products in this bill */}
                    <div className="products-list">
                      <h4>Products Purchased:</h4>
                      {bill.items && bill.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="product-item">
                          <span className="product-name">{item.name}</span>
                          <span className="product-details">
                            Qty: {item.quantity} 
                            {item.size && ` | Size: ${item.size}`}
                            {item.color && ` | Color: ${item.color}`}
                          </span>
                          <span className="product-price">Rs. {item.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bill-footer">
                      <div className="bill-total">
                        <div>
                          <span>Total Amount: </span>
                          <span className="amount">Rs. {bill.total.toLocaleString()}</span>
                        </div>
                        {bill.payment.outstandingAmount !== bill.total && (
                          <div>
                            <span>Outstanding: </span>
                            <span className="remaining-amount">Rs. {bill.payment.outstandingAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h3>Process Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-content">
              <div className="payment-info">
                <p><strong>Customer:</strong> {selectedCustomer?.name || 'Unknown Customer'}</p>
                <p><strong>Phone:</strong> {selectedCustomer?.phone}</p>
                {selectedBill && (
                  <>
                    <p><strong>Bill #:</strong> {selectedBill.billNumber}</p>
                    <p><strong>Original Amount:</strong> Rs. {selectedBill.total.toLocaleString()}</p>
                    <p><strong>Outstanding Amount:</strong> Rs. {getOutstandingAmount(selectedBill).toLocaleString()}</p>
                  </>
                )}
                {!selectedBill && (
                  <p><strong>Total Due:</strong> Rs. {selectedCustomer?.totalDue.toLocaleString()}</p>
                )}
              </div>

              <div className="payment-options">
                <div className="form-group">
                  <label>Payment Amount (Rs.):</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const maxAmount = selectedBill ? getOutstandingAmount(selectedBill) : selectedCustomer?.totalDue;
                      // Restrict input to not exceed the outstanding amount
                      if (value <= maxAmount) {
                        setPaymentAmount(value);
                      } else {
                        setPaymentAmount(maxAmount);
                      }
                    }}
                    className="amount-input"
                    min="0"
                    max={selectedBill ? getOutstandingAmount(selectedBill) : selectedCustomer?.totalDue}
                    step="0.01"
                    readOnly={!splitPayment && selectedBill}
                  />
                  <small>Enter amount to pay (max: Rs. {(selectedBill ? getOutstandingAmount(selectedBill) : selectedCustomer?.totalDue).toLocaleString()})</small>
                </div>

                <div className="form-group">
                  <label>Payment Method:</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="method-select"
                  >
                    <option value="cash">Cash (नगद)</option>
                    <option value="card">Card (कार्ड)</option>
                    <option value="ewallet">E-Wallet (ई-वालेट)</option>
                  </select>
                </div>

                {selectedBill && getOutstandingAmount(selectedBill) > 0 && (
                  <div className="form-group" style={{backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px'}}>
                    <label className="checkbox-label" style={{fontWeight: 'bold', fontSize: '1.1em'}}>
                      <input
                        type="checkbox"
                        checked={splitPayment}
                        onChange={(e) => {
                          setSplitPayment(e.target.checked);
                          if (!e.target.checked) {
                            setPaymentAmount(getOutstandingAmount(selectedBill));
                          }
                        }}
                      />
                      Split Payment (आंशिक भुक्तानी)
                    </label>
                    <small>Allow partial payment</small>
                  </div>
                )}

                {splitPayment && (
                  <div className="split-payment-info">
                    <p>💡 Customer can pay partial amount. Remaining balance will stay as credit.</p>
                    <p>आंशिक रकम तिर्न सकिन्छ। बाँकी रकम बाकीको रूपमा रहनेछ।</p>
                  </div>
                )}

                {paymentAmount > 0 && (
                  <div className="payment-summary">
                    <h4>Payment Summary:</h4>
                    <p>Amount to pay: <strong>Rs. {paymentAmount.toLocaleString()}</strong></p>
                    {selectedBill && paymentAmount < getOutstandingAmount(selectedBill) && (
                      <p>Remaining balance: <strong>Rs. {(getOutstandingAmount(selectedBill) - paymentAmount).toLocaleString()}</strong></p>
                    )}
                    <p>Method: <strong>{getPaymentMethodLabel(paymentMethod)}</strong></p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setPaymentModal(false)} className="cancel-btn" disabled={processing}>
                Cancel (रद्द गर्नुहोस्)
              </button>
              <button 
                onClick={processPayment} 
                className="confirm-btn"
                disabled={paymentAmount <= 0 || processing}
              >
                {processing ? 'Processing...' : 'Process Payment (भुक्तानी प्रक्रिया गर्नुहोस्)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;