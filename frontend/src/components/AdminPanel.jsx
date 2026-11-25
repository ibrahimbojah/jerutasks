import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import '../styles/AdminPanel.css';
function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.role !== 'admin') {
        window.location.href = '/tasks';
      }
    } else {
      window.location.href = '/login';
    }
  }, []);
  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };
  if (!user) {
    return <div className="loading">Loading...</div>;
  }
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-user-info">
          <span>Welcome, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
      <div className="admin-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
      </div>
      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}
       
        {activeTab === 'dashboard' && (
          <AdminDashboard userId={user.id} />
        )}
        {activeTab === 'users' && (
          <UserManagement userId={user.id} />
        )}
      </div>
    </div>
  );
}
export default AdminPanel;
