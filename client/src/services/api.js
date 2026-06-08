import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const api = axios.create({ 
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Development environment test connection
if (process.env.NODE_ENV === 'development') {
  api.get('/test')
    .then(response => console.log('API connection successful:', response.data))
    .catch(error => console.warn('API connection test failed:', error.message));
}

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject({
      ...error,
      message: error.response?.data?.message || error.message
    });
  }
);

// Simple in-memory cache with TTL
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCacheKey = (url, params) => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${url}-${paramString}`;
};

const setCache = (key, data) => {
  apiCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const getCache = (key) => {
  const cached = apiCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    apiCache.delete(key);
    return null;
  }
  
  return cached.data;
};

const clearCache = (urlPattern) => {
  Array.from(apiCache.keys()).forEach(key => {
    if (key.includes(urlPattern)) {
      apiCache.delete(key);
    }
  });
};

// Auth API methods
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData).then(res => res.data),
  login: (email, password) => api.post('/auth/login', { email, password }).then(res => res.data),
  getMe: () => {
    const cacheKey = '/auth/me';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/auth/me')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  verifyPassword: (password) => api.post('/auth/verify-password', { password }).then(res => res.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(res => res.data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }).then(res => res.data),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(res => res.data)
};

// Products API methods
export const productsAPI = {
  getProducts: (params) => {
    const cacheKey = getCacheKey('/inventory', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/inventory', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  getProduct: (id) => {
    const cacheKey = `/inventory/${id}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/inventory/${id}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  createProduct: (productData) => {
    clearCache('/inventory');
    return api.post('/inventory', productData).then(res => res.data);
  },
  updateProduct: (id, productData) => {
    clearCache(`/inventory/${id}`);
    clearCache('/inventory');
    return api.put(`/inventory/${id}`, productData).then(res => res.data);
  },
  deleteProduct: (id) => {
    clearCache(`/inventory/${id}`);
    clearCache('/inventory');
    return api.delete(`/inventory/${id}`).then(res => res.data);
  },
  getLowStock: () => {
    const cacheKey = '/inventory/low-stock';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/inventory/low-stock')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  updateStock: (id, stockData) => {
    clearCache(`/inventory/${id}`);
    clearCache('/inventory');
    return api.patch(`/inventory/${id}/stock`, stockData).then(res => res.data);
  },
  getTotalProducts: () => {
    const cacheKey = '/inventory/count';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/inventory/count')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  getOutOfStockCount: () => {
    const cacheKey = '/inventory/out-of-stock/count';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/inventory/out-of-stock/count')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  checkSkuUnique: (sku, productId = null) => 
    api.get(`/inventory/check/sku/${sku}${productId ? `?exclude=${productId}` : ''}`).then(res => res.data),
  checkBarcodeUnique: (barcode, productId = null) => 
    api.get(`/inventory/check/barcode/${barcode}${productId ? `?exclude=${productId}` : ''}`).then(res => res.data),
};

// Alias for backward compatibility
export const inventoryAPI = productsAPI;

