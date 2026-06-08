import React, { useState, useEffect } from 'react';
import { billingAPI } from '../services/api';
import '../styles/FinanceQuickStats.css';

const FinanceQuickStats = () => {
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTodayProfit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingAPI.getTodayProfit();
      if (response.success) {
        setProfitData(response.profitData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch profit data');
      console.error('Error fetching profit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    billingAPI.clearProfitCache();
    fetchTodayProfit();
  };

  useEffect(() => {
    fetchTodayProfit();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchTodayProfit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !profitData) {
    return (
      <div className="finance-quick-stats">
        <div className="stat-card">
          <div className="stats-header">
            <h3>Today's Profit Estimate</h3>
            <button className="refresh-btn" disabled>
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="loading-state">Loading profit data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-quick-stats">
      <div className="stat-card">
        <div className="stats-header">
          <h3>Today's Profit Estimate</h3>
          <button 
            onClick={handleRefresh} 
            className="refresh-btn"
            disabled={loading}
            title="Refresh data"
          >
            <i className={`fas fa-sync-alt ${loading ? 'spinning' : ''}`}></i>
          </button>
        </div>

        {error && (
          <div className="error-state">
            <span className="error-text">Error: {error}</span>
            <button onClick={handleRefresh} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {profitData && (
          <>
            <div className="profit-summary">
              <div className="summary-item net-profit">
                <span className="summary-label">Net Profit</span>
                <span className={`summary-value ${profitData.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                  Rs. {profitData.totalProfit.toLocaleString()}
                </span>
              </div>
              <div className="summary-item margin">
                <span className="summary-label">Profit Margin</span>
                <span className="summary-value">{profitData.profitMargin}%</span>
              </div>
            </div>

            <div className="profit-details">
              <div className="detail-item">
                <span className="detail-label">Total Revenue:</span>
                <span className="detail-value">Rs. {profitData.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Cost:</span>
                <span className="detail-value">Rs. {profitData.totalCost.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Items Sold:</span>
                <span className="detail-value">{profitData.itemsSold}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Bills Processed:</span>
                <span className="detail-value">{profitData.billsCount}</span>
              </div>
            </div>
          </>
        )}

        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceQuickStats;