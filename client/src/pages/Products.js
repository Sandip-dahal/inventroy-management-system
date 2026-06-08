import React, { useState, useEffect } from 'react';
   import { productsAPI } from '../services/api';
   const Products = () => {
     const [products, setProducts] = useState([]);
     const [loading, setLoading] = useState(true);
     useEffect(() => {
       const fetchProducts = async () => {
         try {
           const response = await productsAPI.getAll();
           setProducts(response.data.products);
         } catch (err) {
           console.error(err);
         } finally {
           setLoading(false);
         }
       };
       fetchProducts();
     }, []);
     if (loading) return <div>Loading...</div>;
     return (
       <div>
         <h2>Products</h2>
         <ul>
           {products.map(product => (
             <li key={product._id}>{product.name} - {product.price}</li>
           ))}
         </ul>
       </div>
     );
   };
   export default Products;