// Supplier API methods
export const supplierAPI = {
  getSuppliers: (params) => {
    const cacheKey = getCacheKey('/suppliers', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/suppliers', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  getSupplier: (id) => {
    const cacheKey = `/suppliers/${id}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/suppliers/${id}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  createSupplier: (supplierData) => {
    clearCache('/suppliers');
    return api.post('/suppliers', supplierData).then(res => res.data);
  },
  updateSupplier: (id, supplierData) => {
    clearCache(`/suppliers/${id}`);
    clearCache('/suppliers');
    return api.put(`/suppliers/${id}`, supplierData).then(res => res.data);
  },
  deleteSupplier: (id) => {
    clearCache(`/suppliers/${id}`);
    clearCache('/suppliers');
    return api.delete(`/suppliers/${id}`).then(res => res.data);
  },
  getSupplierTransactions: (id) => api.get(`/suppliers/${id}/transactions`).then(res => res.data),
  getSupplierPurchaseOrders: (id) => api.get(`/suppliers/${id}/purchase-orders`).then(res => res.data),
  getSupplierBalance: (id) => api.get(`/suppliers/${id}/balance`).then(res => res.data),
};

// Purchase Order API methods
export const purchaseOrderAPI = {
  getPurchaseOrders: (params) => {
    const cacheKey = getCacheKey('/purchase-orders', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/purchase-orders', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  getPurchaseOrder: (id) => {
    const cacheKey = `/purchase-orders/${id}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/purchase-orders/${id}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  createPurchaseOrder: (orderData) => {
    clearCache('/purchase-orders');
    return api.post('/purchase-orders', orderData).then(res => res.data);
  },
  updatePurchaseOrder: (id, orderData) => {
    clearCache(`/purchase-orders/${id}`);
    clearCache('/purchase-orders');
    return api.put(`/purchase-orders/${id}`, orderData).then(res => res.data);
  },
  updatePurchaseOrderStatus: (id, statusData) => {
    clearCache(`/purchase-orders/${id}`);
    clearCache('/purchase-orders');
    return api.put(`/purchase-orders/${id}/status`, statusData).then(res => res.data);
  },
  deletePurchaseOrder: (id) => {
    clearCache(`/purchase-orders/${id}`);
    clearCache('/purchase-orders');
    return api.delete(`/purchase-orders/${id}`).then(res => res.data);
  },
  sendEmailWithNodemailer: (id) => api.post(`/purchase-orders/${id}/send/email-nodemailer`).then(res => res.data),
  getSupplierPerformance: (supplierId) => 
    api.get(`/purchase-orders/supplier-performance/${supplierId}`).then(res => res.data),
  sendEmailWithAttachment: (formData) => api.post('/purchase-orders/send-email-with-attachment', formData).then(res => res.data),
};

// Transaction API methods
export const transactionAPI = {
  getTransactions: (params) => {
    const cacheKey = getCacheKey('/transactions', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/transactions', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  getTransaction: (id) => {
    const cacheKey = `/transactions/${id}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/transactions/${id}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  createTransaction: (data) => {
    clearCache('/transactions');
    return api.post('/transactions', data).then(res => res.data);
  },
  updateTransaction: (id, data) => {
    clearCache(`/transactions/${id}`);
    clearCache('/transactions');
    return api.put(`/transactions/${id}`, data).then(res => res.data);
  },
  deleteTransaction: (id) => {
    clearCache(`/transactions/${id}`);
    clearCache('/transactions');
    return api.delete(`/transactions/${id}`).then(res => res.data);
  },
  getTransactionSummary: () => {
    const cacheKey = '/transactions/summary';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/transactions/summary')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
};

// Billing API methods
export const billingAPI = {
  getTodayProfit: () => {
    const cacheKey = '/bills/profit/today';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/profit/today')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getProfitByDateRange: (startDate, endDate) => {
    const cacheKey = getCacheKey('/bills/profit/range', { startDate, endDate });
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/profit/range', { params: { startDate, endDate } })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  clearProfitCache: () => {
    clearCache('/bills/profit/today');
    clearCache('/bills/profit/range');
  },

  getNextBillNumber: () => {
    const cacheKey = '/bills/next-number';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/next-number')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  createBill: (billData) => {
    clearCache('/bills');
    billingAPI.clearSalesCache();
    billingAPI.clearProfitCache();
    return api.post('/bills', billData)
      .then(res => res.data)
      .catch(error => {
        console.error('Error creating bill:', error);
        throw error;
      });
  },
  
  getBills: (page = 1, limit = 20) => {
    const cacheKey = getCacheKey('/bills', { page, limit });
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills', { params: { page, limit } })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getBill: (billNumber) => {
    const cacheKey = `/bills/${billNumber}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/bills/${billNumber}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  deleteBill: (id) => {
    clearCache('/bills');
    billingAPI.clearProfitCache();
    return api.delete(`/bills/${id}`)
      .then(res => res.data)
      .catch(error => {
        console.error('Error deleting bill:', error);
        throw error;
      });
  },
  
  getTodaySales: () => {
    const cacheKey = '/bills/sales/today';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/sales/today')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getYesterdaySales: () => {
    const cacheKey = '/bills/sales/yesterday';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/sales/yesterday')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getLast7DaysSales: () => {
    const cacheKey = '/bills/sales/last7days';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/sales/last7days')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  clearSalesCache: () => {
    clearCache('/bills/sales/today');
    clearCache('/bills/sales/yesterday');
    clearCache('/bills/sales/last7days');
  },
  
  getTodayTopProducts: () => {
    const cacheKey = '/bills/sales/today/products';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/sales/today/products')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getPaymentMethodsDistribution: (startDate, endDate) => {
    const cacheKey = getCacheKey('/bills/payment-methods/distribution', { startDate, endDate });
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/payment-methods/distribution', { params: { startDate, endDate } })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching payment methods distribution:', error);
        throw error;
      });
  },
  
  getNewCustomersThisMonth: () => {
    const cacheKey = '/bills/customers/new-this-month';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/customers/new-this-month')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getReturningCustomersPercentage: () => {
    const cacheKey = '/bills/customers/returning-percentage';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/customers/returning-percentage')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getCreditCustomersCount: () => {
    const cacheKey = '/bills/customers/credit-count';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/customers/credit-count')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getTopSpenderThisMonth: () => {
    const cacheKey = '/bills/customers/top-spender-this-month';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/customers/top-spender-this-month')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      });
  },
  
  getCreditCustomers: () => {
    const cacheKey = '/bills/credit/customers';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/bills/credit/customers')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching credit customers:', error);
        throw error;
      });
  },
  
  processCreditPayment: (paymentData) => {
    clearCache('/bills/credit/customers');
    clearCache('/bills');
    return api.post('/bills/credit/process-payment', paymentData)
      .then(res => res.data)
      .catch(error => {
        console.error('Error processing credit payment:', error);
        throw error;
      });
  },
  
  updateBillOutstandingAmount: (billId, newAmount) => {
    clearCache('/bills/credit/customers');
    clearCache('/bills');
    return api.post('/bills/credit/process-payment', {
      billId,
      newOutstandingAmount: newAmount
    })
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating bill outstanding amount:', error);
        throw error;
      });
  },
  
  updateBillPaymentMethod: (billId, paymentMethod) => {
    clearCache('/bills/credit/customers');
    clearCache('/bills');
    return api.patch(`/bills/${billId}/payment`, { payment: { methods: [{ method: paymentMethod, amount: 0 }], type: 'single' } })
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating bill payment method:', error);
        throw error;
      });
  },
  
  processSplitPayment: (billId, customerPhone, payments, isSplitPayment = true) => {
    clearCache('/bills/credit/customers');
    clearCache('/bills');
    return api.post('/bills/credit/process-payment', {
      billId,
      customerPhone,
      payments,
      isSplitPayment
    })
      .then(res => res.data)
      .catch(error => {
        console.error('Error processing split payment:', error);
        throw error;
      });
  }
};

