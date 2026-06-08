import React, { useState, useEffect, useRef } from 'react';
import { inventoryAPI, billingAPI, settingsAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/Billing.css';

const Billing = () => {
  // State management
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  const [pricingMode, setPricingMode] = useState('fixed');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [heldBills, setHeldBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [currentBill, setCurrentBill] = useState(null);
  const [shopName, setShopName] = useState('My Shop');
  const [shopInfo, setShopInfo] = useState({});
  const [qrCodeContent, setQrCodeContent] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [cartErrors, setCartErrors] = useState({}); // Track errors for each cart item

  // Refs
  const barcodeInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const receiptRef = useRef(null);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discountValue / 100) 
    : discountType === 'fixed' ? discountValue : 0;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = vatRegistered ? (taxableAmount * (vatRate / 100)) : 0;
  const grandTotal = taxableAmount + taxAmount;

  // Check if cart has validation errors
  const hasCartErrors = () => {
    return Object.values(cartErrors).some(error => error !== '');
  };

  // Validate cart items
  const validateCart = () => {
    const errors = {};
    
    cart.forEach((item, index) => {
      if (item.price === 0 && (!item.remarks || item.remarks.trim() === '')) {
        errors[index] = 'Remarks are required for free items';
      } else {
        errors[index] = '';
      }
    });
    
    setCartErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // Get next bill number
  const getNextBillNumber = async () => {
    try {
      const response = await billingAPI.getNextBillNumber();
      if (response && response.nextBillNumber !== undefined) {
        return response.nextBillNumber;
      }
      // Fallback: use localStorage if API response doesn't have nextBillNumber
      const billingHistory = JSON.parse(localStorage.getItem('billingHistory') || '[]');
      const lastBill = billingHistory[billingHistory.length - 1];
      return lastBill ? lastBill.billNumber + 1 : 1;
    } catch (error) {
      console.error('Error getting next bill number:', error);
      // Fallback: use localStorage if API fails
      const billingHistory = JSON.parse(localStorage.getItem('billingHistory') || '[]');
      const lastBill = billingHistory[billingHistory.length - 1];
      return lastBill ? lastBill.billNumber + 1 : 1;
    }
  };

  // Get Nepali date
  const getNepaliDate = () => {
    const now = new Date();
    const nepaliMonths = [
      'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
      'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
    ];
    
    const year = now.getFullYear() + 57;
    const month = nepaliMonths[now.getMonth()];
    const day = now.getDate();
    
    return `${year} ${month} ${day}`;
  };

  // Filter and sort products
  useEffect(() => {
    if (!Array.isArray(products)) return;
    
    let filtered = [...products];
    
    if (searchTerm) {
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && product.barcode.includes(searchTerm)) ||
        (product.nepaliName && product.nepaliName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort products
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'price':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'stock':
          return a.stock - b.stock;
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    setFilteredProducts(filtered);
  }, [searchTerm, products, sortBy]);

  // Generate QR code content from shop info
  const generateQRContent = (shopInfo) => {
    let content = '';
    
    if (shopInfo.name) content += `SHOP: ${shopInfo.name}\n`;
    if (shopInfo.address) content += `ADDRESS: ${shopInfo.address}\n`;
    if (shopInfo.contactNumber) content += `PHONE: ${shopInfo.contactNumber}\n`;
    if (shopInfo.phone) content += `TEL: ${shopInfo.phone}\n`;
    if (shopInfo.email) content += `EMAIL: ${shopInfo.email}\n`;
    
    // Social media links
    if (shopInfo.facebook) content += `FB: ${shopInfo.facebook}\n`;
    if (shopInfo.youtube) content += `YT: ${shopInfo.youtube}\n`;
    if (shopInfo.tiktok) content += `TT: ${shopInfo.tiktok}\n`;
    if (shopInfo.instagram) content += `IG: ${shopInfo.instagram}\n`;
    
    return content || 'No contact information configured';
  };

  // Format QR content for display
  const formatQRContentForDisplay = (content) => {
    if (!content) return '';
    
    return content.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        if (line.startsWith('SHOP:')) return line.replace('SHOP:', '<strong>Shop:</strong>');
        if (line.startsWith('ADDRESS:')) return line.replace('ADDRESS:', '<strong>Address:</strong>');
        if (line.startsWith('PHONE:')) return line.replace('PHONE:', '<strong>Phone:</strong>');
        if (line.startsWith('TEL:')) return line.replace('TEL:', '<strong>Tel:</strong>');
        if (line.startsWith('EMAIL:')) return line.replace('EMAIL:', '<strong>Email:</strong>');
        if (line.startsWith('FB:')) return line.replace('FB:', '<strong>Facebook:</strong>');
        if (line.startsWith('YT:')) return line.replace('YT:', '<strong>YouTube:</strong>');
        if (line.startsWith('TT:')) return line.replace('TT:', '<strong>TikTok:</strong>');
        if (line.startsWith('IG:')) return line.replace('IG:', '<strong>Instagram:</strong>');
        return line;
      })
      .join('<br>');
  };

  // Fetch QR code image from settings
  const fetchQRCodeImage = async () => {
    try {
      const response = await settingsAPI.getQRCodeImage();
      if (response) {
        // Create a URL for the blob image
        const imageUrl = URL.createObjectURL(response);
        setQrCodeImage(imageUrl);
      }
    } catch (error) {
      console.error('Error fetching QR code image:', error);
      // Fallback to text QR code if image is not available
      setQrCodeImage('');
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getProducts();
      setProducts(response.data.products || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
      setLoading(false);
    }
  };

  // Load held bills
  const loadHeldBills = () => {
    const savedBills = localStorage.getItem('heldBills');
    if (savedBills) {
      setHeldBills(JSON.parse(savedBills));
    }
  };

  // Load shop settings from localStorage
  const loadShopSettings = () => {
    const settings = localStorage.getItem('shopSettings');
    if (settings) {
      try {
        const parsedSettings = JSON.parse(settings);
        setVatRegistered(parsedSettings.vatEnabled || false);
        setVatRate(parsedSettings.vatRate || 0);
        setPricingMode(parsedSettings.pricingMode || 'fixed');
        
        // Set shop info with proper defaults
        const shopInfo = parsedSettings.shopInfo || {};
        setShopName(shopInfo.name || 'My Shop');
        setShopInfo(shopInfo);
        
        // Generate QR code content from shop info
        const qrContent = generateQRContent(shopInfo);
        setQrCodeContent(qrContent);
      } catch (error) {
        console.error('Error parsing shop settings:', error);
        // Set default values if parsing fails
        setShopName('My Shop');
        setShopInfo({});
        setQrCodeContent('No contact information configured');
      }
    } else {
      // Set default values if no settings found
      setShopName('My Shop');
      setShopInfo({});
      setQrCodeContent('No contact information configured');
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle barcode scan
  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const barcode = e.target.value;
      const product = products.find(p => p.barcode === barcode);
      
      if (product) {
        addToCart(product);
        e.target.value = '';
        setError(null);
      } else {
        setError('Product not found with this barcode');
      }
    }
  };

  // Add to cart
  const addToCart = (product) => {
    if (product.stock <= 0) {
      setError('Product is out of stock');
      return;
    }
    
    // If pricing mode is variable, allow price editing
    const cartItem = {
      ...product,
      quantity: 1,
      discount: 0,
      // Store the original price separately for reference
      originalPrice: product.price,
      // Allow price editing only in variable mode
      editablePrice: pricingMode === 'variable',
      // Add remarks field if price is 0
      remarks: product.price === 0 ? '' : undefined
    };
    
    const existingItemIndex = cart.findIndex(item => item._id === product._id && 
      item.size === product.size && item.color === product.color);
    
    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      if (updatedCart[existingItemIndex].quantity < product.stock) {
        updatedCart[existingItemIndex].quantity += 1;
        setCart(updatedCart);
      } else {
        setError('Not enough stock available');
      }
    } else {
      setCart([...cart, cartItem]);
    }
    
    // Validate cart after adding item
    setTimeout(() => validateCart(), 0);
  };

  // Update quantity
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = [...cart];
    if (newQuantity <= updatedCart[index].stock) {
      updatedCart[index].quantity = newQuantity;
      setCart(updatedCart);
    } else {
      setError('Not enough stock available');
    }
  };

  // Update item price
  const updateItemPrice = (index, newPrice) => {
    if (pricingMode !== 'variable') return;
    
    if (newPrice < 0) return;
    
    const updatedCart = [...cart];
    updatedCart[index].price = parseFloat(newPrice) || 0;
    
    // Add or remove remarks field based on price
    if (updatedCart[index].price === 0 && !updatedCart[index].hasOwnProperty('remarks')) {
      updatedCart[index].remarks = '';
    } else if (updatedCart[index].price > 0 && updatedCart[index].hasOwnProperty('remarks')) {
      delete updatedCart[index].remarks;
    }
    
    setCart(updatedCart);
    
    // Validate cart after price change
    setTimeout(() => validateCart(), 0);
  };

  // Update item remarks
  const updateItemRemarks = (index, remarks) => {
    const updatedCart = [...cart];
    updatedCart[index].remarks = remarks;
    setCart(updatedCart);
    
    // Validate cart after remarks change
    setTimeout(() => validateCart(), 0);
  };

  // Remove from cart
  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
    
    // Remove error for this item
    const updatedErrors = {...cartErrors};
    delete updatedErrors[index];
    setCartErrors(updatedErrors);
  };

  // Handle payment confirmation from modal
  const handlePaymentConfirm = async (payment) => {
    // Validate cart before proceeding
    if (!validateCart()) {
      setError('Please fill in all required remarks for free items');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create bill data
      const billNumber = await getNextBillNumber();
      const nepaliDate = getNepaliDate();
      
      const billData = {
        billNumber,
        nepaliDate,
        items: cart,
        customer,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal,
        payment, // Use the payment object instead of paymentMethod
        date: new Date().toISOString(),
        shopName,
        shopInfo,
        vatRate: vatRegistered ? vatRate : 0,
        vatEnabled: vatRegistered,
        qrCodeContent, // Include QR code content in bill data
        qrCodeImage // Include QR code image in bill data
      };
      
      setCurrentBill(billData);
      setIsReceiptModalOpen(true);
      setIsPaymentModalOpen(false);
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error during checkout:', error);
      setError('Failed to complete sale. Please try again.');
      setLoading(false);
    }
  };

  // Save bill to Firebase and update stock
  const saveBill = async () => {
    try {
      setLoading(true);
      
      // Prepare bill data with all required fields
      const billData = {
        ...currentBill,
        items: currentBill.items.map(item => ({
          ...item,
          productId: item._id, // Ensure productId is included
          stockAtTimeOfSale: item.stock // Capture stock at time of sale
        }))
      };
      
      // Save bill to database
      const response = await billingAPI.createBill(billData);
      
      if (response && response.success) {
        // Update product stock in database
        const updatePromises = currentBill.items.map(item => 
          inventoryAPI.updateProduct(item._id, { 
            stock: item.stock - item.quantity 
          })
        );
        
        await Promise.all(updatePromises);
        
        // Reset cart and close modal
        setCart([]);
        setCustomer(null);
        setDiscountType('none');
        setDiscountValue(0);
        setIsReceiptModalOpen(false);
        setCartErrors({});
        
        setLoading(false);
        
        // Show success message
        alert('Bill saved successfully! Stock updated.');
      } else {
        throw new Error('Failed to save bill to database');
      }
      
    } catch (error) {
      console.error('Error saving bill:', error);
      setError('Failed to save bill. Please try again.');
      setLoading(false);
    }
  };

  // Print bill function
  const printBill = () => {
    const printWindow = window.open('', '_blank');
    
    // Compute payment HTML for print
    let paymentHtml = '';
    if (currentBill.payment.type === 'single') {
      const method = currentBill.payment.methods[0].method;
      if (method === 'credit') {
        paymentHtml = `CREDIT<br>Outstanding: NPR ${currentBill.payment.outstandingAmount.toFixed(2)}`;
      } else {
        paymentHtml = `${method.toUpperCase()}<br>Amount Paid: NPR ${currentBill.payment.totalPaid.toFixed(2)}`;
        if (currentBill.payment.change > 0) {
          paymentHtml += `<br>Change: NPR ${currentBill.payment.change.toFixed(2)}`;
        }
      }
    } else {
      paymentHtml = 'SPLIT PAYMENT<br>';
      currentBill.payment.methods.forEach(m => {
        paymentHtml += `${m.method.toUpperCase()}: NPR ${m.amount.toFixed(2)}<br>`;
      });
      paymentHtml += `Total Paid: NPR ${currentBill.payment.totalPaid.toFixed(2)}`;
      if (currentBill.payment.change > 0) {
        paymentHtml += `<br>Change: NPR ${currentBill.payment.change.toFixed(2)}`;
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill ${currentBill.billNumber}</title>
          <meta charset="utf-8">
          <style>
            /* Modern Receipt Styles */
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 15px;
              background: white;
              color: #000;
              line-height: 1.4;
              font-size: 12px;
            }
            
            .receipt-container {
              max-width: 280px;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #ccc;
            }
            
            .shop-name {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            
            .shop-info {
              font-size: 10px;
              margin-bottom: 3px;
            }
            
            .bill-meta {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 11px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            
            .items-table th {
              text-align: left;
              border-bottom: 1px solid #000;
              padding: 5px 0;
              font-weight: bold;
            }
            
            .items-table td {
              padding: 6px 0;
              border-bottom: 1px dashed #eee;
              vertical-align: top;
            }
            
            .item-details {
              font-size: 10px;
              color: #666;
              margin-top: 2px;
            }
            
            .item-remarks {
              font-size: 10px;
              color: #e74c3c;
              font-style: italic;
              margin-top: 2px;
            }
            
            .summary {
              margin-top: 15px;
              border-top: 1px dashed #ccc;
              padding-top: 10px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            
            .grand-total {
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 8px;
              font-size: 14px;
            }
            
            .payment-method {
              text-align: center;
              margin: 15px 0;
              padding: 8px;
              background: #f5f5f5;
              border-radius: 4px;
              font-weight: bold;
            }
            
            .qr-section {
              text-align: center;
              margin: 15px 0;
              padding: 10px;
              border: 1px dashed #ccc;
              border-radius: 5px;
            }
            
            .qr-title {
              font-weight: bold;
              margin-bottom: 5px;
              font-size: 11px;
            }
            
            .qr-content {
              font-size: 10px;
              margin: 5px 0;
              line-height: 1.2;
            }
            
            .thank-you {
              text-align: center;
              margin-top: 15px;
              font-style: italic;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 10px;
              color: #666;
            }
            
            @media print {
              body {
                padding: 10px;
              }
              
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="shop-name">${currentBill.shopName}</div>
              ${currentBill.shopInfo?.address ? `<div class="shop-info">${currentBill.shopInfo.address}</div>` : ''}
              ${currentBill.shopInfo?.phone ? `<div class="shop-info">Tel: ${currentBill.shopInfo.phone}</div>` : ''}
            </div>
            
            <div class="bill-meta">
              <div>Bill #: ${currentBill.billNumber}</div>
              <div>Date: ${currentBill.nepaliDate}</div>
            </div>
            
            ${currentBill.customer ? `
              <div style="margin-bottom: 10px;">
                <strong>Customer:</strong> ${currentBill.customer.name}
                ${currentBill.customer.phone ? `<br><strong>Phone:</strong> ${currentBill.customer.phone}` : ''}
              </div>
            ` : ''}
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${currentBill.items.map(item => `
                  <tr>
                    <td>
                      ${item.name}
                      ${(item.size || item.color) ? `
                        <div class="item-details">
                          ${item.size ? `Size: ${item.size}` : ''}
                          ${item.color ? `Color: ${item.color}` : ''}
                        </div>
                      ` : ''}
                      ${item.remarks ? `
                        <div class="item-remarks">
                          Remarks: ${item.remarks}
                        </div>
                      ` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>NPR ${currentBill.subtotal.toFixed(2)}</span>
              </div>
              
              ${currentBill.discount > 0 ? `
                <div class="summary-row">
                  <span>Discount:</span>
                  <span>- NPR ${currentBill.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              
              ${currentBill.vatEnabled ? `
                <div class="summary-row">
                  <span>VAT (${currentBill.vatRate}%):</span>
                  <span>NPR ${currentBill.tax.toFixed(2)}</span>
                </div>
              ` : ''}
              
              <div class="summary-row grand-total">
                <span>TOTAL:</span>
                <span>NPR ${currentBill.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="payment-method">
              ${paymentHtml}
            </div>
            
            ${currentBill.qrCodeContent ? `
              <div class="qr-section">
                <div class="qr-title">SCAN FOR CONTACT INFO</div>
                ${currentBill.qrCodeImage ? `
                  <div style="display: flex; justify-content: center; margin: 10px 0;">
                    <img src="${currentBill.qrCodeImage}" alt="QR Code" style="width: 100px; height: 100px;" />
                  </div>
                ` : `
                  <div style="display: flex; justify-content: center; margin: 10px 0;">
                    <svg height="100" width="100" viewBox="0 0 410 410">
                      <rect fill="#ffffff" height="100%" width="100%"/>
                      ${generateQRCodePath(currentBill.qrCodeContent)}
                    </svg>
                  </div>
                `}
                <div class="qr-content">
                  ${formatQRContentForDisplay(currentBill.qrCodeContent)}
                </div>
              </div>
            ` : ''}
            
            <div class="thank-you">
              Thank you for your business!
            </div>
            
            <div class="footer">
              ${currentBill.shopInfo?.contactNumber ? `Contact: ${currentBill.shopInfo.contactNumber}` : ''}
              <br>Please keep this receipt for returns
            </div>
          </div>
          
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()">Print Receipt</button>
            <button onclick="window.close()">Close</button>
          </div>
          
          <script>
            window.onload = function() {
              // Auto-print if needed
              // window.print();
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Helper function to generate QR code path
  const generateQRCodePath = (content) => {
    // This is a simplified version - in a real implementation, you would use a QR code library
    // that can generate the proper path based on the content
    // For now, we'll use a static pattern that resembles a QR code
    
    // Hash the content to create a deterministic pattern
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Use the hash to create a pattern
    const pattern = [];
    for (let i = 0; i < 41; i++) {
      for (let j = 0; j < 41; j++) {
        // Create a pattern based on the hash
        if ((i + j + hash) % 5 === 0 || (i * j + hash) % 7 === 0) {
          pattern.push(`<rect fill="#000000" height="10" width="10" x="${i * 10}" y="${j * 10}"/>`);
        }
      }
    }
    
    return pattern.join('');
  };

  // Combined function to print and save
  const printAndSaveBill = async () => {
    try {
      setLoading(true);
      await saveBill(); // Save to Firebase and update stock
      printBill(); // Then print the receipt
      setIsPrintPreview(false);
      setLoading(false);
    } catch (error) {
      console.error('Error printing and saving bill:', error);
      setError('Failed to print and save bill. Please try again.');
      setLoading(false);
    }
  };

  // Hold bill function
  const holdBill = () => {
    // Validate cart before holding bill
    if (!validateCart()) {
      setError('Please fill in all required remarks for free items');
      return;
    }
    
    const billId = Date.now().toString();
    const heldBill = {
      id: billId,
      cart,
      customer,
      discountType,
      discountValue,
      vatRate,
      vatEnabled: vatRegistered,
      pricingMode,
      date: new Date().toISOString()
    };
    
    const updatedHeldBills = [...heldBills, heldBill];
    setHeldBills(updatedHeldBills);
    localStorage.setItem('heldBills', JSON.stringify(updatedHeldBills));
    
    setCart([]);
    setCustomer(null);
    setCartErrors({});
    
    setIsHoldModalOpen(false);
    alert(`Bill held successfully with ID: ${billId}`);
  };

  // Resume bill
  const resumeBill = (bill) => {
    setCart(bill.cart);
    setCustomer(bill.customer);
    setDiscountType(bill.discountType);
    setDiscountValue(bill.discountValue);
    setVatRate(bill.vatRate);
    setVatRegistered(bill.vatEnabled);
    setPricingMode(bill.pricingMode);
    
    // Validate the resumed cart
    setTimeout(() => validateCart(), 0);
    
    setIsHoldModalOpen(false);
  };

  // Delete held bill
  const deleteHeldBill = (billId) => {
    const updatedHeldBills = heldBills.filter(bill => bill.id !== billId);
    setHeldBills(updatedHeldBills);
    localStorage.setItem('heldBills', JSON.stringify(updatedHeldBills));
  };

  // Fetch products and settings on component mount
  useEffect(() => {
    fetchProducts();
    loadHeldBills();
    loadShopSettings();
    fetchQRCodeImage();
    
    // Listen for settings updates
    const handleSettingsUpdate = (event) => {
      const settings = event.detail;
      setVatRegistered(settings.vatEnabled || false);
      setVatRate(settings.vatRate || 0);
      setPricingMode(settings.pricingMode || 'fixed');
      
      // Set shop info with proper defaults
      const shopInfo = settings.shopInfo || {};
      setShopName(shopInfo.name || 'My Shop');
      setShopInfo(shopInfo);
      
      // Generate QR code content from shop info
      const qrContent = generateQRContent(shopInfo);
      setQrCodeContent(qrContent);
      
      // Fetch QR code image when settings are updated
      fetchQRCodeImage();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      // Clean up blob URL when component unmounts
      if (qrCodeImage) {
        URL.revokeObjectURL(qrCodeImage);
      }
    };
  }, []);

  // Validate cart whenever it changes
  useEffect(() => {
    validateCart();
  }, [cart]);

  return (
    <div className="billing-page">
      <div className="billing-header">
        <h1>Billing</h1>
        <div className="header-actions">
          <button 
            className="btn-secondary" 
            onClick={() => setIsHoldModalOpen(true)}
            disabled={cart.length === 0}
          >
            Hold Bill
          </button>
          <button 
            className="btn-primary" 
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.length === 0 || hasCartErrors()}
          >
            Process Payment
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {hasCartErrors() && (
        <div className="error-banner">
          Some items require remarks. Please fill in all required fields.
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="billing-container">
        {/* Left Panel - Product Search and Selection */}
        <div className="product-selection-panel">
          <div className="search-section">
            <h3>Add Products</h3>
            <div className="search-input-group">
              <div className="search-input-with-icon">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={handleSearch}
                  ref={searchInputRef}
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="barcode-input-group">
                <input
                  type="text"
                  placeholder="Scan barcode..."
                  onKeyPress={handleBarcodeScan}
                  ref={barcodeInputRef}
                />
                <button 
                  className="btn-scan"
                  onClick={() => {
                    setIsScanning(true);
                    barcodeInputRef.current.focus();
                  }}
                >
                  📷 Scan
                </button>
              </div>
            </div>
          </div>

          {/* Product Controls */}
          <div className="product-controls">
            <div className="view-toggle">
              <button 
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                ◼ Grid
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                ≡ List
              </button>
            </div>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="price">Price Low-High</option>
              <option value="price-desc">Price High-Low</option>
              <option value="stock">Stock Level</option>
            </select>
          </div>

          <div className={`products-container ${viewMode}`}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h4>No products found</h4>
                <p>Try a different search term or check your inventory</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div 
                  key={product._id} 
                  className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''} ${product.stock <= (product.lowStockAlert || 5) ? 'low-stock' : ''}`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <div className="product-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="image-placeholder">📦</div>
                    )}
                    {product.stock <= 0 && (
                      <div className="out-of-stock-badge">Out of Stock</div>
                    )}
                    {product.stock > 0 && product.stock <= (product.lowStockAlert || 5) && (
                      <div className="low-stock-badge">Low Stock</div>
                    )}
                  </div>
                  
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    {product.nepaliName && (
                      <div className="nepali-name">{product.nepaliName}</div>
                    )}
                    
                    <div className="product-details">
                      {product.size && <span className="detail-tag size">{product.size}</span>}
                      {product.color && <span className="detail-tag color">{product.color}</span>}
                      {product.sku && <span className="detail-tag sku">SKU: {product.sku}</span>}
                    </div>
                    
                    <div className="product-pricing">
                      <div className="price">NPR {product.price.toFixed(2)}</div>
                      <div className="stock-info">
                        <div className={`stock ${product.stock <= 0 ? 'out' : product.stock <= (product.lowStockAlert || 5) ? 'low' : 'good'}`}>
                          {product.stock <= 0 ? 'Out of stock' : `${product.stock} in stock`}
                        </div>
                        {product.barcode && (
                          <div className="barcode">
                            Barcode: {product.barcode}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {product.stock > 0 && (
                    <div className="add-to-cart-btn">
                      + Add to Cart
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Cart and Bill Details */}
        <div className="cart-panel">
          <div className="customer-section">
            <h3>Customer Details</h3>
            {customer ? (
              <div className="customer-info">
                <div className="customer-details">
                  <span className="customer-name">{customer.name}</span>
                  {customer.phone && <span className="customer-phone">{customer.phone}</span>}
                </div>
                <button className="btn-change" onClick={() => setCustomer(null)}>Change</button>
              </div>
            ) : (
              <div className="customer-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setIsCustomerModalOpen(true)}
                >
                  + Add Customer
                </button>
                <span className="walk-in">or proceed as Walk-in Customer</span>
              </div>
            )}
          </div>

          <div className="cart-items">
            <div className="cart-header">
              <h3>Cart Items ({cart.length})</h3>
              {cart.length > 0 && (
                <button className="btn-clear" onClick={() => {
                  setCart([]);
                  setCartErrors({});
                }}>
                  Clear All
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>
                <p>Your cart is empty</p>
                <span>Add products from the left panel</span>
              </div>
            ) : (
              <div className="cart-items-list">
                {cart.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div className="cart-item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="image-placeholder">📦</div>
                      )}
                    </div>
                    
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-details">
                        {item.size && <span className="cart-item-detail size">{item.size}</span>}
                        {item.color && <span className="cart-item-detail color">{item.color}</span>}
                      </div>
                      <div className="cart-item-price">NPR {item.price.toFixed(2)}</div>
                      
                      {pricingMode === 'variable' && (
                        <div className="price-editor">
                          <span className="price-label">Price:</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemPrice(index, e.target.value)}
                            min="0"
                            step="0.01"
                            className="price-input"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button 
                          className="quantity-btn"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                        >-</button>
                        <input
                          type="number"
                          className="quantity-input"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                          min="1"
                          max={item.stock}
                        />
                        <button 
                          className="quantity-btn"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                        >+</button>
                      </div>
                      
                      <div className="cart-item-total">
                        NPR {(item.price * item.quantity).toFixed(2)}
                      </div>
                      
                      <button 
                        className="btn-remove"
                        onClick={() => removeFromCart(index)}
                        title="Remove item"
                      >
                        ×
                      </button>
                    </div>

                    {/* Remarks field for items with price 0 */}
                    {item.price === 0 && (
                      <div className="item-remarks">
                        <label>Remarks (required for free items):</label>
                        <input
                          type="text"
                          className={`remarks-input ${cartErrors[index] ? 'error' : ''}`}
                          value={item.remarks || ''}
                          onChange={(e) => updateItemRemarks(index, e.target.value)}
                          placeholder="Enter reason for free item"
                          required
                        />
                        {cartErrors[index] && (
                          <div className="remarks-error">{cartErrors[index]}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bill-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>NPR {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="summary-row discount-row">
              <div className="discount-controls">
                <span>Discount:</span>
                <select 
                  value={discountType} 
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                {discountType !== 'none' && (
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={discountType === 'percentage' ? 100 : subtotal}
                    placeholder={discountType === 'percentage' ? '%' : 'Amount'}
                  />
                )}
              </div>
              <span className="discount-amount">
                - NPR {discountAmount.toFixed(2)}
              </span>
            </div>
            
            {vatRegistered && (
              <div className="summary-row">
                <span>VAT ({vatRate}%):</span>
                <span>NPR {taxAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>NPR {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <CustomerModal
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectCustomer={setCustomer}
        />
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          grandTotal={grandTotal}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirm={handlePaymentConfirm}
          customer={customer} // Pass customer prop
        />
      )}

      {/* Hold Bill Modal */}
      {isHoldModalOpen && (
        <HoldBillModal
          heldBills={heldBills}
          onClose={() => setIsHoldModalOpen(false)}
          onResumeBill={resumeBill}
          onDeleteBill={deleteHeldBill}
          onHoldCurrentBill={holdBill}
        />
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && currentBill && (
        <ReceiptModal
          bill={currentBill}
          onClose={() => setIsReceiptModalOpen(false)}
          onSave={saveBill}
          onPrintAndSave={printAndSaveBill}
          isPrintPreview={isPrintPreview}
          setIsPrintPreview={setIsPrintPreview}
          qrCodeContent={qrCodeContent}
          qrCodeImage={qrCodeImage}
          formatQRContentForDisplay={formatQRContentForDisplay}
        />
      )}
    </div>
  );
};

// Customer Modal Component
const CustomerModal = ({ onClose, onSelectCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers));
      } catch (error) {
        console.error('Error parsing customers:', error);
        setCustomers([]);
      }
    }
  }, []);
  
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );
  
  const addNewCustomer = () => {
    const name = prompt('Enter customer name:');
    const phone = prompt('Enter customer phone:');
    
    if (name && phone) {
      const newCustomer = { id: Date.now().toString(), name, phone };
      const updatedCustomers = [...customers, newCustomer];
      setCustomers(updatedCustomers);
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));
      onSelectCustomer(newCustomer);
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Customer</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          
          <div className="customers-list">
            {filteredCustomers.map(customer => (
              <div 
                key={customer.id} 
                className="customer-item"
                onClick={() => {
                  onSelectCustomer(customer);
                  onClose();
                }}
              >
                <div className="customer-name">{customer.name}</div>
                <div className="customer-phone">{customer.phone}</div>
              </div>
            ))}
          </div>
          
          <button className="btn-primary" onClick={addNewCustomer}>
            + Add New Customer
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({ grandTotal, paymentMethod, setPaymentMethod, onClose, onConfirm, customer }) => {
  const [amountPaid, setAmountPaid] = useState(grandTotal);
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitMethods, setSplitMethods] = useState([{ method: 'cash', amount: grandTotal }]);
  
  // Set default payment method based on customer selection
  useEffect(() => {
    if (customer) {
      setPaymentMethod('credit');
      setSplitPayment(false); // Disable split payment when customer is selected
    } else {
      setPaymentMethod('cash');
    }
  }, [customer, setPaymentMethod]);

  const handleSplitChange = (index, field, value) => {
    const updated = [...splitMethods];
    updated[index][field] = value;
    setSplitMethods(updated);
  };
  
  const addSplitMethod = () => {
    setSplitMethods([...splitMethods, { method: 'cash', amount: 0 }]);
  };
  
  const removeSplitMethod = (index) => {
    if (splitMethods.length > 1) {
      const updated = [...splitMethods];
      updated.splice(index, 1);
      setSplitMethods(updated);
    }
  };
  
  const splitTotal = splitMethods.reduce((sum, method) => sum + (parseFloat(method.amount) || 0), 0);
  const changeDue = splitTotal - grandTotal;
  
  const handleConfirm = () => {
    let payment;
    
    if (splitPayment) {
      // For split payment (full payment assumed, no credit in split)
      payment = {
        type: 'split',
        methods: splitMethods.map(m => ({ method: m.method, amount: m.amount })),
        totalPaid: splitTotal,
        change: changeDue >= 0 ? changeDue : 0,
        outstandingAmount: 0
      };
    } else {
      if (paymentMethod === 'credit') {
        // For credit
        payment = {
          type: 'single',
          methods: [{ method: 'credit', amount: grandTotal }],
          totalPaid: 0,
          change: 0,
          outstandingAmount: grandTotal
        };
      } else {
        // For single non-credit
        payment = {
          type: 'single',
          methods: [{ method: paymentMethod, amount: amountPaid }],
          totalPaid: amountPaid,
          change: amountPaid - grandTotal,
          outstandingAmount: 0
        };
      }
    }
    
    onConfirm(payment);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Process Payment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="payment-total">
            <h3>Total Amount: NPR {grandTotal.toFixed(2)}</h3>
          </div>
          
          <div className="split-toggle">
            <label>
              <input
                type="checkbox"
                checked={splitPayment}
                onChange={e => setSplitPayment(e.target.checked)}
                disabled={paymentMethod === 'credit'} // Disable split payment when credit is selected
              />
              Split Payment
            </label>
          </div>
          
          {!splitPayment ? (
            <div className="payment-method">
              <label>Payment Method:</label>
              <select 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="ewallet">E-Wallet</option>
                {customer && <option value="credit">Credit</option>} {/* Show credit option only if customer is selected */}
              </select>
              
              {paymentMethod !== 'credit' && (
                <div className="amount-paid">
                  <label>Amount Paid:</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    min={grandTotal}
                    step="0.01"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="split-payment">
              {splitMethods.map((method, index) => (
                <div key={index} className="split-method">
                  <select
                    value={method.method}
                    onChange={e => handleSplitChange(index, 'method', e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                  
                  <input
                    type="number"
                    value={method.amount}
                    onChange={(e) => handleSplitChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                  />
                  
                  {splitMethods.length > 1 && (
                    <button 
                      className="btn-remove"
                      onClick={() => removeSplitMethod(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              <button className="btn-secondary" onClick={addSplitMethod}>
                + Add Another Payment Method
              </button>
              
              <div className="split-summary">
                <div>Split Total: NPR {splitTotal.toFixed(2)}</div>
                {splitTotal < grandTotal ? (
                  <div className="error-text">Insufficient payment!</div>
                ) : (
                  <div>Change Due: NPR {changeDue.toFixed(2)}</div>
                )}
              </div>
            </div>
          )}
          
          <div className="payment-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleConfirm}
              disabled={splitPayment && splitTotal < grandTotal}
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hold Bill Modal Component
const HoldBillModal = ({ heldBills, onClose, onResumeBill, onDeleteBill, onHoldCurrentBill }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Hold / Resume Bills</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {heldBills.length === 0 ? (
            <p>No held bills</p>
          ) : (
            <div className="held-bills">
              {heldBills.map(bill => (
                <div key={bill.id} className="held-bill-item">
                  <div className="bill-info">
                    <div className="bill-id">Bill #{bill.id}</div>
                    <div className="bill-date">{new Date(bill.date).toLocaleString()}</div>
                    <div className="bill-items">{bill.cart.length} items</div>
                  </div>
                  <div className="bill-actions">
                    <button 
                      className="btn-primary"
                      onClick={() => onResumeBill(bill)}
                    >
                      Resume
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => onDeleteBill(bill.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="hold-actions">
            <button className="btn-primary" onClick={onHoldCurrentBill}>
              Hold Current Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Receipt Modal Component
const ReceiptModal = ({ bill, onClose, onSave, onPrintAndSave, isPrintPreview, setIsPrintPreview, qrCodeContent, qrCodeImage, formatQRContentForDisplay }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    const billContent = document.querySelector('.receipt-preview')?.innerText || '';
    navigator.clipboard.writeText(billContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content receipt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isPrintPreview ? 'Print Preview' : `Bill Preview - #${bill.billNumber}`}</h2>
          <div className="modal-actions">
            {!isPrintPreview && (
              <button 
                className="btn-icon" 
                onClick={copyToClipboard}
                title="Copy to clipboard"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="receipt-preview enhanced">
            <div className="receipt-header">
              <div className="shop-name">{bill.shopName}</div>
              <div className="shop-address">{bill.shopInfo?.address || ''}</div>
              <div className="shop-phone">Phone: {bill.shopInfo?.phone || ''}</div>
              <div className="receipt-meta">
                <div className="bill-number">Bill #: {bill.billNumber}</div>
                <div className="bill-date">Date: {bill.nepaliDate}</div>
              </div>
            </div>
            
            {bill.customer && (
              <div className="receipt-customer">
                <div className="customer-label">CUSTOMER DETAILS</div>
                <div className="customer-name">{bill.customer.name}</div>
                {bill.customer.phone && (
                  <div className="customer-phone">📞 {bill.customer.phone}</div>
                )}
              </div>
            )}
            
            <div className="receipt-items">
              <div className="items-label">ITEMS</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="item-name">{item.name}</div>
                        {(item.size || item.color) && (
                          <div className="item-details">
                            {item.size && <span>Size: {item.size}</span>}
                            {item.color && <span>Color: {item.color}</span>}
                          </div>
                        )}
                        {item.remarks && (
                          <div className="item-remarks">
                            Remarks: {item.remarks}
                          </div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>NPR {item.price.toFixed(2)}</td>
                      <td>NPR {(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="receipt-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>NPR {bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Discount:</span>
                <span>- NPR {bill.discount.toFixed(2)}</span>
              </div>
              {bill.vatEnabled && (
                <div className="summary-row">
                  <span>VAT ({bill.vatRate || 13}%):</span>
                  <span>NPR {bill.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row grand-total">
                <span>TOTAL:</span>
                <span>NPR {bill.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="payment-method">
              {bill.payment.type === 'single' ? (
                <>
                  {bill.payment.methods[0].method === 'credit' ? (
                    <>
                      Payment Method: <span className="method">CREDIT</span>
                      <br />
                      Outstanding: NPR {bill.payment.outstandingAmount.toFixed(2)}
                    </>
                  ) : (
                    <>
                      Payment Method: <span className="method">{bill.payment.methods[0].method.toUpperCase()}</span>
                      <br />
                      Amount Paid: NPR {bill.payment.totalPaid.toFixed(2)}
                      {bill.payment.change > 0 && (
                        <>
                          <br />
                          Change: NPR {bill.payment.change.toFixed(2)}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  Split Payment:
                  {bill.payment.methods.map((m, i) => (
                    <div key={i}>
                      {m.method.toUpperCase()}: NPR {m.amount.toFixed(2)}
                    </div>
                  ))}
                  Total Paid: NPR {bill.payment.totalPaid.toFixed(2)}
                  {bill.payment.change > 0 && (
                    <div>Change: NPR {bill.payment.change.toFixed(2)}</div>
                  )}
                </>
              )}
            </div>
            
            {/* QR Code Section - Using the QR code from settings */}
            {qrCodeContent && (
              <div className="receipt-qr">
                <div className="qr-title">QR CODE</div>
                <div className="qr-instruction">Scan for contact information:</div>
                <div className="qr-code-image">
                  {qrCodeImage ? (
                    <img src={qrCodeImage} alt="QR Code" style={{ width: '100px', height: '100px' }} />
                  ) : (
                    <QRCodeSVG 
                      value={qrCodeContent} 
                      size={100}
                      level="H"
                      marginSize={2}
                    />
                  )}
                </div>
                <div 
                  className="qr-content" 
                  dangerouslySetInnerHTML={{ __html: formatQRContentForDisplay(qrCodeContent) }}
                />
              </div>
            )}
            
            <div className="receipt-footer">
              <div className="contact-info">Contact Us: {bill.shopInfo?.contactNumber || ''}</div>
              <div className="thank-you">Thank you for your purchase!</div>
              <div className="return-policy">7-day return policy with original receipt</div>
            </div>
          </div>
          
          {isPrintPreview ? (
            <div className="receipt-actions enhanced">
              <button className="btn-secondary" onClick={() => setIsPrintPreview(false)}>
                ← Back to Edit
              </button>
              <button className="btn-primary" onClick={onPrintAndSave}>
                🖨️ Print & Save
              </button>
            </div>
          ) : (
            <div className="receipt-actions enhanced">
              <button className="btn-secondary" onClick={onSave}>
                💾 Save Only
              </button>
              <button className="btn-primary" onClick={() => setIsPrintPreview(true)}>
                👁️ Print Preview
              </button>
              <button className="btn-tertiary" onClick={onClose}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;