import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskComments from './TaskComments';
import { API_URL } from '../config';
const TaskForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
 
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pending'
  });
 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
   
    setUser(JSON.parse(loggedInUser));
   
    if (isEditMode) {
      fetchTaskDetails();
    }
  }, [isEditMode, id, navigate]);
  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
     
      if (!loggedInUser || !loggedInUser.id) {
        throw new Error("User not logged in or user ID missing");
      }
      console.log(`Fetching task details for task ID: ${id} and user ID: ${loggedInUser.id}`);
     
      const response = await axios.get(`${API_URL}/tasks.php?id=${id}&user_id=${loggedInUser.id}`);
     
      console.log('API Response:', response.data);
     
      if (response.data.status === 'success') {
        const task = response.data.task;
       
        if (!task) {
          throw new Error("Task data is missing from the API response");
        }
        console.log('Task data received:', task);
       
        let formattedDate = '';
        if (task.due_date) {
          const date = new Date(task.due_date);
          formattedDate = date.toISOString().split('T')[0];
        }
       
        const taskRole = task.role || 'collaborator';
       
        setFormData({
          title: task.title || '',
          description: task.description || '',
          due_date: formattedDate,
          status: task.status || 'pending',
          role: taskRole
        });
       
        if (task.shared_users && Array.isArray(task.shared_users)) {
          console.log('Shared users from API:', task.shared_users);
         
          const formattedSharedUsers = task.shared_users.map(user => ({
            id: user.user_id || user.id,
            name: user.name,
            email: user.email
          }));
         
          console.log('Formatted shared users:', formattedSharedUsers);
          setSelectedUsers(formattedSharedUsers);
        }
      } else {
        setError('Failed to fetch task details: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError('Error fetching task: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSearchUsers = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
   
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
   
    setIsSearching(true);
   
    try {
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
     
      if (!loggedInUser || !loggedInUser.id) {
        throw new Error("User not logged in or user ID missing");
      }
     
      const response = await axios.get(`${API_URL}/find_users.php?search=${query}&user_id=${loggedInUser.id}`);
     
      if (response.data.status === 'success') {
        const selectedIds = selectedUsers.map(user => user.id);
        const filteredResults = response.data.users.filter(
          user => !selectedIds.includes(user.id)
        );
        setSearchResults(filteredResults);
      } else {
        console.error('Error searching users:', response.data.message);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  };
  const addUserToShare = (user) => {
    const userObject = {
      id: parseInt(user.id),
      name: user.name,
      email: user.email
    };
   
    console.log('Adding user to share:', userObject);
    setSelectedUsers(prev => [...prev, userObject]);
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    setSearchQuery('');
  };
  const removeUserFromShare = (userId) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    setLoading(true);
   
    try {
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
     
      if (!loggedInUser || !loggedInUser.id) {
        throw new Error("User not logged in or user ID missing");
      }
     
      const taskData = {
        ...formData,
        user_id: parseInt(loggedInUser.id)
      };
     
      console.log('Task data with user_id:', taskData);
     
      if (!taskData.title) {
        setError('Task title is required');
        setLoading(false);
        return;
      }
     
      if (selectedUsers.length > 0) {
        console.log('Selected users for sharing:', selectedUsers);
        taskData.shared_users = selectedUsers.map(user => parseInt(user.id));
        console.log('Final shared_users data sent to API:', taskData.shared_users);
      }
      let response;
     
      if (isEditMode) {
        console.log('Sending update request with data:', taskData);
        response = await axios.put(`${API_URL}/tasks.php?id=${id}&user_id=${loggedInUser.id}`, taskData);
      } else {
        console.log('Sending create request with data:', taskData);
        response = await axios.post(`${API_URL}/tasks.php`, taskData);
      }
     
      console.log('Response received:', response.data);
     
      if (response.data.status === 'success') {
        navigate('/tasks');
      } else {
        setError(response.data.message || 'Operation failed');
        setDebugInfo(response.data);
      }
    } catch (err) {
      console.error('Error in task form submission:', err);
      const errorMsg = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError('Error: ' + errorMsg);
     
      setDebugInfo({
        error: errorMsg,
        response: err.response?.data || null,
        requestData: formData
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      setLoading(true);
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
     
      if (!loggedInUser || !loggedInUser.id) {
        throw new Error("User not logged in or user ID missing");
      }
     
      const response = await axios.delete(`${API_URL}/tasks.php?id=${id}&user_id=${loggedInUser.id}`);
     
      if (response.data.status === 'success') {
        navigate('/tasks');
      } else {
        setError('Failed to delete task: ' + response.data.message);
      }
    } catch (err) {
      setError('Error deleting task: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
 
  const isOwner = formData.role === 'owner';
 
  if (loading && !isEditMode) {
    return <div className="container">Loading form...</div>;
  }
 
  return (
    <div className="container">
      <header>
        <h1>{isEditMode ? (isOwner ? 'Edit Task' : 'View Task') : 'Add New Task'}</h1>
      </header>
      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
          {debugInfo && (
            <pre className="debug-info">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}
     
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            readOnly={!isOwner && isEditMode}
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="5"
            readOnly={!isOwner && isEditMode}
          ></textarea>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="due_date">Due Date</label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              readOnly={!isOwner && isEditMode}
            />
          </div>
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={!isOwner && isEditMode}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
       
        {isOwner && (
          <div className="share-task-section">
            <h3>Share Task</h3>
            <div className="form-group">
              <label htmlFor="share-user">Find users to share with (by name or email)</label>
              <input
                type="text"
                id="share-user"
                value={searchQuery}
                onChange={handleSearchUsers}
                placeholder="Start typing to search..."
              />
              {isSearching && <div className="spinner"></div>}
            </div>
           
            {searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map(user => (
                  <li key={user.id} onClick={() => addUserToShare(user)}>
                    {user.name} ({user.email})
                  </li>
                ))}
              </ul>
            )}
           
            <div className="selected-users">
              <h4>Shared with:</h4>
              {selectedUsers.length === 0 ? (
                <p>Not shared with anyone yet.</p>
              ) : (
                <ul>
                  {selectedUsers.map(user => (
                    <li key={user.id}>
                      {user.name} ({user.email})
                      <button
                        type="button"
                        onClick={() => removeUserFromShare(user.id)}
                        className="remove-user-btn"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="form-actions">
          {isOwner && (
            <button type="submit" className="btn" disabled={loading}>
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Task' : 'Create Task')}
            </button>
          )}
          {isEditMode && isOwner && (
            <button type="button" onClick={handleDeleteTask} className="btn btn-danger" disabled={loading}>
              Delete Task
            </button>
          )}
          <button type="button" onClick={() => navigate('/tasks')} className="btn btn-secondary">
            Back to List
          </button>
        </div>
      </form>
     
      {isEditMode && user && (
        <TaskComments
          taskId={id}
          userId={user.id}
          userName={user.name}
        />
      )}
    </div>
  );
};
export default TaskForm;