// Staff API methods
export const staffAPI = {
  createStaff: (staffData) => {
    clearCache('/staff');
    return api.post('/staff', staffData)
      .then(res => res.data)
      .catch(error => {
        console.error('Error creating staff:', error);
        throw error;
      });
  },
  getAllStaff: () => {
    const cacheKey = '/staff';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching staff:', error);
        throw error;
      });
  },
  getStaffStats: () => {
    const cacheKey = '/staff/stats';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff/stats')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching staff stats:', error);
        throw error;
      });
  },
  getStaff: (id) => {
    const cacheKey = `/staff/${id}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/staff/${id}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching staff:', error);
        throw error;
      });
  },
  updateStaff: (id, staffData) => {
    clearCache(`/staff/${id}`);
    clearCache('/staff');
    return api.put(`/staff/${id}`, staffData)
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating staff:', error);
        throw error;
      });
  },


  deleteStaff: (id) => {
    clearCache(`/staff/${id}`);
    clearCache('/staff');
    return api.delete(`/staff/${id}`)
      .then(res => res.data)
      .catch(error => {
        console.error('Error deleting staff:', error);
        throw error;
      });
  },
};

// Attendance API methods
export const attendanceAPI = {
  getTodaysAttendance: () => {
    const cacheKey = '/staff/attendance/today';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff/attendance/today')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching today\'s attendance:', error);
        throw error;
      });
  },
  getStaffAttendanceReport: (id) => {
    const cacheKey = `/staff/${id}/attendance`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/staff/${id}/attendance`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching staff attendance report:', error);
        throw error;
      });
  },
  markAttendance: (data) => {
    clearCache('/staff/attendance');
    return api.post('/staff/attendance/mark', data)
      .then(res => res.data)
      .catch(error => {
        console.error('Error marking attendance:', error);
        throw error;
      });
  },
  getAttendance: (params) => {
    const cacheKey = getCacheKey('/staff/attendance/report', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff/attendance/report', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching attendance report:', error);
        throw error;
      });
  },
};

// Clear attendance cache utility
export const clearAttendanceCache = () => {
  clearCache('attendance');
};

