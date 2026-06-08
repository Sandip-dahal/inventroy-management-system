// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import { SidebarProvider } from './contexts/SidebarContext';
import Signup from './pages/Signup';
import Settings from './pages/settings';
import Dashboard from './pages/sidebar';
import Inventory from './pages/Inventory';
import ProductBarcodePage from './pages/ProductBarcodePage';
import Billing from './pages/Billing';
import ForgotPassword from './components/ForgotPassword';
import Suppliers from './pages/Suppliers';
import RetailDashboard from './pages/RetailDashboard';
import StaffManagementSystem from './pages/StaffManagementSystem';
import SalesDashboard from './pages/SalesDashboard';
import CustomersDashboard from './pages/CustomersDashboard'; // Add this import
import './App.css';

// A simple protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Layout component to handle sidebar and content
const DashboardLayout = ({ children }) => {
  return (
    <Dashboard>
      {children}
    </Dashboard>
  );
};

function App() {
  return (
    <SidebarProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes (no sidebar) */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgotpassword" element={<ForgotPassword />} />
              
              {/* Protected routes (with sidebar) */}
              <Route 
                path="/retaildashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <RetailDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/inventory" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Inventory />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/salesdashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SalesDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/customersdashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CustomersDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/staffmanagement" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <StaffManagementSystem />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Settings />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/barcode" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ProductBarcodePage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/billing" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Billing />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/suppliers" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Suppliers />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/retaildashboard" />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </SidebarProvider>
  );
}

export default App;