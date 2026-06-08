import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';

const Sidebar = ({ children }) => {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Define paths where sidebar should NOT appear
  const noSidebarPaths = ['/login', '/signup', '/forgot-password'];
  const showSidebar = !noSidebarPaths.includes(location.pathname);

  // Determine active menu based on current path
  const getActiveMenu = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/barcode')) return 'barcode';
    if (path.includes('/staffmanagement')) return 'staff';
    if (path.includes('/suppliers')) return 'suppliers';
    if (path.includes('/settings')) return 'settings';
    return 'retaildashboard'; // default
  };

  const activeMenu = getActiveMenu();

  const handleMenuClick = (menu) => {
    switch(menu) {
      case 'inventory':
        navigate('/inventory');
        break;
      case 'billing':
        navigate('/billing');
        break;
      case 'barcode':
        navigate('/barcode');
        break;
      case 'staff':
        navigate('/staffmanagement');
        break;
      case 'suppliers':
        navigate('/suppliers');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'logout':
        // Perform logout actions (e.g., clear auth tokens)
        localStorage.removeItem('authToken'); // Example: Clear token from localStorage
        sessionStorage.removeItem('authToken'); // Example: Clear token from sessionStorage
        navigate('/login');
        break;
      default:
        navigate('/retaildashboard');
        break;
    }
  };

  const handleSidebarHover = () => {
    setIsSidebarHovered(true);
  };

  const handleSidebarLeave = () => {
    setIsSidebarHovered(false);
  };

  // Format the page title nicely
  const getPageTitle = () => {
    switch(activeMenu) {
      case 'dashboard':
        return 'Dashboard';
      case 'inventory':
        return 'Inventory Management';
      case 'billing':
        return 'Billing System';
      case 'barcode':
        return 'Barcode Printer';
      case 'staff':
        return 'Staff Management';
      case 'suppliers':
        return 'Suppliers';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Conditionally render sidebar */}
      {showSidebar && (
        <div 
          className={`sidebar ${isSidebarHovered ? 'expanded' : ''}`}
          onMouseEnter={handleSidebarHover}
          onMouseLeave={handleSidebarLeave}
        >
          <div className="logo-container">
            <div className="logo">A</div>
            {isSidebarHovered && <span className="logo-text">Your Shop</span>}
          </div>
          
          <ul className="menu-items">
            <li 
              className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleMenuClick('dashboard')}
            >
              <span className="menu-icon">📊</span>
              {isSidebarHovered && <span className="menu-text">Dashboard</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'inventory' ? 'active' : ''}`}
              onClick={() => handleMenuClick('inventory')}
            >
              <span className="menu-icon">📦</span>
              {isSidebarHovered && <span className="menu-text">Inventory</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'billing' ? 'active' : ''}`}
              onClick={() => handleMenuClick('billing')}
            >
              <span className="menu-icon">🧾</span>
              {isSidebarHovered && <span className="menu-text">Billing</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'barcode' ? 'active' : ''}`}
              onClick={() => handleMenuClick('barcode')}
            >
              <span className="menu-icon">📠</span>
              {isSidebarHovered && <span className="menu-text">Barcode Printer</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'staff' ? 'active' : ''}`}
              onClick={() => handleMenuClick('staff')}
            >
              <span className="menu-icon">👨‍💼</span>
              {isSidebarHovered && <span className="menu-text">Staff</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'suppliers' ? 'active' : ''}`}
              onClick={() => handleMenuClick('suppliers')}
            >
              <span className="menu-icon">🚚</span>
              {isSidebarHovered && <span className="menu-text">Suppliers</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'settings' ? 'active' : ''}`}
              onClick={() => handleMenuClick('settings')}
            >
              <span className="menu-icon">⚙️</span>
              {isSidebarHovered && <span className="menu-text">Settings</span>}
            </li>
            
            <li 
              className={`menu-item ${activeMenu === 'logout' ? 'active' : ''}`}
              onClick={() => handleMenuClick('logout')}
            >
              <span className="menu-icon">🚪</span>
              {isSidebarHovered && <span className="menu-text">Logout</span>}
            </li>
          </ul>
        </div>
      )}

      <div className={`main-content ${showSidebar ? (isSidebarHovered ? 'sidebar-expanded' : 'sidebar-collapsed') : 'no-sidebar'}`}>
        {showSidebar && (
          <div className="header">
            <h1 className="page-title">
              {getPageTitle()}
            </h1>
          </div>
        )}
        
        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;