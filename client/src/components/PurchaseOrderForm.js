import React, { useState, useEffect, useRef, useCallback } from 'react';
import { purchaseOrderAPI } from '../services/api';
import { getShopSettings } from '../utils/settings';
import ErrorBoundary from './ErrorBoundary';
import '../styles/PurchaseOrderForm.css';
import html2canvas from 'html2canvas';
import { ensureQRCodeFormat } from '../utils/settings';
import jsPDF from 'jspdf';

const PurchaseOrderForm = ({ purchaseOrder, suppliers, onSubmit, onCancel, loading }) => {
  const [settings, setSettings] = useState({});
  const [formData, setFormData] = useState({
    supplier: purchaseOrder?.supplier?._id || purchaseOrder?.supplier || '',
    expectedDeliveryDate: purchaseOrder?.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0] : '',
    items: purchaseOrder?.items || [{
      product: '', 
      quantity: 1, 
      size: '',
      color: '',
      fabric: '',
      brand: ''
    }],
    notes: purchaseOrder?.notes || '',
    sendWhatsApp: false,
    sendEmail: true // Default to true for automatic email sending
  });
// Add this to your component
const debugQRCode = async () => {
  try {
    const response = await fetch('/api/purchase-orders/debug-qr-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'debug-purchase-order.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert('Debug failed: ' + response.status);
    }
  } catch (error) {
    console.error('Debug error:', error);
    alert('Debug failed: ' + error.message);
  }
};

// Add this button to your JSX
<button 
  type="button" 
  className="po-btn po-btn-warning"
  onClick={debugQRCode}
  style={{ marginLeft: '10px' }}
>
  Debug QR Code
