import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Notifications.css';
import { API_URL } from '../config';
const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    // Check for new notifications every 30 seconds
    const fetchNotifications = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        // Add logging to check user ID
        console.log("Fetching notifications for user ID:", user.id);
        const response = await axios.get(`${API_URL}/notifications.php?user_id=${user.id}`);
       
        if (response.data.status === 'success') {
          console.log("Received notifications:", response.data.notifications);
          setNotifications(response.data.notifications);
          setUnreadCount(response.data.unread_count);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
   
    return () => clearInterval(interval);
  }, []);
  const handleNotificationClick = async (notification) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
     
      // Mark as read
      await axios.put(`${API_URL}/notifications.php?notification_id=${notification.id}&user_id=${user.id}`, {
        action: 'mark_read'
      });
     
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? {...n, is_read: true} : n
        )
      );
     
      // Update unread count
      if (!notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
     
      if (notification.type === 'task_share' && notification.reference_id) {
      }
    } catch (err) {
      setError('Failed to update notification: ' + (err.response?.data?.message || err.message));
    }
  };
  const handleTaskShareResponse = async (notification, response) => {
    setLoading(true);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('user'));
     
      console.log(`Responding to notification ${notification.id} with ${response} for user ${user.id}`);
     
      if (!notification || !notification.id) {
        throw new Error("Invalid notification data");
      }
     
      const result = await axios.put(`${API_URL}/notifications.php?notification_id=${notification.id}&user_id=${user.id}`, {
        action: 'respond_share',
        response: response
      });
     
      console.log('Response from server:', result.data);
     
      if (result.data.status === 'success') {
        setError(`Task successfully ${response}!`);
        setTimeout(() => setError(''), 3000);
       
        const responseText = response === 'accepted' ? '(Accepted)' : '(Declined)';
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id
              ? {...n,
                 is_read: true,
                 message: n.message + ' ' + responseText
                }
              : n
          )
        );
       
        if (!notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
       
        setTimeout(async () => {
          try {
            const refreshResponse = await axios.get(`${API_URL}/notifications.php?user_id=${user.id}`);
            if (refreshResponse.data.status === 'success') {
              setNotifications(refreshResponse.data.notifications);
              setUnreadCount(refreshResponse.data.unread_count);
            }
          } catch (refreshErr) {
            console.error('Error refreshing notifications:', refreshErr);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error responding to task share:', err);
      setError('Failed to respond to task share: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return '';
   
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
   
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
   
    return date.toLocaleDateString();
  };
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };
  return (
    <div className="notifications-container">
      <button
        className="notifications-toggle"
        onClick={toggleNotifications}
      >
        <span className="notifications-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
      </button>
     
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button
              className="close-btn"
              onClick={() => setShowNotifications(false)}
            >
              ×
            </button>
          </div>
         
          {error && <div className="notifications-error">{error}</div>}
         
          <div className="notifications-list">
            {loading && <div className="notifications-loading">Loading...</div>}
           
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map(notification => {
                const hasResponse = notification.message.includes('(Accepted)') ||
                                   notification.message.includes('(Declined)');
               
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => hasResponse ? null : handleNotificationClick(notification)}
                  >
                    <div className="notification-content">
                      <p className="notification-message">{notification.message}</p>
                      <span className="notification-time">{formatDate(notification.created_at)}</span>
                    </div>
                   
                    {notification.type === 'task_share' && !hasResponse && (
                      <div className="notification-actions">
                        <button
                          className="btn-accept"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskShareResponse(notification, 'accepted');
                          }}
                          disabled={loading}
                        >
                          {loading ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          className="btn-decline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskShareResponse(notification, 'declined');
                          }}
                          disabled={loading}
                        >
                          {loading ? 'Processing...' : 'Decline'}
                        </button>
                      </div>
                    )}
                   
                    {hasResponse && (
                      <div className={`response-status ${notification.message.includes('(Accepted)') ? 'accepted' : 'declined'}`}>
                        {notification.message.includes('(Accepted)') ? 'Accepted' : 'Declined'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Notifications;
