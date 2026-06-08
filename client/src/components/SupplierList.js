// src/components/SupplierManagement/SupplierList.js
import React from 'react';

const SupplierList = ({ suppliers, onSupplierSelect, onAddSupplier, onEditSupplier, onDeleteSupplier, onRefresh }) => {
  return (
    <div className="supplier-list">
      <div className="table-header">
        <h2>Suppliers</h2>
        <div>
          <button className="btn btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={onAddSupplier}>
            Add New Supplier
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Contact</th>
              <th>Location</th>
              <th>PAN/VAT</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(supplier => (
              <tr key={supplier._id}>
                <td>{supplier.name}</td>
                <td>{supplier.companyName}</td>
                <td>
                  <div>{supplier.contactPerson}</div>
                  <div>{supplier.phone}</div>
                  {supplier.email && <div>{supplier.email}</div>}
                </td>
                <td>
                  {supplier.city}, {supplier.district}
                </td>
                <td>{supplier.panVatNumber || '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => onSupplierSelect(supplier)}
                    >
                      View
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => onEditSupplier(supplier)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => onDeleteSupplier(supplier._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <div className="empty-state">
            <p>No suppliers found. Add your first supplier to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierList;