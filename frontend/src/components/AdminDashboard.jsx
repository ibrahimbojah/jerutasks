import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AdminDashboard.css';
import { API_URL } from '../config';
function AdminDashboard({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/admin_stats.php?admin_id=${userId}`);
       
        if (response.data.status === 'success') {
          setStats(response.data.stats);
        } else {
          setError(response.data.message || 'Failed to fetch statistics');
        }
      } catch (err) {
        setError('Error connecting to the server');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);
  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!stats) return <div className="no-data">No data available</div>;
  return (
    <div className="admin-dashboard">
      <h2>Dashboard</h2>
     
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Users</h3>
          <div className="stat-value">{stats.total_users}</div>
          <div className="stat-label">Total Users</div>
          <div className="stat-detail">
            <span className="stat-highlight">{stats.users_last_30_days}</span> new in last 30 days
          </div>
        </div>
       
        <div className="stat-card">
          <h3>Tasks</h3>
          <div className="stat-value">{stats.total_tasks}</div>
          <div className="stat-label">Total Tasks</div>
          <div className="stat-detail">
            <span className="stat-highlight">{stats.tasks_last_7_days}</span> new in last 7 days
          </div>
        </div>
      </div>
     
      <div className="task-status-section">
        <h3>Tasks by Status</h3>
        <div className="task-status-grid">
          <div className="status-card pending">
            <div className="status-count">{stats.tasks_by_status.pending || 0}</div>
            <div className="status-label">Pending</div>
          </div>
         
          <div className="status-card in-progress">
            <div className="status-count">{stats.tasks_by_status.in_progress || 0}</div>
            <div className="status-label">In Progress</div>
          </div>
         
          <div className="status-card completed">
            <div className="status-count">{stats.tasks_by_status.completed || 0}</div>
            <div className="status-label">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminDashboard;
