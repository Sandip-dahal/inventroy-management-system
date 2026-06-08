import React, { useState, useEffect, useCallback } from 'react';
import { billingAPI, inventoryAPI, staffAPI, attendanceAPI, payrollAPI, supplierTransactionAPI } from '../services/api';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import NepaliDate from 'nepali-date';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RetailDashboard = () => {
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState({
    salesOverview: {
      todaySales: 0,
      billsGenerated: 0,
      yesterdayComparison: 0,
      last7Days: [],
      daysOfWeek: [],
    },
    topProducts: {
      bestSellers: [],
      worstSeller: null,
      totalQuantitySold: 0,
    },
    inventory: {
      lowStockCount: 0,
      totalProducts: 0,
      outOfStock: 0,
    },
    customers: {
      newCustomers: 0,
      returningPercentage: 0,
      creditCustomers: 0,
      topCustomer: '',
    },
    staff: {
      bestPerformer: '',
      absentToday: 0,
    },
    finance: {
      todayProfit: 0,
      outstandingDues: 0,
    },
    notifications: [],
  });
  const [totalPending, setTotalPending] = useState(0);
  // Profit data state
  const [profitData, setProfitData] = useState({
    todayProfit: 0,
    totalRevenue: 0,
    totalCost: 0,
    profitMargin: 0,
    itemsSold: 0,
    billsCount: 0
  });

  // Payment methods data state
  const [paymentMethodsData, setPaymentMethodsData] = useState({
    cash: 0,
    card: 0,
    ewallet: 0,
    credit: 0
  });

  const [paymentAmounts, setPaymentAmounts] = useState({
    cash: 0,
    card: 0,
    ewallet: 0,
    credit: 0
  });

  const [showPercentage, setShowPercentage] = useState(true);

  // Category sales data state
  const [categorySalesData, setCategorySalesData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderWidth: 0,
        hoverOffset: 15,
      },
    ],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [nepalDateTime, setNepalDateTime] = useState('');
  const [nepaliDate, setNepaliDate] = useState('');

  const navigate = useNavigate();

  // Weights for different performance categories
  const weights = {
    attendance: 0.4,
    punctuality: 0.3,
    financial: 0.3,
  };

  // Punctuality penalty points
  const punctualityPenalties = {
    late: 0.5,
    half_day: 0.3,
    on_leave: 0.2,
    absent: 1.0,
  };

  // Function to calculate total days in the selected month
  const getTotalDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  // Function to calculate days before joining in the selected month
  const getDaysBeforeJoining = (joiningDate, selectedMonth, selectedYear) => {
    if (!joiningDate) return 0;
    const joinDate = new Date(joiningDate);
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    if (joinDate < firstDayOfMonth) return 0;
    if (joinDate.getFullYear() > selectedYear || (joinDate.getFullYear() === selectedYear && joinDate.getMonth() + 1 > selectedMonth)) return getTotalDaysInMonth(selectedMonth, selectedYear);
    return joinDate.getDate() - 1;
  };

  // Function to get Nepali date
 const getNepaliDate = () => {
  const now = new Date();
  const nepaliDateObj = new NepaliDate(now);
  return nepaliDateObj.format('dddd, DD MMMM YYYY');
};

  // Function to update Nepal date and time
  const updateNepalTime = () => {
    // English time in Nepal timezone
    const options = {
      timeZone: 'Asia/Kathmandu',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const now = new Date();
    const englishTime = formatter.format(now);
    
    // Get Nepali date
    const nepaliDateString = getNepaliDate();
    
    setNepalDateTime(`${englishTime} NPT`);
    setNepaliDate(nepaliDateString);
  };

  // Function to fetch today's profit
  const fetchTodayProfit = async () => {
    try {
      const response = await billingAPI.getTodayProfit();
      if (response.success && response.profitData) {
        setProfitData({
          todayProfit: response.profitData.totalProfit || 0,
          totalRevenue: response.profitData.totalRevenue || 0,
          totalCost: response.profitData.totalCost || 0,
          profitMargin: response.profitData.profitMargin || 0,
          itemsSold: response.profitData.itemsSold || 0,
          billsCount: response.profitData.billsCount || 0
        });
        
        setDashboardData(prev => ({
          ...prev,
          finance: {
            ...prev.finance,
            todayProfit: response.profitData.totalProfit || 0
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching today\'s profit:', error);
      calculateProfitFromExistingData();
    }
  };

  // Fallback function to calculate profit from existing sales data
  const calculateProfitFromExistingData = () => {
    const averageProfitMargin = 0.3;
    const estimatedProfit = dashboardData.salesOverview.todaySales * averageProfitMargin;
    
    setProfitData(prev => ({
      ...prev,
      todayProfit: estimatedProfit,
      totalRevenue: dashboardData.salesOverview.todaySales,
      totalCost: dashboardData.salesOverview.todaySales * 0.7,
      itemsSold: dashboardData.topProducts.totalQuantitySold
    }));
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      const today = new Date();
      const todayIndex = today.getDay();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Fetch all data in parallel including supplier transactions
      const [
        todayData,
        yesterdayData,
        last7DaysData,
        topProductsData,
        productsData,
        newCustData,
        retData,
        creditData,
        topSpenderData,
        staffResponse,
        attendanceResponse,
        payrollResponse,
        todaysAttendanceResponse,
        profitResponse,
        pendingPaymentsResponse
      ] = await Promise.all([
        billingAPI.getTodaySales().catch(() => ({ totalSales: 0, billsCount: 0, bills: [] })),
        billingAPI.getYesterdaySales().catch(() => ({ totalSales: 0, billsCount: 0 })),
        billingAPI.getLast7DaysSales().catch(() => ({
          last7DaysSales: [0, 0, 0, 0, 0, 0, 0],
          daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        })),
        billingAPI.getTodayTopProducts().catch(() => ({
          bestSellers: [],
          worstSeller: null,
          totalQuantitySold: 0,
        })),
        inventoryAPI.getProducts().catch(() => ({ products: [] })),
        billingAPI.getNewCustomersThisMonth().catch(() => ({ count: 0 })),
        billingAPI.getReturningCustomersPercentage().catch(() => ({ percentage: 0 })),
        billingAPI.getCreditCustomersCount().catch(() => ({ count: 0 })),
        billingAPI.getTopSpenderThisMonth().catch(() => ({ name: '', phone: '' })),
        staffAPI.getAllStaff().catch(() => ({ data: [] })),
        attendanceAPI.getAttendance({ month: currentMonth, year: currentYear }).catch(() => ({ data: [] })),
        payrollAPI.getPayrolls({ month: currentMonth, year: currentYear }).catch(() => ({ data: [] })),
        attendanceAPI.getTodaysAttendance().catch(() => ({ data: { absent: 0 } })),
        billingAPI.getTodayProfit().catch(() => ({ success: false, profitData: null })),
        supplierTransactionAPI.getPendingPayments().catch(() => ({ data: { totalPending: 0, transactions: [], count: 0 } }))
      ]);

      // Process profit data
      let todayProfit = 0;
      let profitMargin = 0;
      let totalRevenue = 0;
      let totalCost = 0;
      let itemsSold = 0;
      let profitBillsCount = 0;
      
      if (profitResponse.success && profitResponse.profitData) {
        todayProfit = profitResponse.profitData.totalProfit || 0;
        profitMargin = profitResponse.profitData.profitMargin || 0;
        totalRevenue = profitResponse.profitData.totalRevenue || 0;
        totalCost = profitResponse.profitData.totalCost || 0;
        itemsSold = profitResponse.profitData.itemsSold || 0;
        profitBillsCount = profitResponse.profitData.billsCount || 0;
      } else {
        const averageProfitMargin = 0.3;
        todayProfit = todayData.totalSales * averageProfitMargin;
        profitMargin = averageProfitMargin * 100;
        totalRevenue = todayData.totalSales;
        totalCost = todayData.totalSales * 0.7;
        itemsSold = topProductsData.totalQuantitySold || 0;
        profitBillsCount = todayData.billsCount || 0;
      }

      setProfitData({
        todayProfit,
        totalRevenue,
        totalCost,
        profitMargin,
        itemsSold,
        billsCount: profitBillsCount
      });

      // Calculate outstanding dues
      const creditBills = Array.isArray(todayData.bills)
        ? todayData.bills.filter(bill => 
            bill.payment && 
            bill.payment.methods && 
            bill.payment.methods.some(method => method.method === 'credit')
          )
        : [];
      const outstandingDues = creditBills.reduce((sum, bill) => {
        return sum + (Number(bill.payment.outstandingAmount) || 0);
      }, 0);

      // Calculate percentage change
      let percentageChange = 0;
      if (yesterdayData.totalSales > 0) {
        percentageChange =
          ((todayData.totalSales - yesterdayData.totalSales) / yesterdayData.totalSales) * 100;
      } else if (todayData.totalSales > 0) {
        percentageChange = 100;
      }

      // Process inventory data
      const products = Array.isArray(productsData.products)
        ? productsData.products
        : Array.isArray(productsData)
        ? productsData
        : Array.isArray(productsData.data?.products)
        ? productsData.data.products
        : [];

      const totalProducts = products.length;
      const outOfStock = products.filter(product => product.stock === 0).length;
      const lowStockCount = products.filter(product =>
        (product.stock || 0) > 0 && (product.stock || 0) <= (product.lowStockAlert || 5)
      ).length;

      // Create product category map
      const productCategoryMap = new Map();
      products.forEach(product => {
        if (product._id && product.category) {
          productCategoryMap.set(product._id.toString(), product.category);
        }
      });

      // Compute dynamic category sales
      const fixedCategories = ["Men's Clothing", "Women's Clothing", "Kids' Clothing", "Accessories"];
      const categoryShortMap = {
        "Men's Clothing": "Men's",
        "Women's Clothing": "Women's",
        "Kids' Clothing": "Kids",
        "Accessories": "Accessories"
      };
      const categoryColors = {
        "Men's Clothing": 'rgba(79, 70, 229, 0.8)',
        "Women's Clothing": 'rgba(236, 72, 153, 0.8)',
        "Kids' Clothing": 'rgba(249, 115, 22, 0.8)',
        "Accessories": 'rgba(16, 185, 129, 0.8)'
      };

      const categorySalesMap = {};
      fixedCategories.forEach(cat => categorySalesMap[cat] = 0);

      if (todayData.bills && Array.isArray(todayData.bills)) {
        todayData.bills.forEach(bill => {
          if (bill.items && Array.isArray(bill.items)) {
            bill.items.forEach(item => {
              const prodId = item.productId ? item.productId.toString() : null;
              const cat = prodId ? productCategoryMap.get(prodId) : null;
              if (cat && fixedCategories.includes(cat)) {
                const salesAmount = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                categorySalesMap[cat] += salesAmount;
              }
            });
          }
        });
      }

      const totalCategorySales = fixedCategories.reduce((sum, cat) => sum + categorySalesMap[cat], 0);
      const labels = fixedCategories.map(cat => categoryShortMap[cat] || cat);
      const data = fixedCategories.map(cat => totalCategorySales > 0 ? Math.round((categorySalesMap[cat] / totalCategorySales) * 100) : 0);
      const backgroundColor = fixedCategories.map(cat => categoryColors[cat] || 'rgba(0, 0, 0, 0.8)');

      setCategorySalesData({
        labels,
        datasets: [
          {
            data,
            backgroundColor,
            borderWidth: 0,
            hoverOffset: 15,
          },
        ],
      });

      // Process staff performance data
      const staffData = staffResponse.data?.staff || staffResponse.data || [];
      const attendanceData = attendanceResponse.data?.attendance || attendanceResponse.data || [];
      const payrollData = payrollResponse.data?.payrolls || payrollResponse.data || [];

      let bestPerformer = '';
      let performanceData = [];

      if (Array.isArray(staffData) && staffData.length > 0) {
        const totalDaysInMonth = getTotalDaysInMonth(currentMonth, currentYear);
        const payrollsWithAllowance = payrollData.filter(p => p && p.allowance > 0);
        const maxAllowance = payrollsWithAllowance.length > 0
          ? Math.max(...payrollsWithAllowance.map(p => p.allowance))
          : 0;

        performanceData = staffData.map(staff => {
          const monthAttendance = attendanceData.filter(a => {
            if (!a || !a.staff || !a.status) return false;
            const staffId = a.staff._id || a.staff;
            const date = new Date(a.date);
            return staffId === staff._id &&
                   date.getMonth() + 1 === currentMonth &&
                   date.getFullYear() === currentYear;
          });

          const presentDays = monthAttendance.filter(a => a.status === 'present').length;
          const daysBeforeJoining = getDaysBeforeJoining(staff.joiningDate, currentMonth, currentYear);
          const workingDays = Math.max(1, totalDaysInMonth - daysBeforeJoining);
          const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
          const contributionPercentage = (presentDays / totalDaysInMonth) * 100;

          let punctualityDeductions = 0;
          monthAttendance.forEach(record => {
            if (record.status in punctualityPenalties) {
              punctualityDeductions += punctualityPenalties[record.status];
            }
          });

          const punctualityScore = Math.max(0, 100 - (punctualityDeductions / workingDays) * 100);

          let financialScore = 0;
          const monthPayroll = payrollData.find(p => {
            if (!p || !p.staff) return false;
            const staffId = p.staff._id || p.staff;
            return staffId === staff._id &&
                   p.month === currentMonth &&
                   p.year === currentYear;
          });

          if (monthPayroll) {
            const allowanceScore = maxAllowance > 0
              ? (monthPayroll.allowance / maxAllowance) * 60
              : 0;
            const workingDaysStandard = 22;
            const dailyRate = (monthPayroll.basicSalary + monthPayroll.allowance) / workingDaysStandard;
            const expectedEarnings = (attendancePercentage / 100) * dailyRate * workingDaysStandard;
            const actualEarnings = monthPayroll.netSalary || (monthPayroll.basicSalary + monthPayroll.allowance - (monthPayroll.deduction || 0));
            const efficiencyRatio = actualEarnings > 0
              ? Math.min(1.5, expectedEarnings / actualEarnings)
              : 1;
            const efficiencyScore = efficiencyRatio * 40;
            financialScore = allowanceScore + efficiencyScore;
            financialScore = Math.min(100, Math.max(0, financialScore));
          }

          const overallScore = Math.round(
            (attendancePercentage * weights.attendance) +
            (punctualityScore * weights.punctuality) +
            (financialScore * weights.financial)
          );

          return {
            ...staff,
            attendanceScore: Math.round(contributionPercentage),
            attendancePercentage: Math.round(attendancePercentage),
            punctualityScore: Math.round(punctualityScore),
            financialScore: Math.round(financialScore),
            overallScore,
            monthAttendanceCount: monthAttendance.length,
            payrollData: monthPayroll,
            allowanceAmount: monthPayroll ? monthPayroll.allowance : 0,
            presentDays,
            totalDaysInMonth,
          };
        });

        performanceData.sort((a, b) => b.overallScore - a.overallScore);
        bestPerformer = performanceData.length > 0 ? performanceData[0].name : 'No data available';
      }

      const absentToday = todaysAttendanceResponse.data?.absent || 0;

      // Normalize the comparison to handle case and whitespace issues
      const transactions = pendingPaymentsResponse.data?.transactions || [];
      const calculatedTotalPending = transactions.reduce((sum, transaction) => {
        const transactionTypes = ['Refund', 'Advance', 'Credit'];
        const isIncluded = transactionTypes.includes(transaction.type);
        if (isIncluded) {
          return sum + (Number(transaction.amount) || 0);
        }
        return sum;
      }, 0);

      setTotalPending(calculatedTotalPending);

      const notifications = [
        {
          type: 'payment',
          message: `Pending supplier payment: ${formatCurrency(calculatedTotalPending)}`,
          time: 'Just now'
        },
        {
          type: 'stock',
          message: `${lowStockCount + outOfStock} items below minimum stock level`,
          time: 'just now'
        },
        {
          type: 'offer',
          message: 'Dashain festival sale preparation needed',
          time: 'currently'
        },
      ];

      // Use last7DaysData directly
      let last7Days = last7DaysData.last7DaysSales || [0, 0, 0, 0, 0, 0, 0];
      let daysOfWeek = last7DaysData.daysOfWeek || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      last7Days[todayIndex] = todayData.totalSales || 0;

      setDashboardData(prev => ({
        ...prev,
        salesOverview: {
          todaySales: todayData.totalSales || 0,
          billsGenerated: todayData.billsCount || 0,
          yesterdayComparison: percentageChange,
          last7Days,
          daysOfWeek,
        },
        topProducts: {
          bestSellers: topProductsData.bestSellers || [],
          worstSeller: topProductsData.worstSeller || null,
          totalQuantitySold: topProductsData.totalQuantitySold || 0,
        },
        inventory: {
          lowStockCount,
          totalProducts,
          outOfStock,
        },
        customers: {
          newCustomers: newCustData.count,
          returningPercentage: retData.percentage,
          creditCustomers: creditData.count,
          topCustomer: topSpenderData.name ? `${topSpenderData.name} (${topSpenderData.phone})` : '',
        },
        staff: {
          bestPerformer,
          absentToday,
        },
        finance: {
          todayProfit: todayProfit,
          outstandingDues: outstandingDues || 0,
        },
        notifications,
      }));

      // Calculate payment distribution
      let cashAmount = 0;
      let cardAmount = 0;
      let ewalletAmount = 0;
      let creditAmount = 0;
      const bills = todayData.bills || [];
      bills.forEach(bill => {
        if (!bill.payment) {
          creditAmount += Number(bill.total) || 0;
          return;
        }
        const outstanding = Number(bill.payment.outstandingAmount) || 0;
        const includeCredit = outstanding > 0;
        if (bill.payment.methods) {
          bill.payment.methods.forEach(method => {
            const amt = Number(method.amount) || 0;
            if (method.method === 'credit') {
              if (includeCredit) {
                creditAmount += amt;
              }
            } else {
              switch(method.method) {
                case 'cash': cashAmount += amt; break;
                case 'card': cardAmount += amt; break;
                case 'ewallet': ewalletAmount += amt; break;
              }
            }
          });
        }
      });
      const totalAmount = cashAmount + cardAmount + ewalletAmount + creditAmount;
      setPaymentAmounts({
        cash: cashAmount,
        card: cardAmount,
        ewallet: ewalletAmount,
        credit: creditAmount
      });
      setPaymentMethodsData({
        cash: totalAmount > 0 ? Math.round((cashAmount / totalAmount) * 100) : 0,
        card: totalAmount > 0 ? Math.round((cardAmount / totalAmount) * 100) : 0,
        ewallet: totalAmount > 0 ? Math.round((ewalletAmount / totalAmount) * 100) : 0,
        credit: totalAmount > 0 ? Math.round((creditAmount / totalAmount) * 100) : 0
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    updateNepalTime();
    const timeInterval = setInterval(updateNepalTime, 60000); // Update every minute
    return () => clearInterval(timeInterval);
  }, [fetchDashboardData]);

  const todayIndex = new Date().getDay();
  const displayedDays = dashboardData.salesOverview.daysOfWeek;
  const displayedLast7Days = dashboardData.salesOverview.last7Days;

  // Prepare payment methods data for chart
  const chartDataValues = showPercentage 
    ? [paymentMethodsData.cash, paymentMethodsData.card, paymentMethodsData.ewallet, paymentMethodsData.credit]
    : [paymentAmounts.cash, paymentAmounts.card, paymentAmounts.ewallet, paymentAmounts.credit];

  const paymentMethodsChartData = {
    labels: ['Cash', 'Card', 'E-Wallet', 'Credit'],
    datasets: [
      {
        data: chartDataValues,
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(79, 70, 229, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderWidth: 0,
        hoverOffset: 15,
      },
    ],
  };

  // Chart data configurations with star for current day
  const weeklySalesData = {
    labels: displayedDays,
    datasets: [
      {
        label: 'Sales (NPR)',
        data: displayedLast7Days,
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointStyle: displayedDays.map((_, index) => 
          index === todayIndex ? 'star' : 'circle'
        ),
        pointBackgroundColor: displayedDays.map((_, index) => 
          index === todayIndex ? '#1f804bff' : 'rgba(79, 70, 229, 1)'
        ),
        pointBorderColor: displayedDays.map((_, index) => 
          index === todayIndex ? '#15a543ff' : 'rgba(79, 70, 229, 1)'
        ),
        pointRadius: displayedDays.map((_, index) => 
          index === todayIndex ? 4 : 4
        ),
        pointHoverRadius: displayedDays.map((_, index) => 
          index === todayIndex ? 10 : 6
        ),
      },
    ],
  };

  // Chart options
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const isToday = context.dataIndex === todayIndex;
            const todayIndicator = isToday ? ' (Today)' : '';
            return `${label}: RS ${value}${todayIndicator}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return 'RS ' + value;
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: '#10b981',
        hoverBorderColor: '#10b981',
        hoverBorderWidth: 2,
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const suffix = showPercentage ? '%' : '';
            return `${label}: ${showPercentage ? value : formatCurrency(value)}${suffix}`;
          }
        }
      }
    },
    cutout: '50%',
  };

  // Format currency
  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        style={{
          padding: '1.5rem',
          minHeight: '100vh',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
          backgroundColor: '#f8fafc',
          color: '#334155',
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'loading 1.5s infinite',
              borderRadius: '0.25rem',
              width: '200px',
              height: '32px',
            }}
          ></div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '40px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite',
              }}
            ></div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite',
              }}
            ></div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '1.25rem',
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '24px',
                  marginBottom: '1rem',
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'loading 1.5s infinite',
                  borderRadius: '0.25rem',
                }}
              ></div>
              <div
                style={{
                  width: '100%',
                  height: '100px',
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'loading 1.5s infinite',
                  borderRadius: '0.5rem',
                }}
              ></div>
            </div>
          ))}
        </div>

        <style>
          {`
            @keyframes loading {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        backgroundColor: '#f8fafc',
        color: '#334155',
        lineHeight: 1.6,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              color: '#1f2937',
              fontSize: '1.875rem',
              fontWeight: '700',
              marginBottom: '0.25rem',
            }}
          >
            Retail Dashboard
          </h1>
          <p
            style={{
              color: '#6b7280',
              fontSize: '0.875rem',
            }}
          >
            Welcome back! Here's what's happening today.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              color: '#4f46e5',
              fontWeight: '500',
              border: '1px solid rgba(79, 70, 229, 0.1)',
            }}
          >
            <i className="fas fa-clock" style={{ color: '#6366f1' }}></i>
            {nepaliDate} | {nepalDateTime}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onClick={() => {
              billingAPI.clearProfitCache();
              fetchDashboardData();
            }}
          >
            <i className="fas fa-sync-alt"></i> Refresh Data
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1rem',
              }}
            >
              <i className="fas fa-user"></i>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span
                style={{
                  fontWeight: '600',
                  color: '#1f2937',
                }}
              >
                Admin
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                }}
              >
                Store Manager
              </span>
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500',
            color: activeTab === 'overview' ? '#4f46e5' : '#6b7280',
            backgroundColor: activeTab === 'overview' ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-chart-pie"></i> Overview
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500',
            color: '#6b7280',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
          onClick={() => navigate('/salesdashboard')}
        >
          <i className="fas fa-shopping-cart"></i> Sales
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500',
            color: activeTab === 'customers' ? '#4f46e5' : '#6b7280',
            backgroundColor: activeTab === 'customers' ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
          onClick={() => navigate('/customersdashboard')}
        >
          <i className="fas fa-users"></i> Customers
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '1.25rem',
        }}
      >
        {/* Sales Overview */}
        <div
          style={{
            gridColumn: 'span 8',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                marginBottom: '1rem',
                color: '#1f2937',
                fontSize: '1.125rem',
                fontWeight: '600',
              }}
            >
              Today Sales Overview
            </h2>
            <button
              onClick={() => {
                fetchDashboardData();
              }}
              style={{
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 2fr',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}
              >
                <i className="fas fa-receipt"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  Today's Sales
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '0.25rem',
                  }}
                >
                  {formatCurrency(dashboardData.salesOverview.todaySales)}
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  {dashboardData.salesOverview.billsGenerated} bills generated
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.5rem',
                  backgroundColor:
                    dashboardData.salesOverview.yesterdayComparison >= 0
                      ? '#10b981'
                      : '#ef4444',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}
              >
                <i
                  className={`fas fa-arrow-${
                    dashboardData.salesOverview.yesterdayComparison >= 0 ? 'up' : 'down'
                  }`}
                ></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  Yesterday vs Today
                </h3>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color:
                      dashboardData.salesOverview.yesterdayComparison >= 0
                        ? '#10b981'
                        : '#ef4444',
                    marginBottom: '0.25rem',
                  }}
                >
                  {Math.abs(dashboardData.salesOverview.yesterdayComparison).toFixed(1)}%
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  {dashboardData.salesOverview.yesterdayComparison >= 0 ? 'Increase' : 'Decrease'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
                height: '150px',
              }}
            >
              <Line data={weeklySalesData} options={lineOptions} />
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 4',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              marginBottom: '1rem',
              color: '#1f2937',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            Quick Stats
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/inventory?status=all')}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-box"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Total Products
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.inventory.totalProducts}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/inventory?status=low_stock')}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Low Stock
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.inventory.lowStockCount}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/inventory?status=out_of_stock')}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-ban"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Out of Stock
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.inventory.outOfStock}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 6',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                color: '#1f2937',
                fontSize: '1.125rem',
                fontWeight: '600',
              }}
            >
              Finance Quick Stats Today
            </h2>
            <button
              onClick={() => {
                fetchTodayProfit();
                fetchDashboardData(); // Refresh outstanding dues
              }}
              style={{
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title="Refresh finance data"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '0.5rem',
                borderLeft: '4px solid #10b981',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-chart-line"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  Today's Profit
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {formatCurrency(profitData.todayProfit)}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#059669',
                  }}
                >
                  Margin: {profitData.profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #0ea5e9',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  Revenue
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {formatCurrency(profitData.totalRevenue)}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #ef4444',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  Cost
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {formatCurrency(profitData.totalCost)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                }}
              >
                <i className="fas fa-box"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  Items Sold Today
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {profitData.itemsSold} units
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                backgroundColor: '#fff7ed',
                borderRadius: '0.5rem',
                borderLeft: '3px solid #f59e0b',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                }}
              >
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  Outstanding Dues
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {formatCurrency(dashboardData.finance.outstandingDues)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 6',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              marginBottom: '1rem',
              color: '#1f2937',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            Top Products Today
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {dashboardData.topProducts.bestSellers.map((product, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#1f2937',
                    }}
                  >
                    {product.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                  >
                    {product.category}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {product.quantity} sold
                </div>
              </div>
            ))}
            {dashboardData.topProducts.worstSeller && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '0.5rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#1f2937',
                    }}
                  >
                    {dashboardData.topProducts.worstSeller.name} (Worst)
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                  >
                    {dashboardData.topProducts.worstSeller.category}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.topProducts.worstSeller.quantity} sold
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 6',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              marginBottom: '1rem',
              color: '#1f2937',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            Customer Insights
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-user-plus"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  New Customers (This Month)
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.customers.newCustomers}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-users"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Returning Customers
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.customers.returningPercentage}%
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-credit-card"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Credit Customers
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.customers.creditCustomers}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-crown"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Top Customer (This Month)
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.customers.topCustomer || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 6',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              marginBottom: '1rem',
              color: '#1f2937',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            Staff Performance
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-trophy"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Best Performer
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.staff.bestPerformer}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-user-times"></i>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  Absent Today
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {dashboardData.staff.absentToday}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 12',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              marginBottom: '1rem',
              color: '#1f2937',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            Notifications
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {dashboardData.notifications.map((notification, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  borderLeft: `4px solid ${
                    notification.type === 'payment'
                      ? '#f59e0b'
                      : notification.type === 'stock'
                      ? '#ef4444'
                      : '#4f46e5'
                  }`,
                }}
              >
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.5rem',
                    backgroundColor:
                      notification.type === 'payment'
                        ? '#f59e0b'
                        : notification.type === 'stock'
                        ? '#ef4444'
                        : '#4f46e5',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i
                    className={`fas fa-${
                      notification.type === 'payment'
                        ? 'money-bill-wave'
                        : notification.type === 'stock'
                        ? 'exclamation-triangle'
                        : 'gift'
                    }`}
                  ></i>
                </div>
                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#1f2937',
                    }}
                  >
                    {notification.message}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                  >
                    {notification.time}
                  </div>
                </div>
                {notification.type === 'payment' && totalPending > 0 && (
                  <div
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                    }}
                  >
                    Pending
                  </div>
                )}
              </div>
            ))}
            {dashboardData.notifications.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#6b7280',
                  fontStyle: 'italic',
                }}
              >
                No notifications at the moment
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 6',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              marginBottom: '1rem',
              color: '#1f2937',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            Category Sales (Today)
          </h2>
          <div
            style={{
              height: '250px',
            }}
          >
            <Doughnut data={categorySalesData} options={pieOptions} />
          </div>
        </div>

        <div
          style={{
            gridColumn: 'span 6',
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <h2
              style={{
                color: '#1f2937',
                fontSize: '1.125rem',
                fontWeight: '600',
              }}
            >
              Payment Methods (Today)
            </h2>
            <button
              onClick={fetchDashboardData}
              style={{
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title="Refresh payment methods data"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '0.5rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#f1f5f9',
                padding: '0.25rem',
                borderRadius: '999px',
              }}
            >
              <button
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  backgroundColor: showPercentage ? 'white' : 'transparent',
                  color: showPercentage ? '#1f2937' : '#6b7280',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: showPercentage ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setShowPercentage(true)}
              >
                Percentage
              </button>
              <button
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  backgroundColor: !showPercentage ? 'white' : 'transparent',
                  color: !showPercentage ? '#1f2937' : '#6b7280',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: !showPercentage ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setShowPercentage(false)}
              >
                Amount
              </button>
            </div>
          </div>
          <div
            style={{
              height: '250px',
              marginBottom: '1rem',
            }}
          >
            <Doughnut data={paymentMethodsChartData} options={pieOptions} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '0.375rem',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(16, 185, 129, 0.8)',
                }}
              ></div>
              <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                Cash: {showPercentage ? `${paymentMethodsData.cash}%` : formatCurrency(paymentAmounts.cash)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '0.375rem',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(79, 70, 229, 0.8)',
                }}
              ></div>
              <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                Card: {showPercentage ? `${paymentMethodsData.card}%` : formatCurrency(paymentAmounts.card)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#fff7ed',
                borderRadius: '0.375rem',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(249, 115, 22, 0.8)',
                }}
              ></div>
              <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                E-Wallet: {showPercentage ? `${paymentMethodsData.ewallet}%` : formatCurrency(paymentAmounts.ewallet)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#fdf2f8',
                borderRadius: '0.375rem',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(236, 72, 153, 0.8)',
                }}
              ></div>
              <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                Credit: {showPercentage ? `${paymentMethodsData.credit}%` : formatCurrency(paymentAmounts.credit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailDashboard;