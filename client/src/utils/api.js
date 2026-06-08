import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const api = axios.create({ 
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData).then(res => res.data),
  login: (email, password) => api.post('/auth/login', { email, password }).then(res => res.data),
  getMe: () => api.get('/auth/me').then(res => res.data),
  verifyPassword: (password) => api.post('/auth/verify-password', { password }).then(res => res.data)
};

// Products API methods
export const productsAPI = {
  getProducts: () => api.get('/inventory').then(res => res.data),
  getProduct: (id) => api.get(`/inventory/${id}`).then(res => res.data),
  createProduct: (productData) => api.post('/inventory', productData).then(res => res.data),
  updateProduct: (id, productData) => api.put(`/inventory/${id}`, productData).then(res => res.data),
  deleteProduct: (id) => api.delete(`/inventory/${id}`).then(res => res.data),
  getLowStock: () => api.get('/inventory/low-stock').then(res => res.data),
  updateStock: (id, stockData) => api.patch(`/inventory/${id}/stock`, stockData).then(res => res.data),
};

// Alias for backward compatibility
export const inventoryAPI = productsAPI;

// Supplier API methods
export const supplierAPI = {
  getSuppliers: () => api.get('/suppliers').then(res => res.data),
  getSupplier: (id) => api.get(`/suppliers/${id}`).then(res => res.data),
  createSupplier: (supplierData) => api.post('/suppliers', supplierData).then(res => res.data),
  updateSupplier: (id, supplierData) => api.put(`/suppliers/${id}`, supplierData).then(res => res.data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`).then(res => res.data),
  getSupplierTransactions: (id) => api.get(`/suppliers/${id}/transactions`).then(res => res.data),
  getSupplierPurchaseOrders: (id) => api.get(`/suppliers/${id}/purchase-orders`).then(res => res.data),
  getSupplierBalance: (id) => api.get(`/suppliers/${id}/balance`).then(res => res.data),
};

// Purchase Order API methods
export const purchaseOrderAPI = {
  getPurchaseOrders: (params) => api.get('/purchase-orders', { params }).then(res => res.data),
  getPurchaseOrder: (id) => api.get(`/purchase-orders/${id}`).then(res => res.data),
  createPurchaseOrder: (orderData) => api.post('/purchase-orders', orderData).then(res => res.data),
  updatePurchaseOrder: (id, orderData) => api.put(`/purchase-orders/${id}`, orderData).then(res => res.data),
  updatePurchaseOrderStatus: (id, status) => api.patch(`/purchase-orders/${id}/status`, { status }).then(res => res.data),
  deletePurchaseOrder: (id) => api.delete(`/purchase-orders/${id}`).then(res => res.data),
};

// Transaction API methods - FIXED: Use api instance instead of axios directly
export const transactionAPI = {
  getTransactions: (params) => api.get('/transactions', { params }).then(res => res.data),
  getTransaction: (id) => api.get(`/transactions/${id}`).then(res => res.data),
  createTransaction: (data) => api.post('/transactions', data).then(res => res.data),
  updateTransaction: (id, data) => api.put(`/transactions/${id}`, data).then(res => res.data),
  deleteTransaction: (id) => api.delete(`/transactions/${id}`).then(res => res.data),
  getTransactionSummary: () => api.get('/transactions/summary').then(res => res.data),
};

// Billing API methods
export const billingAPI = {
  getNextBillNumber: () => api.get('/bills/next-number').then(res => res.data),
  createBill: (billData) => api.post('/bills', billData).then(res => res.data),
  getBills: (page = 1, limit = 20) => api.get(`/bills?page=${page}&limit=${limit}`).then(res => res.data),
  getBill: (billNumber) => api.get(`/bills/${billNumber}`).then(res => res.data),
  deleteBill: (id) => api.delete(`/bills/${id}`).then(res => res.data),
  updateProductStock: (productId, newStock) => 
    api.patch(`/products/${productId}/stock`, { stock: newStock }).then(res => res.data)
};

export default api;