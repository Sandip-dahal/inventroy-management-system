import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { billingAPI, staffAPI } from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend
);

// Utility to debounce a function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: '1rem'
  }}>
    <div style={{
      position: 'relative',
      width: '60px',
      height: '60px'
    }}>
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '3px solid transparent',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '3px solid transparent',
        borderTop: '3px solid #10b981',
        borderRadius: '50%',
        animation: 'spin 1.5s linear infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '3px solid transparent',
        borderTop: '3px solid #f59e0b',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '20px',
        height: '20px',
        background: '#3b82f6',
        borderRadius: '50%'
      }}></div>
    </div>
    <p style={{ margin: 0, color: '#1f2937' }}>Loading sales data...</p>
  </div>
);

// Error component
const ErrorMessage = ({ error, onRetry }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: '1rem',
    textAlign: 'center',
    padding: '2rem'
  }}>
    <div style={{ marginBottom: '1rem' }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#e74c3c" strokeWidth="2"/>
        <path d="M12 8V12" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 16H12.01" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>Something went wrong</h3>
    <p style={{ margin: 0, color: '#1f2937' }}>{error}</p>
    <button onClick={onRetry} style={{
      padding: '0.75rem 1.5rem',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: 500,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
    onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
    >
      <span>Try Again</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, change, previousValue, comparisonLabel, type, icon }) => {
  const isPositive = change >= 0;
  const changeType = type === 'expenses' ? !isPositive : isPositive;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      style={{
        background: '#ffffff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderLeft: `4px solid ${type === 'sales' ? '#10b981' : type === 'profit' ? '#3b82f6' : '#ef4444'}`,
        position: 'relative',
        overflow: 'hidden'
      }}
      className={isHovered ? 'metric-card-hovered' : ''}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style>{`
        .metric-card-hovered::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          opacity: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: type === 'sales' ? 'rgba(16, 185, 129, 0.1)' : type === 'profit' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: type === 'sales' ? '#10b981' : type === 'profit' ? '#3b82f6' : '#ef4444'
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '0.25rem'
          }}>{title}</h3>
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: changeType ? '#d1fae5' : '#fee2e2',
            color: changeType ? '#065f46' : '#991b1b'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d={changeType ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} stroke="currentColor" strokeWidth="2"/>
            </svg>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: '0.5rem'
      }}>
        {new Intl.NumberFormat('ne-NP', {
          style: 'currency',
          currency: 'NPR',
          minimumFractionDigits: 0,
        }).format(value || 0)}
      </div>
      <div style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '1rem'
      }}>
        vs {new Intl.NumberFormat('ne-NP', {
          style: 'currency',
          currency: 'NPR',
          minimumFractionDigits: 0,
        }).format(previousValue || 0)} ({comparisonLabel})
      </div>
      <div style={{
        height: '4px',
        background: '#f3f4f6',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div 
          style={{
            width: `${Math.min(Math.abs(change), 100)}%`,
            height: '100%',
            borderRadius: '2px',
            backgroundColor: changeType ? '#10b981' : '#ef4444',
            transition: 'width 1s ease-in-out'
          }}
        ></div>
      </div>
    </div>
  );
};

const SalesDashboard = () => {
  // State management
  const [timeRange, setTimeRange] = useState('day');
  const [comparisonType, setComparisonType] = useState('previous');
  const [customDate, setCustomDate] = useState('');
  const [salesData, setSalesData] = useState({
    current: null,
    previous: null,
    custom: null,
  });
  const [totalMonthlySalary, setTotalMonthlySalary] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('sales');
  const [isDataLoading, setIsDataLoading] = useState(false); // Prevent concurrent loads

  // Navigation and location hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Get current year, month, date in Nepal timezone
  const getCurrentNepalDate = () => {
    const now = new Date();
    const offset = 5.75 * 60 * 60 * 1000;
    const nepalTime = new Date(now.getTime() + offset);
    return {
      year: nepalTime.getUTCFullYear(),
      month: nepalTime.getUTCFullYear() + '-' + String(nepalTime.getUTCMonth() + 1).padStart(2, '0'),
      day: nepalTime.toISOString().split('T')[0],
    };
  };

  const currentNepalDate = useMemo(() => getCurrentNepalDate(), []);

  // Generate years for dropdown (2000 to currentYear - 1)
  const availableYears = useMemo(() =>
    Array.from({ length: currentNepalDate.year - 2000 }, (_, i) => currentNepalDate.year - 1 - i),
    [currentNepalDate.year]
  );

  // Icons for metric cards
  const metricIcons = useMemo(() => ({
    sales: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 22H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M5 6H19C19.5304 6 20.0391 6.21071 20.4142 6.58579C20.7893 6.96086 21 7.46957 21 8V18C21 18.5304 20.7893 19.0391 20.4142 19.4142C20.0391 19.7893 19.5304 20 19 20H5C4.46957 20 3.96086 19.7893 3.58579 19.4142C3.21071 19.0391 3 18.5304 3 18V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 6L12 12L21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    profit: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 20V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    expenses: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L20 7.5V16.5L12 22L4 16.5V7.5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L20 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L4 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L4 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L20 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }), []);

  // Date calculation functions
  const getDateRange = useCallback((range) => {
    const now = new Date();
    const offset = 5.75 * 60 * 60 * 1000;
    const nepalTime = new Date(now.getTime() + offset);
    
    const start = new Date(nepalTime);
    const end = new Date(nepalTime);

    switch (range) {
      case 'day':
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      case 'month':
        start.setUTCDate(1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCMonth(end.getUTCMonth() + 1, 0);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      case 'year':
        start.setUTCMonth(0, 1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCMonth(11, 31);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      default:
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
    }
  }, []);

  const getPreviousDateRange = useCallback((range) => {
    const now = new Date();
    const offset = 5.75 * 60 * 60 * 1000;
    const nepalTime = new Date(now.getTime() + offset);
    
    const start = new Date(nepalTime);
    const end = new Date(nepalTime);

    switch (range) {
      case 'day':
        start.setUTCDate(nepalTime.getUTCDate() - 1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCDate(nepalTime.getUTCDate() - 1);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      case 'month':
        start.setUTCMonth(nepalTime.getUTCMonth() - 1, 1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCMonth(nepalTime.getUTCMonth(), 0);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      case 'year':
        start.setUTCFullYear(nepalTime.getUTCFullYear() - 1, 0, 1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCFullYear(nepalTime.getUTCFullYear() - 1, 11, 31);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
      default:
        start.setUTCDate(nepalTime.getUTCDate() - 1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCDate(nepalTime.getUTCDate() - 1);
        end.setUTCHours(23, 59, 59, 999);
        return { start, end };
    }
  }, []);

  // Prorate salary based on time range
  const getProratedSalary = useCallback((timeRange, totalMonthlySalary) => {
    if (totalMonthlySalary === 0) return 0;
    switch (timeRange) {
      case 'day':
        const year = currentNepalDate.year;
        const monthIndex = parseInt(currentNepalDate.month.split('-')[1]) - 1;
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        return totalMonthlySalary / daysInMonth;
      case 'month':
        return totalMonthlySalary;
      case 'year':
        return totalMonthlySalary * 12;
      default:
        return 0;
    }
  }, [currentNepalDate]);

  // Fetch function with dynamic data
  const fetchSalesData = useCallback(async (startDate, endDate, rangeType) => {
    try {
      billingAPI.clearProfitCache();

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      console.log(`Fetching ${rangeType} data for ${timeRange}:`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startLocal: startDate.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
        endLocal: endDate.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
      });
      console.log(`Calling getProfitByDateRange for ${rangeType}: ${startDateStr} to ${endDateStr}`);
      const response = await billingAPI.getProfitByDateRange(startDateStr, endDateStr);
      console.log(`API Response for ${rangeType} (getProfitByDateRange):`, response);

      if (
        response.success &&
        response.profitData &&
        typeof response.profitData.totalRevenue === 'number' &&
        typeof response.profitData.totalCost === 'number'
      ) {
        const sales = response.profitData.totalRevenue;
        const costOfGoods = response.profitData.totalCost;
        const operatingExpenses = getProratedSalary(timeRange, totalMonthlySalary);
        const totalExpenses = costOfGoods + operatingExpenses;
        const profit = sales - totalExpenses;
        return {
          sales,
          expenses: totalExpenses,
          profit,
          costOfGoods,
          operatingExpenses,
          rangeType,
        };
      }
      const errorDetails = {
        success: response.success,
        profitDataExists: !!response.profitData,
        totalRevenue: response.profitData?.totalRevenue,
        totalCost: response.profitData?.totalCost,
      };
      console.error(`Invalid ${rangeType} sales data:`, errorDetails);
      throw new Error(
        `Invalid ${rangeType} sales data: ${
          !response.success
            ? 'API request failed'
            : !response.profitData
            ? 'No profit data returned'
            : 'Invalid totalRevenue or totalCost'
        }`
      );
    } catch (err) {
      console.error(`Error fetching ${rangeType} sales data:`, err.message, err.stack);
      setError(
        `Failed to fetch ${rangeType} data: ${
          err.message.includes('not a function')
            ? 'API method not found. Please contact support.'
            : err.message.includes('Invalid')
            ? 'Invalid data received from API. Please check the date range.'
            : 'Server error. Please try again.'
        }`
      );
      return {
        sales: 0,
        expenses: 0,
        profit: 0,
        costOfGoods: 0,
        operatingExpenses: 0,
        rangeType,
      };
    }
  }, [timeRange, totalMonthlySalary, getProratedSalary]);

  // Debounced input handler
  const handleCustomDateChange = useCallback(
    debounce((value) => {
      if (value) {
        setCustomDate(value);
      }
    }, 300),
    []
  );

  // Load data function body (debounced via ref)
  const createLoadData = useCallback((debouncedFunc) => {
    return async () => {
      if (isDataLoading) return; // Prevent concurrent calls
      try {
        setIsDataLoading(true);
        setError(null);

        if (comparisonType === 'custom' && !customDate) {
          setIsDataLoading(false);
          return;
        }

        const currentRange = getDateRange(timeRange);
        const previousRange = getPreviousDateRange(timeRange);

        console.log('=== DATE RANGE DEBUG INFO ===');
        console.log('Current Date:', new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }));
        console.log('Current Time:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
        console.log('Browser Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
        console.log('Time Range Selected:', timeRange);
        console.log('Current Range:', {
          start: currentRange.start.toISOString(),
          end: currentRange.end.toISOString(),
          startLocal: currentRange.start.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
          endLocal: currentRange.end.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
        });
        console.log('Previous Range:', {
          start: previousRange.start.toISOString(),
          end: previousRange.end.toISOString(),
          startLocal: previousRange.start.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
          endLocal: previousRange.end.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
        });
        console.log('Custom Date:', customDate);
        console.log('Total Monthly Salary:', totalMonthlySalary);
        console.log('=============================');

        const [currentData, previousData] = await Promise.all([
          fetchSalesData(currentRange.start, currentRange.end, 'current'),
          fetchSalesData(previousRange.start, previousRange.end, 'previous'),
        ]);

        let customData = previousData;

        if (comparisonType === 'custom' && customDate) {
          let customStart, customEnd;
          const offset = 5.75 * 60 * 60 * 1000;

          if (timeRange === 'year') {
            const selectedYear = parseInt(customDate, 10);
            if (selectedYear >= currentNepalDate.year) {
              setError(`Please select a year before ${currentNepalDate.year} for comparison.`);
              setIsDataLoading(false);
              return;
            }
            customStart = new Date(selectedYear, 0, 1);
            customEnd = new Date(selectedYear, 11, 31);
          } else {
            customStart = new Date(customDate);
            if (isNaN(customStart.getTime())) {
              setError('Invalid custom date selected.');
              setIsDataLoading(false);
              return;
            }

            customEnd = new Date(customStart);
            customStart.setTime(customStart.getTime() + offset);
            customEnd.setTime(customEnd.getTime() + offset);

            const nepalTime = new Date(new Date().getTime() + offset);
            nepalTime.setUTCHours(0, 0, 0, 0);

            if (timeRange === 'day') {
              if (customStart.getTime() > nepalTime.getTime()) {
                setError('Custom date cannot be in the future.');
                setIsDataLoading(false);
                return;
              }
              customStart.setUTCHours(0, 0, 0, 0);
              customEnd.setUTCHours(23, 59, 59, 999);
            } else if (timeRange === 'month') {
              const customMonthStart = new Date(customStart.getUTCFullYear(), customStart.getUTCMonth(), 1);
              const currentMonthStart = new Date(nepalTime.getUTCFullYear(), nepalTime.getUTCMonth(), 1);
              if (customMonthStart.getTime() > currentMonthStart.getTime()) {
                setError('Custom month cannot be in the future.');
                setIsDataLoading(false);
                return;
              }
              customStart.setUTCDate(1);
              customStart.setUTCHours(0, 0, 0, 0);
              customEnd.setUTCMonth(customEnd.getUTCMonth() + 1, 0);
              customEnd.setUTCHours(23, 59, 59, 999);
            }
          }

          console.log('Custom Range:', {
            start: customStart.toISOString(),
            end: customEnd.toISOString(),
            startLocal: customStart.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
            endLocal: customEnd.toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu' }),
          });

          customData = await fetchSalesData(customStart, customEnd, 'custom');
        }

        setSalesData({
          current: currentData,
          previous: previousData,
          custom: customData,
        });
      } catch (err) {
        setError('Failed to load sales data. Please try again.');
        console.error('Error loading data:', err);
        setSalesData({
          current: { sales: 0, expenses: 0, profit: 0, costOfGoods: 0, operatingExpenses: 0, rangeType: 'current' },
          previous: { sales: 0, expenses: 0, profit: 0, costOfGoods: 0, operatingExpenses: 0, rangeType: 'previous' },
          custom: { sales: 0, expenses: 0, profit: 0, costOfGoods: 0, operatingExpenses: 0, rangeType: 'custom' },
        });
      } finally {
        setIsDataLoading(false);
        setLoading(false);
      }
    };
  }, [comparisonType, customDate, timeRange, currentNepalDate.year, totalMonthlySalary, fetchSalesData, getDateRange, getPreviousDateRange, isDataLoading]);

  // Create debounced loadData ref
  const debouncedLoadDataRef = useRef();
  useEffect(() => {
    debouncedLoadDataRef.current = debounce(createLoadData(debouncedLoadDataRef.current), 300);
  }, [createLoadData]);

  // Fetch total monthly salary (runs once)
  useEffect(() => {
    const fetchTotalSalary = async () => {
      try {
        // Assuming the API is now implemented; if not, this will log but not crash
        const response = await staffAPI.getTotalMonthlySalary?.(); // Optional chaining to prevent error if not defined
        if (response?.success) {
          setTotalMonthlySalary(response.data.totalMonthlySalary || 0);
        } else {
          console.warn('getTotalMonthlySalary API not available or failed; using 0 for operating expenses.');
        }
      } catch (err) {
        console.error('Error fetching total monthly salary:', err);
      }
    };
    fetchTotalSalary();
  }, []);

  // Load data when dependencies change (no loadData dep to avoid loop)
  useEffect(() => {
    if (debouncedLoadDataRef.current && (comparisonType === 'custom' ? !!customDate : true)) {
      debouncedLoadDataRef.current();
    } else if (comparisonType === 'custom' && !customDate) {
      setSalesData({
        current: salesData.current || { sales: 0, expenses: 0, profit: 0, costOfGoods: 0, operatingExpenses: 0, rangeType: 'current' },
        previous: salesData.previous || { sales: 0, expenses: 0, profit: 0, costOfGoods: 0, operatingExpenses: 0, rangeType: 'previous' },
        custom: { sales: 0, expenses: 0, profit: 0, costOfGoods: 0, operatingExpenses: 0, rangeType: 'custom' },
      });
      setLoading(false);
    }
  }, [timeRange, comparisonType, customDate, totalMonthlySalary]);

  // Reset custom date when switching comparison type or time range
  useEffect(() => {
    setCustomDate('');
    setError(null);
  }, [comparisonType, timeRange]);

  // Safe percentage calculation
  const calculatePercentageChange = useCallback((current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, []);

  // Calculate comparison metrics
  const calculateComparison = useMemo(() => {
    if (!salesData.current || !salesData.previous) {
      return {
        sales: { current: 0, previous: 0, change: 0, isPositive: true },
        profit: { current: 0, previous: 0, change: 0, isPositive: true },
        expenses: { current: 0, previous: 0, change: 0, isPositive: true },
      };
    }

    const current = salesData.current;
    const compareTo = comparisonType === 'previous' ? salesData.previous : salesData.custom;

    const salesChange = calculatePercentageChange(current.sales || 0, compareTo?.sales || 0);
    const profitChange = calculatePercentageChange(current.profit || 0, compareTo?.profit || 0);
    const expenseChange = calculatePercentageChange(current.expenses || 0, compareTo?.expenses || 0);

    return {
      sales: {
        current: current.sales || 0,
        previous: compareTo?.sales || 0,
        change: salesChange,
        isPositive: salesChange >= 0,
      },
      profit: {
        current: current.profit || 0,
        previous: compareTo?.profit || 0,
        change: profitChange,
        isPositive: profitChange >= 0,
      },
      expenses: {
        current: current.expenses || 0,
        previous: compareTo?.expenses || 0,
        change: expenseChange,
        isPositive: expenseChange <= 0,
      },
    };
  }, [salesData, comparisonType, calculatePercentageChange]);

  const comparisonData = calculateComparison;
  const rangeLabels = useMemo(() => ({
    day: { current: 'Today', previous: 'Yesterday', custom: customDate || 'Custom' },
    month: { current: 'This Month', previous: 'Last Month', custom: customDate || 'Custom' },
    year: { current: 'This Year', previous: 'Last Year', custom: customDate || 'Custom' },
  })[timeRange], [timeRange, customDate]);

  // Chart configurations (memoized to prevent re-renders)
  const barChartData = useMemo(() => ({
    labels: ['Sales', 'Profit', 'Expenses'],
    datasets: [
      {
        label: rangeLabels.current,
        data: [comparisonData.sales.current, comparisonData.profit.current, comparisonData.expenses.current],
        backgroundColor: 'rgba(74, 222, 128, 0.8)',
        borderColor: 'rgba(74, 222, 128, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: comparisonType === 'previous' ? rangeLabels.previous : rangeLabels.custom,
        data: [comparisonData.sales.previous, comparisonData.profit.previous, comparisonData.expenses.previous],
        backgroundColor: 'rgba(96, 165, 250, 0.8)',
        borderColor: 'rgba(96, 165, 250, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }), [comparisonData, rangeLabels, comparisonType]);

  const barChartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: `Sales Performance Comparison`,
        font: { size: 16, weight: '600' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.2)' },
        ticks: {
          callback: function(value) {
            return 'NPR ' + value.toLocaleString('ne-NP');
          }
        }
      },
      x: { grid: { display: false } }
    }
  }), []);

  // Donut chart for expense breakdown
  const currentCostOfGoods = salesData.current?.costOfGoods || 0;
  const currentOperatingExpenses = salesData.current?.operatingExpenses || 0;
  const donutChartData = useMemo(() => ({
    labels: ['Cost of Goods', 'Operating Expenses'],
    datasets: [
      {
        data: [currentCostOfGoods, currentOperatingExpenses],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(249, 115, 22, 1)'
        ],
        borderWidth: 2,
      },
    ],
  }), [currentCostOfGoods, currentOperatingExpenses]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={debouncedLoadDataRef.current} />;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: '#1f2937',
      lineHeight: 1.6
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(-100px) translateX(-100px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Enhanced Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\" fill=\\"rgba(255,255,255,0.1)\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"2\\"/></svg>") repeat',
          animation: 'float 20s infinite linear'
        }}></div>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Sales Analytics Dashboard</h1>
            <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>
              Real-time insights for your clothing business performance
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '1rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <span style={{
                display: 'block',
                fontSize: '0.875rem',
                opacity: 0.8,
                marginBottom: '0.25rem'
              }}>Current Range</span>
              <strong style={{ fontSize: '1rem', fontWeight: 600 }}>{rangeLabels.current}</strong>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <span style={{
                display: 'block',
                fontSize: '0.875rem',
                opacity: 0.8,
                marginBottom: '0.25rem'
              }}>Comparison</span>
              <strong style={{ fontSize: '1rem', fontWeight: 600 }}>
                {comparisonType === 'previous' ? rangeLabels.previous : 'Custom'}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Tab Navigation */}
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

      {/* Enhanced Controls Section */}
      <section style={{
        background: '#ffffff',
        padding: '1.5rem 2rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: '2rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <label style={{ fontWeight: 600, color: '#1f2937', minWidth: '120px' }}>Time Range</label>
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px'
          }}>
            {['day', 'month', 'year'].map((range) => (
              <button
                key={range}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: timeRange === range ? '#ffffff' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  whiteSpace: 'nowrap',
                  boxShadow: timeRange === range ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                  color: timeRange === range ? '#3b82f6' : '#1f2937'
                }}
                onClick={() => setTimeRange(range)}
                onMouseOver={(e) => {
                  if (timeRange !== range) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
                onMouseOut={(e) => {
                  if (timeRange !== range) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <label style={{ fontWeight: 600, color: '#1f2937', minWidth: '120px' }}>Compare With</label>
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: comparisonType === 'previous' ? '#ffffff' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: comparisonType === 'previous' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                color: comparisonType === 'previous' ? '#3b82f6' : '#1f2937'
              }}
              onClick={() => setComparisonType('previous')}
              onMouseOver={(e) => {
                if (comparisonType !== 'previous') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (comparisonType !== 'previous') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Previous Period
            </button>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: comparisonType === 'custom' ? '#ffffff' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: comparisonType === 'custom' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                color: comparisonType === 'custom' ? '#3b82f6' : '#1f2937'
              }}
              onClick={() => setComparisonType('custom')}
              onMouseOver={(e) => {
                if (comparisonType !== 'custom') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (comparisonType !== 'custom') {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              Custom Date
            </button>
          </div>
        </div>

        {comparisonType === 'custom' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <label style={{ fontWeight: 600, color: '#1f2937', minWidth: '120px' }}>
              Select {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}
            </label>
            <div>
              {timeRange === 'year' ? (
                <select
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: '#ffffff'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select Year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={timeRange === 'month' ? 'month' : 'date'}
                  value={customDate}
                  onChange={(e) => handleCustomDateChange(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: '#ffffff'
                  }}
                  max={timeRange === 'month' ? currentNepalDate.month : currentNepalDate.day}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              )}
            </div>
            {!customDate && (
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '0.5rem'
              }}>
                Please select a {timeRange} to compare
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Content Area */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        display: 'grid',
        gap: '2rem'
      }}>
        {/* Key Metrics Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          <MetricCard
            title="Total Sales"
            value={comparisonData.sales.current}
            change={comparisonData.sales.change}
            previousValue={comparisonData.sales.previous}
            comparisonLabel={comparisonType === 'previous' ? rangeLabels.previous : rangeLabels.custom}
            type="sales"
            icon={metricIcons.sales}
          />
          <MetricCard
            title="Net Profit"
            value={comparisonData.profit.current}
            change={comparisonData.profit.change}
            previousValue={comparisonData.profit.previous}
            comparisonLabel={comparisonType === 'previous' ? rangeLabels.previous : rangeLabels.custom}
            type="profit"
            icon={metricIcons.profit}
          />
          <MetricCard
            title="Total Expenses"
            value={comparisonData.expenses.current}
            change={comparisonData.expenses.change}
            previousValue={comparisonData.expenses.previous}
            comparisonLabel={comparisonType === 'previous' ? rangeLabels.previous : rangeLabels.custom}
            type="expenses"
            icon={metricIcons.expenses}
          />
        </section>

        {/* Charts Section */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Performance Comparison</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(74, 222, 128, 0.8)' }}></div>
                  <span>{rangeLabels.current}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(96, 165, 250, 0.8)' }}></div>
                  <span>{comparisonType === 'previous' ? rangeLabels.previous : rangeLabels.custom}</span>
                </div>
              </div>
            </div>
            <Bar data={barChartData} options={barChartOptions} />
          </div>

          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Expense Breakdown</h3>
            </div>
            <Doughnut data={donutChartData} />
          </div>
        </section>

        {/* Additional Insights */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Profit Margin</h4>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              {comparisonData.sales.current > 0 
                ? ((comparisonData.profit.current / comparisonData.sales.current) * 100).toFixed(1)
                : '0'}%
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#065f46'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {comparisonData.profit.change >= 0 ? '+' : ''}{comparisonData.profit.change.toFixed(1)}% from previous
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Sales Efficiency</h4>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              {comparisonData.expenses.current > 0 
                ? (comparisonData.sales.current / comparisonData.expenses.current).toFixed(2)
                : '0'}x
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#065f46'
            }}>
              Return on Expenses
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Growth Rate</h4>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              {comparisonData.sales.change.toFixed(1)}%
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#065f46'
            }}>
              Monthly Average
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SalesDashboard;