// Payroll API methods
export const payrollAPI = {
  getPayrolls: (params) => {
    const cacheKey = getCacheKey('/staff/payroll/history', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff/payroll/history', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching payrolls:', error);
        throw error;
      });
  },

  getPayrollSummary: (params) => {
    const cacheKey = getCacheKey('/staff/payroll/summary', params);
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff/payroll/summary', { params })
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching payroll summary:', error);
        throw error;
      });
  },

  generatePayroll: (data) => {
    clearCache('/staff/payroll');
    return api.post('/staff/payroll/generate', data)
      .then(res => res.data)
      .catch(error => {
        console.error('Error generating payroll:', error);
        // Enhanced error handling for duplicate detection
        if (error.response?.data?.message?.includes('already exists')) {
          throw new Error(`Payroll already exists for this staff member in the selected month/year.`);
        }
        throw error;
      });
  },

  updatePayroll: (id, data) => {
    clearCache('/staff/payroll');
    return api.put(`/staff/payroll/${id}`, data)
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating payroll:', error);
        throw error;
      });
  },

  updatePayrollStatus: (id, status) => {
    clearCache(`/staff/payroll/${id}`);
    clearCache('/staff/payroll');
    return api.patch(`/staff/payroll/${id}/status`, { status })
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating payroll status:', error);
        throw error;
      });
  },

  checkPayrollExists: (params) => {
    return api.get('/staff/payroll/check-exists', { params })
      .then(res => res.data)
      .catch(error => {
        console.error('Error checking payroll existence:', error);
        // If check fails, assume it doesn't exist to allow the main process to handle it
        return { exists: false, payroll: null };
      });
  }
};

// Leave API methods
export const leaveAPI = {
  getLeaveRequests: () => {
    const cacheKey = '/staff/leave/requests';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff/leave/requests')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching leave requests:', error);
        throw error;
      });
  },
  getLeaveBalance: (staffId) => {
    const cacheKey = `/staff/leave/balance/${staffId}`;
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/staff/leave/balance/${staffId}`)
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching leave balance:', error);
        throw error;
      });
  },
  requestLeave: (data) => {
    clearCache('/staff/leave');
    return api.post('/staff/leave/request', data)
      .then(res => res.data)
      .catch(error => {
        console.error('Error requesting leave:', error);
        throw error;
      });
  },
  updateLeaveStatus: (id, status) => {
    clearCache(`/staff/leave/${id}`);
    clearCache('/staff/leave');
    return api.patch(`/staff/leave/${id}/status`, { status })
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating leave status:', error);
        throw error;
      });
  },
};

// Settings API methods
export const settingsAPI = {
  getSettings: () => {
    const cacheKey = '/settings';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/settings')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching settings:', error);
        throw error;
      });
  },
  getQRCodeImage: () => api.get('/settings/qr-code/image', { 
    responseType: 'blob' 
  })
    .then(res => {
      if (res.status === 200) {
        return res.data;
      }
      throw new Error('Failed to fetch QR code image');
    })
    .catch(error => {
      console.error('Error fetching QR code image:', error);
      throw error;
    }),
  updateQRCode: (qrData) => {
    clearCache('/settings');
    return api.post('/settings/qr-code', qrData)
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating QR code:', error);
        throw error;
      });
  },
  generateQRCode: () => {
    clearCache('/settings');
    return api.post('/settings/generate-qr')
      .then(res => res.data)
      .catch(error => {
        console.error('Error generating QR code:', error);
        throw error;
      });
  },
};

// Staff Settings API methods
export const staffSettingsAPI = {
  getStaffSettings: () => {
    const cacheKey = '/staff-settings/settings';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/staff-settings/settings')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching staff settings:', error);
        throw new Error(error.response?.data?.message || 'Failed to fetch staff settings');
      });
  },
  updateStaffSettings: (data) => {
    clearCache('/staff-settings/settings');
    return api.put('/staff-settings/settings', data)
      .then(res => res.data)
      .catch(error => {
        console.error('Error updating staff settings:', error);
        throw new Error(error.response?.data?.message || 'Failed to update staff settings');
      });
  },
  resetStaffSettings: () => {
    clearCache('/staff-settings/settings');
    return api.post('/staff-settings/settings/reset')
      .then(res => res.data)
      .catch(error => {
        console.error('Error resetting staff settings:', error);
        throw new Error(error.response?.data?.message || 'Failed to reset staff settings');
      });
  },
};

// Supplier Transaction API methods
export const supplierTransactionAPI = {
  getSummary: () => {
    const cacheKey = '/transactions/summary';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/transactions/summary')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching supplier transaction summary:', error);
        throw error;
      });
  },
  getPendingPayments: () => {
    const cacheKey = '/transactions/pending-payments';
    const cached = getCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/transactions/pending-payments')
      .then(res => {
        setCache(cacheKey, res.data);
        return res.data;
      })
      .catch(error => {
        console.error('Error fetching pending payments:', error);
        throw error;
      });
  },
};

export default api;