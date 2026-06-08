// src/api/index.js (if you don't have this file)
export const productsAPI = {
  getProducts: async () => {
    // Mock data for testing
    return [
      {
        _id: '1',
        name: 'Test Product 1',
        sku: 'TP001',
        barcode: '123456789012',
        category: 'Clothing',
        subcategory: 'T-Shirts',
        size: 'M',
        color: 'Blue',
        price: 29.99
      },
      {
        _id: '2',
        name: 'Test Product 2',
        sku: 'TP002',
        barcode: '987654321098',
        category: 'Clothing',
        subcategory: 'Pants',
        size: '32',
        color: 'Black',
        price: 49.99
      }
    ];
  }
};