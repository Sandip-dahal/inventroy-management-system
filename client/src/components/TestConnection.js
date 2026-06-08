// src/components/TestConnection.js
import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const TestConnection = () => {
  const [message, setMessage] = useState('Testing connection...');
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const testResponse = await api.get('/test');
        setMessage(`Server connection: ${testResponse.data.message}`);
        
        // Test suppliers endpoint
        const suppliersResponse = await api.get('/suppliers');
        setSuppliers(suppliersResponse.data.suppliers || []);
      } catch (error) {
        setMessage(`Error: ${error.message}`);
        console.error('API test failed:', error);
      }
    };

    testConnection();
  }, []);

  return (
    <div>
      <h2>API Connection Test</h2>
      <p>{message}</p>
      {suppliers.length > 0 && (
        <div>
          <h3>Suppliers ({suppliers.length})</h3>
          <ul>
            {suppliers.map(supplier => (
              <li key={supplier._id}>{supplier.name} - {supplier.companyName}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestConnection;