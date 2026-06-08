// src/components/SupplierManagement/SupplierDetails.js
import React from 'react';

const SupplierDetails = ({ supplier, onBack, onEdit, onDelete }) => {
  return (
    <div className="supplier-details">
      <div className="details-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Suppliers
        </button>
        <h2>Supplier Details: {supplier.name}</h2>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="details-content">
        <div className="info-section">
          <h3>Basic Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Company Name:</label>
              <span>{supplier.companyName}</span>
            </div>
            <div className="info-item">
              <label>Contact Person:</label>
              <span>{supplier.contactPerson}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span>{supplier.phone}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{supplier.email || '-'}</span>
            </div>
            <div className="info-item">
              <label>PAN/VAT:</label>
              <span>{supplier.panVatNumber || '-'}</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3>Address</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Province:</label>
              <span>{supplier.province}</span>
            </div>
            <div className="info-item">
              <label>District:</label>
              <span>{supplier.district}</span>
            </div>
            <div className="info-item">
              <label>City:</label>
              <span>{supplier.city}</span>
            </div>
            {supplier.streetAddress && (
              <div className="info-item">
                <label>Street Address:</label>
                <span>{supplier.streetAddress}</span>
              </div>
            )}
          </div>
        </div>

        {supplier.bankAccountDetails && (
          <div className="info-section">
            <h3>Bank Account Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Bank Name:</label>
                <span>{supplier.bankAccountDetails.bankName}</span>
              </div>
              <div className="info-item">
                <label>Account Number:</label>
                <span>{supplier.bankAccountDetails.accountNumber}</span>
              </div>
              <div className="info-item">
                <label>Account Holder:</label>
                <span>{supplier.bankAccountDetails.accountHolder}</span>
              </div>
            </div>
          </div>
        )}

        {supplier.notes && (
          <div className="info-section">
            <h3>Notes</h3>
            <p>{supplier.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDetails;