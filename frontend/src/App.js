import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MK Processor 4.2.0</h1>
        <p>AI-Powered Dual-Market Intelligence Platform</p>
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <div className="status">
            <p>Status: {status.status || 'Unknown'}</p>
            <p>Version: {status.version || 'Unknown'}</p>
            <p>Database: {status.database || 'Unknown'}</p>
            <p>Redis: {status.redis || 'Unknown'}</p>
          </div>
        )}
        <div className="links">
          <a href="/dashboard.html" className="link">Open Dashboard</a>
          <a href="http://localhost:8000/docs" className="link" target="_blank">API Docs</a>
        </div>
      </header>
    </div>
  );
}

export default App;
