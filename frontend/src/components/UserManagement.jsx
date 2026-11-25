import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/UserManagement.css';
import { API_URL } from '../config';
function UserManagement({ userId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
 
  const [passwordModal, setPasswordModal] = useState({ show: false, userId: null, userName: '' });
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
 
  const [emailModal, setEmailModal] = useState({ show: false, userId: null, userName: '', currentEmail: '' });
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  useEffect(() => {
    fetchUsers();
  }, [userId]);
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin.php`, {
        params: { admin_id: userId }
      });
     
      if (response.data.status === 'success') {
        setUsers(response.data.users);
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handleRoleChange = async (userIdToUpdate, newRole) => {
    if (actionInProgress) return;
   
    try {
      setActionInProgress(true);
      const response = await axios.put(`${API_URL}/admin.php`, {
        admin_id: userId,
        user_id: userIdToUpdate,
        role: newRole
      });
     
      if (response.data.status === 'success') {
        setUsers(users.map(user =>
          user.id === userIdToUpdate ? { ...user, role: newRole } : user
        ));
        setSuccessMessage('User role updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update user role');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setActionInProgress(false);
    }
  };
  const handleDeleteUser = async (userIdToDelete) => {
    if (actionInProgress) return;
   
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
   
    try {
      setActionInProgress(true);
      const response = await axios.delete(`${API_URL}/admin.php`, {
        data: {
          admin_id: userId,
          user_id: userIdToDelete
        }
      });
     
      if (response.data.status === 'success') {
        setUsers(users.filter(user => user.id !== userIdToDelete));
        setSuccessMessage('User deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete user');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setActionInProgress(false);
    }
  };
  const openPasswordModal = (userToUpdate) => {
    setPasswordModal({
      show: true,
      userId: userToUpdate.id,
      userName: userToUpdate.name
    });
    setNewPassword('');
    setPasswordError('');
  };
  const closePasswordModal = () => {
    setPasswordModal({ show: false, userId: null, userName: '' });
    setNewPassword('');
    setPasswordError('');
  };
  const handlePasswordChange = async (e) => {
    e.preventDefault();
   
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    try {
      setActionInProgress(true);
      setPasswordError('');
     
      const response = await axios.post(`${API_URL}/admin.php`, {
        admin_id: userId,
        user_id: passwordModal.userId,
        new_password: newPassword
      });
     
      if (response.data.status === 'success') {
        closePasswordModal();
        setSuccessMessage(`Password for ${passwordModal.userName} updated successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setPasswordError(response.data.message || 'Failed to update password');
      }
    } catch (err) {
      setPasswordError('Error connecting to the server');
      console.error(err);
    } finally {
      setActionInProgress(false);
    }
  };
  const openEmailModal = (userToUpdate) => {
    setEmailModal({
      show: true,
      userId: userToUpdate.id,
      userName: userToUpdate.name,
      currentEmail: userToUpdate.email
    });
    setNewEmail(userToUpdate.email);
    setEmailError('');
  };
  const closeEmailModal = () => {
    setEmailModal({ show: false, userId: null, userName: '', currentEmail: '' });
    setNewEmail('');
    setEmailError('');
  };
  const handleEmailChange = async (e) => {
    e.preventDefault();
   
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (newEmail === emailModal.currentEmail) {
      setEmailError('New email must be different from current email');
      return;
    }
    try {
      setActionInProgress(true);
      setEmailError('');
     
      const response = await axios.patch(`${API_URL}/admin.php`, {
        admin_id: userId,
        user_id: emailModal.userId,
        new_email: newEmail
      });
     
      if (response.data.status === 'success') {
        setUsers(users.map(user =>
          user.id === emailModal.userId ? { ...user, email: newEmail } : user
        ));
        closeEmailModal();
        setSuccessMessage(`Email for ${emailModal.userName} updated successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setEmailError(response.data.message || 'Failed to update email');
      }
    } catch (err) {
      setEmailError('Error connecting to the server');
      console.error(err);
    } finally {
      setActionInProgress(false);
    }
  };
  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error-message">{error}</div>;
  return (
    <div className="user-management">
      <h2>User Management</h2>
     
      {successMessage && <div className="success-message">{successMessage}</div>}
     
      <div className="user-list">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={actionInProgress || user.id === parseInt(userId)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="action-buttons">
                  <button
                    onClick={() => openPasswordModal(user)}
                    className="action-btn"
                    disabled={actionInProgress}
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => openEmailModal(user)}
                    className="action-btn"
                    disabled={actionInProgress}
                  >
                    Change Email
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="action-btn delete-btn"
                    disabled={actionInProgress || user.id === parseInt(userId)}
                  >
                    Delete User
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {passwordModal.show && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closePasswordModal}>&times;</span>
            <h3>Change Password for {passwordModal.userName}</h3>
            {passwordError && <div className="error-message">{passwordError}</div>}
            <form onSubmit={handlePasswordChange}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <button type="submit" disabled={actionInProgress}>Update Password</button>
            </form>
          </div>
        </div>
      )}
      {emailModal.show && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeEmailModal}>&times;</span>
            <h3>Change Email for {emailModal.userName}</h3>
            {emailError && <div className="error-message">{emailError}</div>}
            <form onSubmit={handleEmailChange}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                required
              />
              <button type="submit" disabled={actionInProgress}>Update Email</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default UserManagement;