</button>
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const [autoSendEmail, setAutoSendEmail] = useState(true); // Default to auto-send
  const previewRef = useRef(null);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);
        const shopSettings = await getShopSettings();
        setSettings(shopSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings({});
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (purchaseOrder?.poNumber) {
      setFormData(prev => ({
        ...prev,
        poNumber: purchaseOrder.poNumber
      }));
    }
  }, [purchaseOrder]);

  useEffect(() => {
    if (formData.supplier) {
      const supplier = suppliers.find(s => s._id === formData.supplier);
      setSelectedSupplier(supplier || null);
    }
  }, [formData.supplier, suppliers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'supplier') {
      const supplier = suppliers.find(s => s._id === value);
      setSelectedSupplier(supplier);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      
      if (field === 'quantity') {
        value = parseInt(value) || 0;
      }
      
      updatedItems[index][field] = value;
      
      return {
        ...prev,
        items: updatedItems
      };
    });

    // Clear item errors
    if (errors[`item-${index}-${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item-${index}-${field}`];
        return newErrors;
      });
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        product: '', 
        quantity: 1, 
        size: '',
        color: '',
        fabric: '',
        brand: ''
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => {
        const updatedItems = [...prev.items];
        updatedItems.splice(index, 1);
        return {
          ...prev,
          items: updatedItems
        };
      });
    }
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.supplier) {
      newErrors.supplier = 'Supplier is required';
    }
    
    formData.items.forEach((item, index) => {
      if (!item.product || item.product.trim() === '') {
        newErrors[`item-${index}-product`] = 'Product name is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item-${index}-quantity`] = 'Valid quantity is required';
      }
    });
    
    return newErrors;
  }, [formData.supplier, formData.items]);

  const generatePDF = async () => {
    if (!previewRef.current) return null;
    
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      return { pdfBlob, url, pdfData: pdf };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  };

  const sendWhatsAppMessage = async () => {
    if (!selectedSupplier || !selectedSupplier.phone) {
      alert('Supplier does not have a phone number');
      return;
    }
    
    try {
      const pdfResult = await generatePDF();
      if (!pdfResult) return;
      
      const { url } = pdfResult;
      
      // Create a simple WhatsApp message
      const message = `Hello ${selectedSupplier.contactPerson || selectedSupplier.name},\n\nPlease find attached our purchase order.`;
      const encodedMessage = encodeURIComponent(message);
      
      // For WhatsApp Web API
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${selectedSupplier.phone.replace(/\D/g, '')}&text=${encodedMessage}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      // Note: User will need to manually attach the PDF
      alert('WhatsApp message prepared. Please attach the PDF manually.');
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      alert('Failed to prepare WhatsApp message');
    }
  };

  const sendEmail = async (poId, pdfBlob) => {
    if (!selectedSupplier || !selectedSupplier.email) {
      throw new Error('Supplier does not have an email address');
    }
    
    try {
      // Create FormData to send both the PO ID and the PDF
      const formData = new FormData();
      formData.append('poId', poId);
      
      if (pdfBlob) {
        formData.append('pdf', pdfBlob, `Purchase_Order_${poId}.pdf`);
      }
      
      const response = await purchaseOrderAPI.sendEmailWithNodemailer(formData);
      
      if (response.status === 'success') {
        return true;
      } else {
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const downloadPDF = async () => {
    try {
      const pdfResult = await generatePDF();
      if (!pdfResult) return;
      
      const { url } = pdfResult;
      const a = document.createElement('a');
      a.href = url;
      a.download = `Purchase_Order_${formData.poNumber || 'New'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };


const handleSubmit = async (e) => {
  e.preventDefault();
  
  const formErrors = validateForm();
  if (Object.keys(formErrors).length > 0) {
    setErrors(formErrors);
    alert('Please fix the form errors before submitting.');
    return;
  }
  
  try {
    setLocalLoading(true);
    
    // Generate PDF before submission
    let pdfBlob = null;
    try {
      const pdfResult = await generatePDF();
      if (pdfResult) {
        pdfBlob = pdfResult.pdfBlob;
      }
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF if generation fails
    }
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      autoSendEmail: autoSendEmail,
      status: 'Pending',
      items: formData.items.map(item => ({
        ...item,
        product: item.product.trim(),
        receivedQuantity: 0
      }))
    };
    
    // Submit to backend
    const response = await purchaseOrderAPI.createPurchaseOrder(submitData);
    
    if (response.status === 'success') {
      const savedPO = response.data.purchaseOrder;
      
      // If auto-send email is enabled, send it with PDF attachment
      if (autoSendEmail && savedPO._id) {
        try {
          // Send email with PDF attachment
          if (pdfBlob) {
            await sendEmailWithAttachment(savedPO._id, pdfBlob);
            alert('Purchase order created and email with PDF sent successfully!');
          } else {
            // Fallback: send email without attachment
            await purchaseOrderAPI.sendEmailWithAttachment(savedPO._id);
            alert('Purchase order created and email sent (without PDF attachment)!');
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          alert('Purchase order created successfully, but email sending failed. You can send it manually later.');
        }
      } else {
        alert('Purchase order created successfully!');
      }
      
      // Reset form or redirect
      if (onCancel) onCancel();
    }
  } catch (error) {
    console.error('Error saving purchase order:', error);
    alert(`Failed to save purchase order: ${error.response?.data?.message || error.message}`);
  } finally {
    setLocalLoading(false);
  }
};

// Update the sendEmailWithAttachment function to accept PDF blob
const sendEmailWithAttachment = async (poId, pdfBlob) => {
  try {
    // Create FormData to send both the PO ID and the PDF
    const formData = new FormData();
    formData.append('poId', poId);
    
    if (pdfBlob) {
      formData.append('pdf', pdfBlob, `Purchase_Order_${poId}.pdf`);
    }
    
    const response = await purchaseOrderAPI.sendEmailWithAttachment(formData);
    
    if (response.status === 'success') {
      return true;
    } else {
      throw new Error(response.message || 'Failed to send email');
    }
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    throw error;
  }
};


// Remove the sendEmailWithAttachment function and all PDF generation from frontend




  // Generate preview content
  const generatePreviewContent = useCallback(() => {
    const formErrors = validateForm();
       const formattedSettings = ensureQRCodeFormat(settings);
    if (Object.keys(formErrors).length > 0) {
      return (
        <div className="preview-error">
          Please fix form errors to generate preview
        </div>
      );
    }
 
    return (
      <div className="preview-container" ref={previewRef}>
        <div className="preview-header">
          <div className="shop-info">
            <h2>{settings.shopInfo?.name || 'Your Shop'}</h2>
            <p>{settings.shopInfo?.address || 'Shop Address'}</p>
            <p>Phone: {settings.shopInfo?.contactNumber || 'N/A'}</p>
            <p>Email: {settings.shopInfo?.email || 'N/A'}</p>
          </div>
          <div className="preview-dates">
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Expected Delivery:</strong> {formData.expectedDeliveryDate || 'Not specified'}</p>
          </div>
        </div>
        
        <div className="preview-body">
          <h3>PURCHASE ORDER</h3>
          
          <div className="supplier-info">
            <p><strong>Supplier:</strong> {selectedSupplier?.name || selectedSupplier?.companyName || 'Unknown Supplier'}</p>
            {selectedSupplier?.phone && <p><strong>Phone:</strong> {selectedSupplier.phone}</p>}
            {selectedSupplier?.email && <p><strong>Email:</strong> {selectedSupplier.email}</p>}
            {selectedSupplier?.address && <p><strong>Address:</strong> {selectedSupplier.address}</p>}
          </div>
          
          <table className="preview-items">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Fabric</th>
                <th>Size</th>
                <th>Color</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.product}</td>
                  <td>{item.brand}</td>
                  <td>{item.fabric}</td>
                  <td>{item.size}</td>
                  <td>{item.color}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {formData.notes && (
            <div className="preview-notes">
              <h4>Notes:</h4>
              <p>{formData.notes}</p>
            </div>
          )}
          
          <div className="preview-footer">
              {formattedSettings.qrCodeImage && (
        <div className="qr-code-section">
          <img 
            src={formattedSettings.qrCodeImage} 
            alt="QR Code" 
            className="qr-code-image"
            style={{ width: '100px', height: '100px' }}
          />
          <p>Scan for contact information</p>
        </div>
      )}
            
            <div className="signature">
              <p>_________________________</p>
              <p>Authorized Signature</p>
              <p>{settings.shopInfo?.name || 'Your Company'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formData, selectedSupplier, settings, validateForm]);

  if (isLoadingSettings) {
    return <div>Loading settings...</div>;
  }

  return (
    <ErrorBoundary>
      <div className="purchase-order-form-container">
        <h2>{purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
        
        {formData.poNumber && (
          <div className="po-number-display">
            <strong>PO Number:</strong> {formData.poNumber}
            <input type="hidden" name="poNumber" value={formData.poNumber} />
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="po-form-group">
            <label>Supplier *</label>
            <select 
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              className={errors.supplier ? 'po-error' : ''}
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name} - {supplier.companyName}
                </option>
              ))}
            </select>
            {errors.supplier && <span className="po-error-text">{errors.supplier}</span>}
          </div>

          <div className="po-form-section">
            <h3>Items *</h3>
            <div className="po-item-rows-container">
              {formData.items.map((item, index) => (
                <div key={index} className="po-item-row">
                  <div className="po-item-row-grid">
                    <div className="po-item-field">
                      <label>Product/Item Name *</label>
                      <input
                        type="text"
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        placeholder="Item description"
                        className={errors[`item-${index}-product`] ? 'po-error' : ''}
                      />
                      {errors[`item-${index}-product`] && (
                        <span className="po-error-text">{errors[`item-${index}-product`]}</span>
                      )}
                    </div>
                    
                    <div className="po-item-field">
                      <label>Brand</label>
                      <input
                        type="text"
                        value={item.brand || ''}
                        onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                        placeholder="Brand name"
                      />
                    </div>
                    
                    <div className="po-item-field">
                      <label>Fabric</label>
                      <input
                        type="text"
                        value={item.fabric || ''}
                        onChange={(e) => handleItemChange(index, 'fabric', e.target.value)}
                        placeholder="Fabric type"
                      />
                    </div>
                    
                    <div className="po-item-field">
                      <label>Size</label>
                      <select
                        value={item.size}
                        onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                      >
                        <option value="">Select Size</option>
                        {settings.inventoryOptions?.sizes?.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="po-item-field">
                      <label>Color</label>
                      <select
                        value={item.color}
                        onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                      >
                        <option value="">Select Color</option>
                        {settings.inventoryOptions?.colors?.map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="po-item-field">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="1"
                        className={errors[`item-${index}-quantity`] ? 'po-error' : ''}
                      />
                      {errors[`item-${index}-quantity`] && (
                        <span className="po-error-text">{errors[`item-${index}-quantity`]}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="po-item-actions">
                    <button 
                      type="button" 
                      className="po-btn po-btn-danger po-btn-sm"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length <= 1}
                    >
                      Remove Item
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="po-btn po-btn-secondary" onClick={addItem}>
                + Add Item
              </button>
            </div>
          </div>

          <div className="po-form-group">
            <label>Expected Delivery Date</label>
            <input 
              type="date" 
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate}
              onChange={handleChange}
            />
          </div>

          <div className="po-form-group">
            <label>Notes</label>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3" 
              placeholder="Additional notes for the supplier"
            />
          </div>

          <div className="po-form-group">
            <label>
              <input
                type="checkbox"
                checked={autoSendEmail}
                onChange={(e) => setAutoSendEmail(e.target.checked)}
              />
              Automatically send email to supplier after saving
            </label>
          </div>

          <div className="po-preview-section">
            <h3>Preview</h3>
            {generatePreviewContent()}
          </div>

          <div className="po-preview-actions">
            <h4>Actions</h4>
            <div className="po-action-buttons">
              <button 
                type="button" 
                className="po-btn po-btn-success"
                onClick={sendWhatsAppMessage}
                disabled={!selectedSupplier?.phone}
              >
                Send via WhatsApp
              </button>
              <button 
                type="button" 
                className="po-btn po-btn-info"
                onClick={downloadPDF}
              >
                Download PDF
              </button>
            </div>
          </div>

          <div className="po-form-actions">
            <button type="button" className="po-btn po-btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="po-btn po-btn-primary" disabled={localLoading}>
              {localLoading ? 'Saving...' : (purchaseOrder ? 'Update' : 'Create')} Purchase Order
            </button>
          </div>
        </form>
      </div>
    </ErrorBoundary>
  );
};

export default PurchaseOrderForm;