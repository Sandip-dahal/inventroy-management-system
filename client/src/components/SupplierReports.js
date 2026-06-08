// src/components/SupplierManagement/SupplierReports.js
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const SupplierReports = ({ suppliers, purchaseOrders, transactions, summary }) => {
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeChart, setActiveChart] = useState('bar');
  const [isLoading, setIsLoading] = useState(true);

  // Performance calculation functions - MOVED TO TOP
  const calculateSupplierPerformance = (supplierOrders) => {
    if (!supplierOrders.length) return 0;
    
    // Count different status types
    const statusCounts = {
      received: 0,
      partiallyReceived: 0,
      pending: 0,
      approved: 0,
      cancelled: 0
    };
    
    supplierOrders.forEach(po => {
      const status = po.status?.toLowerCase();
      if (status.includes('received') && !status.includes('partial')) {
        statusCounts.received++;
      } else if (status.includes('partial')) {
        statusCounts.partiallyReceived++;
      } else if (status.includes('pending')) {
        statusCounts.pending++;
      } else if (status.includes('approved')) {
        statusCounts.approved++;
      } else if (status.includes('cancelled')) {
        statusCounts.cancelled++;
      }
    });
    
    // Calculate weights (you can adjust these based on your business needs)
    const weights = {
      received: 1.0,      // Full positive impact
      partiallyReceived: 0.6, // Moderate positive impact
      approved: 0.3,      // Slight positive impact
      pending: 0.1,       // Neutral impact
      cancelled: -0.8     // Strong negative impact
    };
    
    // Calculate raw score
    let rawScore = 0;
    let totalWeight = 0;
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      rawScore += count * weights[status];
      totalWeight += count * Math.abs(weights[status]);
    });
    
    // Normalize score to 0-100 range
    const normalizedScore = totalWeight > 0 
      ? Math.max(0, Math.min(100, (rawScore / totalWeight) * 100))
      : 50; // Default score for no orders
    
    return normalizedScore;
  };

  const calculateAdvancedPerformance = (supplierOrders) => {
    if (!supplierOrders.length) return {
      performanceScore: 50,
      completionRate: 0,
      cancellationRate: 0,
      efficiencyScore: 0,
      reliabilityScore: 0
    };
    
    const totalOrders = supplierOrders.length;
    
    // Calculate basic metrics
    const completedOrders = supplierOrders.filter(po => 
      po.status?.toLowerCase().includes('received') && !po.status?.toLowerCase().includes('partial')
    ).length;
    
    const partiallyCompleted = supplierOrders.filter(po => 
      po.status?.toLowerCase().includes('partial')
    ).length;
    
    const cancelledOrders = supplierOrders.filter(po => 
      po.status?.toLowerCase().includes('cancelled')
    ).length;
    
    // Calculate rates
    const completionRate = (completedOrders / totalOrders) * 100;
    const partialCompletionRate = (partiallyCompleted / totalOrders) * 100;
    const cancellationRate = (cancelledOrders / totalOrders) * 100;
    
    // Calculate delivery efficiency (if delivery data is available)
    let avgDeliveryEfficiency = 0;
    const deliveriesWithData = supplierOrders.filter(po => 
      po.orderDate && po.deliveryDate
    );
    
    if (deliveriesWithData.length > 0) {
      const totalEfficiency = deliveriesWithData.reduce((sum, po) => {
        const orderDate = new Date(po.orderDate);
        const deliveryDate = new Date(po.deliveryDate);
        const expectedDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : 
                            new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Default 14 days
        
        const actualDuration = (deliveryDate - orderDate) / (1000 * 60 * 60 * 24);
        const expectedDuration = (expectedDate - orderDate) / (1000 * 60 * 60 * 24);
        
        return sum + (expectedDuration / Math.max(1, actualDuration));
      }, 0);
      
      avgDeliveryEfficiency = (totalEfficiency / deliveriesWithData.length) * 100;
    }
    
    // Calculate performance score with weighted factors
    const performanceScore = 
      (completionRate * 0.5) + 
      (partialCompletionRate * 0.3) + 
      (avgDeliveryEfficiency * 0.2) - 
      (cancellationRate * 0.8);
    
    return {
      performanceScore: Math.max(0, Math.min(100, performanceScore)),
      completionRate,
      cancellationRate,
      efficiencyScore: avgDeliveryEfficiency,
      reliabilityScore: (completionRate + partialCompletionRate) - cancellationRate
    };
  };

  // Calculate all reports data using useMemo for performance
  const reportsData = useMemo(() => {
    if (!suppliers.length || !purchaseOrders.length) {
      setIsLoading(false);
      return {
        topSuppliers: [],
        outstandingBalances: [],
        monthlyTrends: [],
        paymentPerformance: [],
        categoryData: [],
        supplierPerformance: []
      };
    }

    try {
      // Calculate top suppliers by purchase value using combined approach
      const supplierTotals = {};
      
      // Process purchase orders
      purchaseOrders.forEach(po => {
        // Handle different supplier data structures
        const supplierId = po.supplier?._id || po.supplier;
        if (!supplierId) return;
        
        if (!supplierTotals[supplierId]) {
          supplierTotals[supplierId] = {
            purchaseValue: 0,
            transactionValue: 0,
            combinedValue: 0
          };
        }
        
        // Add purchase order value
        const poValue = po.totalAmount || 0;
        supplierTotals[supplierId].purchaseValue += poValue;
        supplierTotals[supplierId].combinedValue += poValue;
      });
      
      // Process transactions
      transactions.forEach(transaction => {
        // Handle different supplier data structures
        const supplierId = transaction.supplier?._id || transaction.supplier;
        if (!supplierId) return;
        
        if (!supplierTotals[supplierId]) {
          supplierTotals[supplierId] = {
            purchaseValue: 0,
            transactionValue: 0,
            combinedValue: 0
          };
        }
        
        // Add transaction value (only for purchases/payments, not adjustments)
        if (transaction.type === 'Purchase' || transaction.type === 'Payment') {
          const transactionValue = Math.abs(transaction.amount) || 0;
          supplierTotals[supplierId].transactionValue += transactionValue;
          supplierTotals[supplierId].combinedValue += transactionValue;
        }
      });

      const topSuppliersList = Object.entries(supplierTotals)
        .map(([supplierId, totals]) => {
          const supplier = suppliers.find(s => s._id === supplierId);
          return {
            id: supplierId,
            name: supplier ? supplier.name || supplier.companyName : 'Unknown',
            purchaseValue: totals.purchaseValue,
            transactionValue: totals.transactionValue,
            combinedValue: totals.combinedValue,
            contact: supplier ? supplier.contactPerson : 'N/A',
            email: supplier ? supplier.email : 'N/A',
            phone: supplier ? supplier.phone : 'N/A'
          };
        })
        .sort((a, b) => b.combinedValue - a.combinedValue);

      // Calculate outstanding balances
      const balances = {};
      transactions.forEach(transaction => {
        // Handle different supplier data structures
        const supplierId = transaction.supplier?._id || transaction.supplier;
        if (!supplierId) return;
        
        if (!balances[supplierId]) {
          balances[supplierId] = 0;
        }
        balances[supplierId] = transaction.balanceAfter || 0;
      });

      const outstandingList = Object.entries(balances)
        .map(([supplierId, balance]) => {
          const supplier = suppliers.find(s => s._id === supplierId);
          return {
            id: supplierId,
            name: supplier ? supplier.name || supplier.companyName : 'Unknown',
            balance,
            contact: supplier ? supplier.contactPerson : 'N/A',
            phone: supplier ? supplier.phone : 'N/A'
          };
        })
        .filter(item => item.balance !== 0)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

      // Calculate monthly purchase trends with time filter
      const monthlyData = {};
      const now = new Date();
      let cutoffDate = new Date(0); // All time

      if (timeFilter === 'month') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeFilter === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        cutoffDate = new Date(now.getFullYear(), quarter * 3, 1);
      } else if (timeFilter === 'year') {
        cutoffDate = new Date(now.getFullYear(), 0, 1);
      }

      purchaseOrders.forEach(po => {
        const orderDate = new Date(po.orderDate || po.createdAt);
        if (orderDate < cutoffDate && timeFilter !== 'all') return;

        const monthYear = `${orderDate.getMonth() + 1}/${orderDate.getFullYear()}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: monthYear,
            total: 0,
            count: 0
          };
        }
        
        monthlyData[monthYear].total += po.totalAmount || 0;
        monthlyData[monthYear].count += 1;
      });

      const monthlyTrends = Object.values(monthlyData)
        .sort((a, b) => {
          const [aMonth, aYear] = a.month.split('/').map(Number);
          const [bMonth, bYear] = b.month.split('/').map(Number);
          return aYear === bYear ? aMonth - bMonth : aYear - bYear;
        });

      // Calculate payment performance
      const paymentPerformance = suppliers.map(supplier => {
        const supplierTransactions = transactions.filter(t => {
          const transactionSupplierId = t.supplier?._id || t.supplier;
          return transactionSupplierId === supplier._id;
        });
        
        const paidTransactions = supplierTransactions.filter(t => 
          t.type === 'Payment' || t.type === 'Credit'
        );
        
        const onTimePayments = paidTransactions.filter(t => {
          const dueDate = new Date(t.paymentDate || t.transactionDate || t.createdAt);
          const paidDate = new Date(t.transactionDate || t.createdAt);
          return paidDate <= dueDate;
        }).length;

        return {
          id: supplier._id,
          name: supplier.name || supplier.companyName,
          totalTransactions: supplierTransactions.length,
          paidTransactions: paidTransactions.length,
          pendingTransactions: supplierTransactions.length - paidTransactions.length,
          onTimeRate: paidTransactions.length > 0 ? (onTimePayments / paidTransactions.length) * 100 : 0
        };
      }).filter(s => s.totalTransactions > 0)
        .sort((a, b) => b.onTimeRate - a.onTimeRate);

      // Calculate category spending with category filter
      const categorySpending = {};
      purchaseOrders.forEach(po => {
        if (po.items && Array.isArray(po.items)) {
          po.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (categoryFilter !== 'all' && category !== categoryFilter) return;
            
            if (!categorySpending[category]) {
              categorySpending[category] = 0;
            }
            const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
            categorySpending[category] += itemTotal;
          });
        }
      });

      const categoryData = Object.entries(categorySpending)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Supplier performance scorecard
      const supplierPerformance = suppliers.map(supplier => {
        const supplierOrders = purchaseOrders.filter(po => {
          const poSupplierId = po.supplier?._id || po.supplier;
          return poSupplierId === supplier._id;
        });
        
        const totalOrderValue = supplierOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
        
        // Calculate performance metrics
        const performanceMetrics = calculateAdvancedPerformance(supplierOrders);
        const basicPerformanceScore = calculateSupplierPerformance(supplierOrders);
        
        // Calculate delivery metrics
        let avgDeliveryTime = 0;
        let onTimeDeliveryRate = 0;
        
        if (supplierOrders.length > 0) {
          const deliveriesWithData = supplierOrders.filter(po => 
            po.orderDate && po.deliveryDate
          );
          
          if (deliveriesWithData.length > 0) {
            const totalDays = deliveriesWithData.reduce((sum, po) => {
              const orderDate = new Date(po.orderDate);
              const deliveryDate = new Date(po.deliveryDate);
              return sum + Math.max(0, (deliveryDate - orderDate) / (1000 * 60 * 60 * 24));
            }, 0);
            
            avgDeliveryTime = totalDays / deliveriesWithData.length;
            
            // Calculate on-time delivery rate
            const onTimeDeliveries = deliveriesWithData.filter(po => {
              const orderDate = new Date(po.orderDate);
              const deliveryDate = new Date(po.deliveryDate);
              const expectedDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : 
                                  new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000);
              return deliveryDate <= expectedDate;
            }).length;
            
            onTimeDeliveryRate = (onTimeDeliveries / deliveriesWithData.length) * 100;
          }
        }
        
        const qualityIssues = supplierOrders.filter(po => 
          po.status === 'Rejected' || (po.qualityRating && po.qualityRating < 3)
        ).length;

        return {
          id: supplier._id,
          name: supplier.name || supplier.companyName,
          totalOrders: supplierOrders.length,
          totalSpent: totalOrderValue,
          completedOrders: supplierOrders.filter(po => 
            po.status?.toLowerCase().includes('received') && !po.status?.toLowerCase().includes('partial')
          ).length,
          partiallyCompleted: supplierOrders.filter(po => 
            po.status?.toLowerCase().includes('partial')
          ).length,
          cancelledOrders: supplierOrders.filter(po => 
            po.status?.toLowerCase().includes('cancelled')
          ).length,
          performanceScore: performanceMetrics.performanceScore.toFixed(1),
          basicPerformanceScore: basicPerformanceScore.toFixed(1),
          completionRate: performanceMetrics.completionRate.toFixed(1),
          cancellationRate: performanceMetrics.cancellationRate.toFixed(1),
          efficiencyScore: performanceMetrics.efficiencyScore.toFixed(1),
          avgDeliveryTime: avgDeliveryTime.toFixed(1),
          onTimeDeliveryRate: onTimeDeliveryRate.toFixed(1),
          qualityScore: supplierOrders.length > 0 
            ? ((supplierOrders.length - qualityIssues) / supplierOrders.length) * 100 
            : 100
        };
      }).filter(s => s.totalOrders > 0)
        .sort((a, b) => b.performanceScore - a.performanceScore);

      setIsLoading(false);
      return {
        topSuppliers: topSuppliersList,
        outstandingBalances: outstandingList,
        monthlyTrends,
        paymentPerformance,
        categoryData,
        supplierPerformance
      };
    } catch (error) {
      console.error('Error calculating reports data:', error);
      setIsLoading(false);
      return {
        topSuppliers: [],
        outstandingBalances: [],
        monthlyTrends: [],
        paymentPerformance: [],
        categoryData: [],
        supplierPerformance: []
      };
    }
  }, [suppliers, purchaseOrders, transactions, timeFilter, categoryFilter]);

  // Colors for charts
  const COLORS = ['#4361ee', '#4cc9f0', '#4895ef', '#3a0ca3', '#7209b7', '#f72585', '#b5179e'];

  // Handle export functionality
  const handleExport = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(row => Object.values(row).join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="supplier-reports">
        <div className="loading">Loading reports data...</div>
      </div>
    );
  }

  return (
    <div className="supplier-reports">
      <div className="reports-header">
        <h2>Supplier Analytics & Reports</h2>
        <div className="report-filters">
          <div className="filter-group">
            <label>Time Period:</label>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Category:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Finished Goods">Finished Goods</option>
              <option value="Services">Services</option>
              <option value="Uncategorized">Uncategorized</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Chart Type:</label>
            <div className="chart-toggle">
              <button 
                className={activeChart === 'bar' ? 'active' : ''} 
                onClick={() => setActiveChart('bar')}
              >
                Bar
              </button>
              <button 
                className={activeChart === 'line' ? 'active' : ''} 
                onClick={() => setActiveChart('line')}
              >
                Line
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="reports-dashboard">
        {/* Summary Cards */}
        <div className="reports-summary-cards">
          <div className="summary-card">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <h3>Total Spend</h3>
              <p>NPR {reportsData.topSuppliers.reduce((sum, s) => sum + s.combinedValue, 0).toLocaleString('en-NP')}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h3>Active Suppliers</h3>
              <p>{reportsData.topSuppliers.length}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">⚖️</div>
            <div className="card-content">
              <h3>Outstanding Balance</h3>
              <p>NPR {reportsData.outstandingBalances.reduce((sum, s) => sum + Math.abs(s.balance), 0).toLocaleString('en-NP')}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h3>Avg. On-Time Payment</h3>
              <p>{reportsData.paymentPerformance.length > 0 
                ? (reportsData.paymentPerformance.reduce((sum, s) => sum + s.onTimeRate, 0) / reportsData.paymentPerformance.length).toFixed(1) + '%' 
                : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-container large">
            <h3>Monthly Purchase Trends</h3>
            {reportsData.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {activeChart === 'bar' ? (
                  <BarChart data={reportsData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`NPR ${value.toLocaleString('en-NP')}`, 'Amount']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#4361ee" name="Total Amount" />
                  </BarChart>
                ) : (
                  <LineChart data={reportsData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`NPR ${value.toLocaleString('en-NP')}`, 'Amount']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#4361ee" 
                      name="Total Amount" 
                      strokeWidth={2} 
                      dot={{ fill: '#4361ee', strokeWidth: 2, r: 4 }} 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No purchase data available for the selected filters</div>
            )}
          </div>

          <div className="chart-container">
            <h3>Spending by Category</h3>
            {reportsData.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={reportsData.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportsData.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`NPR ${value.toLocaleString('en-NP')}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>
        </div>

        {/* Detailed Reports Section */}
        <div className="detailed-reports">
          {/* Top Suppliers Report */}
          <div className="report-card expanded">
            <div className="report-header">
              <h3>Top Suppliers by Combined Purchase Value</h3>
              <button 
                className="export-btn"
                onClick={() => handleExport(
                  reportsData.topSuppliers.map(s => ({
                    Rank: reportsData.topSuppliers.indexOf(s) + 1,
                    Supplier: s.name,
                    'Contact Person': s.contact,
                    Email: s.email,
                    'Purchase Order Value': s.purchaseValue,
                    'Transaction Value': s.transactionValue,
                    'Combined Value': s.combinedValue,
                    'Percentage of Total': ((s.combinedValue / reportsData.topSuppliers.reduce((sum, s) => sum + s.combinedValue, 0)) * 100).toFixed(1) + '%'
                  })),
                  'top-suppliers-report'
                )}
              >
                Export CSV
              </button>
            </div>
            <div className="report-content">
              {reportsData.topSuppliers.length > 0 ? (
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Supplier</th>
                        <th>Contact Person</th>
                        <th>Email</th>
                        <th>PO Value</th>
                        <th>Transaction Value</th>
                        <th>Combined Value</th>
                        <th>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.topSuppliers.slice(0, 10).map((supplier, index) => {
                        const totalSpend = reportsData.topSuppliers.reduce((sum, s) => sum + s.combinedValue, 0);
                        const percentage = totalSpend > 0 ? ((supplier.combinedValue / totalSpend) * 100).toFixed(1) : 0;
                        
                        return (
                          <tr key={supplier.id}>
                            <td>{index + 1}</td>
                            <td className="supplier-name">{supplier.name}</td>
                            <td>{supplier.contact}</td>
                            <td>{supplier.email}</td>
                            <td className="amount">NPR {supplier.purchaseValue.toLocaleString('en-NP')}</td>
                            <td className="amount">NPR {supplier.transactionValue.toLocaleString('en-NP')}</td>
                            <td className="amount">NPR {supplier.combinedValue.toLocaleString('en-NP')}</td>
                            <td>
                              <div className="percentage-bar">
                                <div 
                                  className="bar-fill" 
                                  style={{width: `${percentage}%`}}
                                ></div>
                                <span>{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No supplier data available</div>
              )}
            </div>
          </div>

          {/* Outstanding Balances Report */}
          <div className="report-card expanded">
            <div className="report-header">
              <h3>Outstanding Balances</h3>
              <button 
                className="export-btn"
                onClick={() => handleExport(
                  reportsData.outstandingBalances.map(item => ({
                    Supplier: item.name,
                    Contact: item.phone,
                    'Balance Type': item.balance > 0 ? 'Payable' : 'Receivable',
                    Amount: Math.abs(item.balance),
                    Status: Math.abs(item.balance) > 100000 ? 'Action Needed' : 'Monitor'
                  })),
                  'outstanding-balances-report'
                )}
              >
                Export CSV
              </button>
            </div>
            <div className="report-content">
              {reportsData.outstandingBalances.length > 0 ? (
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Contact</th>
                        <th>Balance Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.outstandingBalances.map((item, index) => (
                        <tr key={index}>
                          <td className="supplier-name">{item.name}</td>
                          <td>{item.phone}</td>
                          <td>
                            <span className={`badge ${item.balance > 0 ? 'badge-danger' : 'badge-success'}`}>
                              {item.balance > 0 ? 'Payable' : 'Receivable'}
                            </span>
                          </td>
                          <td className={`amount ${item.balance > 0 ? 'text-danger' : 'text-success'}`}>
                            NPR {Math.abs(item.balance).toLocaleString('en-NP')}
                          </td>
                          <td>
                            <span className={`status ${Math.abs(item.balance) > 100000 ? 'urgent' : 'normal'}`}>
                              {Math.abs(item.balance) > 100000 ? 'Action Needed' : 'Monitor'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No outstanding balances</div>
              )}
            </div>
          </div>

          {/* Supplier Performance Report */}
          <div className="report-card expanded">
            <div className="report-header">
              <h3>Supplier Performance Scorecard</h3>
              <button 
                className="export-btn"
                onClick={() => handleExport(
                  reportsData.supplierPerformance.map(supplier => ({
                    Supplier: supplier.name,
                    'Total Orders': supplier.totalOrders,
                    'Completed Orders': supplier.completedOrders,
                    'Partially Completed': supplier.partiallyCompleted,
                    'Cancelled Orders': supplier.cancelledOrders,
                    'Completion Rate': supplier.completionRate + '%',
                    'Cancellation Rate': supplier.cancellationRate + '%',
                    'Performance Score': supplier.performanceScore,
                    'Avg Delivery Time': supplier.avgDeliveryTime + ' days',
                    'On-Time Delivery': supplier.onTimeDeliveryRate + '%',
                    'Quality Score': supplier.qualityScore.toFixed(1) + '%',
                    'Performance Rating': supplier.performanceScore >= 80 ? 'Excellent' : 
                                        supplier.performanceScore >= 60 ? 'Good' : 
                                        supplier.performanceScore >= 40 ? 'Average' : 'Poor'
                  })),
                  'supplier-performance-report'
                )}
              >
                Export CSV
              </button>
            </div>
            <div className="report-content">
              {reportsData.supplierPerformance.length > 0 ? (
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Total Orders</th>
                        <th>Completed</th>
                        <th>Partial</th>
                        <th>Cancelled</th>
                        <th>Completion Rate</th>
                        <th>Performance Score</th>
                        <th>Avg Delivery</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.supplierPerformance.map((supplier, index) => {
                        const getPerformanceColor = (score) => {
                          if (score >= 80) return '#28a745';
                          if (score >= 60) return '#ffc107';
                          if (score >= 40) return '#fd7e14';
                          return '#dc3545';
                        };
                        
                        const getPerformanceText = (score) => {
                          if (score >= 80) return 'Excellent';
                          if (score >= 60) return 'Good';
                          if (score >= 40) return 'Average';
                          return 'Poor';
                        };
                        
                        return (
                          <tr key={supplier.id}>
                            <td className="supplier-name">{supplier.name}</td>
                            <td>{supplier.totalOrders}</td>
                            <td className="text-success">{supplier.completedOrders}</td>
                            <td className="text-warning">{supplier.partiallyCompleted}</td>
                            <td className="text-danger">{supplier.cancelledOrders}</td>
                            <td>
                              <div className="score-bar">
                                <div 
                                  className="score-fill" 
                                  style={{
                                    width: `${supplier.completionRate}%`,
                                    backgroundColor: getPerformanceColor(supplier.completionRate)
                                  }}
                                ></div>
                                <span>{supplier.completionRate}%</span>
                              </div>
                            </td>
                            <td>
                              <div className="score-bar">
                                <div 
                                  className="score-fill" 
                                  style={{
                                    width: `${supplier.performanceScore}%`,
                                    backgroundColor: getPerformanceColor(supplier.performanceScore)
                                  }}
                                ></div>
                                <span>{supplier.performanceScore}</span>
                              </div>
                            </td>
                            <td>{supplier.avgDeliveryTime} days</td>
                            <td>
                              <span 
                                className="performance-rating"
                                style={{
                                  backgroundColor: getPerformanceColor(supplier.performanceScore),
                                  color: supplier.performanceScore >= 60 ? 'white' : '#212529'
                                }}
                              >
                                {getPerformanceText(supplier.performanceScore)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No supplier performance data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierReports;