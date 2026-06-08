import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const ProductKeyManager = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, used: 0, unused: 0 });

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await authAPI.get('/admin/keys');
      setKeys(response.data.keys);
      
      const total = response.data.keys.length;
      const used = response.data.keys.filter(k => k.isUsed).length;
      setStats({ total, used, unused: total - used });
    } catch (err) {
      console.error('Error loading keys:', err);
    }
    setLoading(false);
  };

  const generateBulkKeys = async () => {
    if (!window.confirm('Are you sure you want to generate 500 product keys?')) return;
    
    try {
      setLoading(true);
      await authAPI.post('/admin/generate-bulk-keys');
      alert('500 product keys generated successfully!');
      loadKeys();
    } catch (err) {
      console.error('Error generating keys:', err);
      alert('Error generating keys: ' + err.message);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  return (
    <div className="key-manager">
      <h2>Product Key Management</h2>
      
      <div className="key-stats">
        <div className="stat-card">
          <h3>Total Keys</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Used Keys</h3>
          <p>{stats.used}</p>
        </div>
        <div className="stat-card">
          <h3>Available Keys</h3>
          <p>{stats.unused}</p>
        </div>
      </div>

      <button onClick={generateBulkKeys} disabled={loading} className="btn-generate">
        {loading ? 'Generating...' : 'Generate 500 Keys'}
      </button>

      <div className="keys-list">
        <h3>Product Keys</h3>
        {keys.slice(0, 20).map((key) => (
          <div key={key._id} className={`key-item ${key.isUsed ? 'used' : 'available'}`}>
            <span className="key-code">{key.key}</span>
            <span className="key-status">
              {key.isUsed ? 'Used' : 'Available'}
            </span>
            {key.isUsed && key.usedBy && (
              <span className="key-used-by">Used by: {key.usedBy.username}</span>
            )}
          </div>
        ))}
        {keys.length > 20 && <p>... and {keys.length - 20} more keys</p>}
      </div>
    </div>
  );
};

export default ProductKeyManager;